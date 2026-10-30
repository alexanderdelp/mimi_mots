// Lernrunde (anforderungen.md §3.2): Kopfleiste, Avatar zeigt auf die Wortkarte,
// Lautsprecher zum Aufdecken und Vorlesen (Flagge daneben nur zur Anzeige), danach
// Selbsteinschätzung; oben rechts das Timer-Zifferblatt. In der allerersten Runde erklärt
// Mimi vorher an einem Probewort die drei Buttons (Tutorial, B-74).
import { createAudioPlayer } from '../audio';
import { createAppHeader } from '../components/app-header';
import { createAvatar, type Pose } from '../components/avatar';
import { fitText } from '../components/fit-text';
import { roundButton } from '../components/icons';
import { onLongPress } from '../components/long-press';
import { createTimerDial } from '../components/timer-dial';
import { LANGUAGE_INFO, flagUrl } from '../data/languages';
import { WORDS, getWord, type Language, type Word } from '../data/words';
import { pickNext, type Rating } from '../scheduler';
import type { AppState, Store } from '../state';
import { createSessionTimer } from '../timer';
import type { ViewHandle } from './view';

const WORD_IDS = WORDS.map((w) => w.id);
/** Ein Player für alle Runden: auf iOS bleibt das Audio-Element nach dem ersten Tipp freigeschaltet. */
const player = createAudioPlayer();
const FOREIGN_MAX_PX = 56;
const FOREIGN_MIN_PX = 28;
/** Unter dieser Größe wird ein zu langes Wort lieber getrennt als weiter verkleinert. */
const FOREIGN_BREAK_BELOW_PX = 36;

/** Tutorial (B-74): Probewort und die Schritte. Ohne Ziel geht es mit einem Tipp irgendwohin
 *  weiter; mit Ziel nur über den eingekreisten Button. */
export const TUTORIAL_WORD = 'apfel';
export const TUTORIAL_STEPS: readonly { target: string | null; text: string }[] = [
  { target: null, text: 'Schön, dass du da bist!' },
  { target: null, text: 'Ich erkläre dir, was du hier machst.' },
  { target: 'speaker', text: 'Tippe hier – so klingt das Wort.' },
  { target: 'known', text: 'Wusstest du es? Dann tippe hier.' },
  { target: 'practice', text: 'Noch nicht? Dann tippe hier.' },
  { target: null, text: 'Und jetzt viel Erfolg – los geht’s!' },
];

/** Von Hand eingekreist: leicht unregelmäßige Schleife, die über den Anfang hinausläuft. */
const PEN_CIRCLE =
  'M34 12 C60 0 92 10 96 42 C100 74 74 98 44 94 C16 90 0 66 6 40 C11 20 30 6 58 6 C72 6 84 12 90 22';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

/** Wählt das nächste Wort mit dem Scheduler und meldet es dem Store. */
export function showNextWord(store: Store, rng?: () => number): void {
  const { round, data } = store.getState();
  const language = data.settings.language;
  if (!round || !language) return;
  const next = pickNext(WORD_IDS, data.progress[language], round.session, rng, round.knownOnly);
  store.dispatch({ type: 'word', id: next.id, session: next.session });
}

export function renderRound(store: Store): ViewHandle {
  const { settings } = store.getState().data;
  const language: Language = settings.language ?? 'en';

  const view = el('main', 'view view--round');
  view.dataset.view = 'round';

  // In der Kopfleiste: [×] links, Timer rechts
  const close = el('button', 'close-button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Beenden');
  close.textContent = '×';
  // Fortschrittsring: füllt sich während des Haltens (Ausnahme von der 200-ms-Regel, §11)
  close.insertAdjacentHTML(
    'beforeend',
    '<svg class="close-button__ring" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle cx="50" cy="50" r="46" pathLength="100" /></svg>',
  );
  // gedrückt halten (600 ms), damit ein versehentlicher Tipp die Runde nicht beendet
  const stopLongPress = onLongPress(close, () => store.dispatch({ type: 'finish' }));
  const timerSlot = el('div', 'round__timer');
  const dial = createTimerDial();
  timerSlot.append(dial.el);

  // Avatar links unten, damit die Zeigegeste nach rechts zu den Karten geht; nur Bildtausch.
  // Im Tutorial erklärt immer Mimi, danach übernimmt der gewählte Begleiter.
  let tutorialStep = store.getState().data.tutorialDone ? -1 : 0;
  const avatarSlot = el('div', 'round__avatar');
  let avatar = createAvatar(tutorialStep >= 0 ? 'mimi' : (settings.companion ?? 'mimi'), 'zeigt');
  const bubble = el('p', 'tutorial-bubble');
  bubble.setAttribute('role', 'status');
  bubble.hidden = true;
  avatarSlot.append(bubble, avatar.el);

  // Zwei gleich große Karten: links das deutsche Wort, rechts Flagge, Fremdwort, Lautsprecher
  const card = el('section', 'round-card word-card');
  const emoji = el('div', 'word-card__emoji');
  emoji.setAttribute('role', 'img');
  const german = el('p', 'word-card__de');
  card.append(emoji, german);

  const answer = el('section', 'round-card round__answer');
  const flag = el('img', 'round__flag');
  flag.src = flagUrl(language);
  flag.alt = LANGUAGE_INFO[language].name;
  flag.draggable = false;
  const speaker = roundButton(
    `Auf ${LANGUAGE_INFO[language].name} anhören`,
    'speaker',
    'speak-button',
  );
  const foreign = el('p', 'round__foreign'); // bleibt leer bis zum Aufdecken
  foreign.lang = language;
  answer.append(flag, foreign, speaker);

  // Tipp auf den Lautsprecher: aufdecken und (erneut, von vorn) vorlesen
  speaker.addEventListener('click', () => {
    if (tutorialStep >= 0) return tutorialTap('speaker');
    const id = store.getState().round?.wordId;
    const word = id ? getWord(id) : undefined;
    if (!word) return;
    store.dispatch({ type: 'reveal' });
    player.play(word, language);
  });

  const cards = el('div', 'round__cards');
  cards.append(card, answer);

  // Selbsteinschätzung: zwei gleichwertige runde Buttons nur mit Symbol, erst nach dem
  // Aufdecken sichtbar. Kein Feedback – der Tipp speichert und holt das nächste Wort.
  const rating = el('div', 'round__rating');
  const rateButton = (value: Rating, name: 'thumbsUp' | 'repeat', label: string) => {
    const button = roundButton(label, name, 'rating-button');
    button.dataset.rating = value;
    button.addEventListener('click', () => {
      if (tutorialStep >= 0) return tutorialTap(value);
      if (!store.getState().round?.revealed) return;
      player.stop();
      store.dispatch({ type: 'rate', rating: value, at: new Date().toISOString() });
      // nach Ablauf der Zeit hat der Store schon zum Abschluss gewechselt
      if (store.getState().view === 'round') showNextWord(store);
    });
    return button;
  };
  rating.append(
    rateButton('known', 'thumbsUp', 'Wusste ich'),
    rateButton('practice', 'repeat', 'Noch üben'),
  );

  const body = el('div', 'round__body');
  body.append(avatarSlot, cards, rating);
  view.append(createAppHeader({ start: close, end: timerSlot }), body);

  const showWord = (state: AppState) => {
    const word = state.round?.wordId ? getWord(state.round.wordId) : undefined;
    if (!word) return;
    renderWord(word);
    showForeign(state);
  };

  const renderWord = (word: Word) => {
    card.dataset.wordId = word.id;
    // dezentes Einblenden (≤ 200 ms) als Übergang zum nächsten Wort
    card.classList.remove('word-card--enter');
    void card.offsetWidth;
    card.classList.add('word-card--enter');
    emoji.textContent = word.emoji;
    emoji.setAttribute('aria-label', word.de);
    // Silbenmethode (B-66): jede zweite Silbe in einer zweiten Farbe, ohne Trennzeichen
    german.replaceChildren(
      ...word.syllables.map((syllable, i) => {
        const span = el('span', `word-card__syllable word-card__syllable--${i % 2 ? 'b' : 'a'}`);
        span.textContent = syllable;
        return span;
      }),
    );
  };

  const showForeign = (state: AppState) => {
    const word = state.round?.wordId ? getWord(state.round.wordId) : undefined;
    renderForeign(word, !!word && !!state.round?.revealed);
  };

  const renderForeign = (word: Word | undefined, revealed: boolean) => {
    view.dataset.revealed = String(revealed);
    // neues Wort: zeigt auf die Aufgabe; aufgedeckt: freut sich, „spricht mit“
    const pose: Pose = revealed ? 'freut' : 'zeigt';
    if (avatar.pose !== pose) avatar.setPose(pose);
    foreign.textContent = revealed && word ? word[language] : '';
    if (revealed) fitText(foreign, FOREIGN_MAX_PX, FOREIGN_MIN_PX, FOREIGN_BREAK_BELOW_PX);
  };

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.portrait !== previous.portrait) {
      if (state.portrait) timer.pause('portrait');
      else timer.resume('portrait');
    }
    if (state.round?.wordId !== previous.round?.wordId) showWord(state);
    else if (state.round?.revealed !== previous.round?.revealed) showForeign(state);
  });

  // Aussprache der Sprache vorladen (je ~9 KB); fehlende Dateien merkt sich der Player
  void player.preload(language, WORD_IDS);

  // Session-Timer: läuft ab dem ersten Wort, pausiert im Hintergrund und im Hochformat.
  // Der Ablauf ändert an der Runde nichts Sichtbares (§3.4); Abschluss erst nach Bewertung (B-42).
  view.dataset.expired = 'false';
  const durationMs = (settings.durationMin ?? 3) * 60_000;
  const timer = createSessionTimer({
    durationMs,
    onTick: (remaining) => dial.setFraction(remaining / durationMs),
    onExpire: () => {
      view.dataset.expired = 'true';
      store.dispatch({ type: 'expire' });
    },
  });
  const onVisibility = () =>
    document.visibilityState === 'hidden' ? timer.pause('hidden') : timer.resume('hidden');
  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();
  if (store.getState().portrait) timer.pause('portrait');

  // Tutorial (B-74): nur der eingekreiste Button reagiert; das Probewort zählt nicht
  const targets = { speaker, known: rating.children[0], practice: rating.children[1] } as Record<
    string,
    Element
  >;
  const mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mark.setAttribute('class', 'tutorial-mark');
  mark.setAttribute('viewBox', '0 0 100 100');
  mark.setAttribute('preserveAspectRatio', 'none');
  mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML = `<path d="${PEN_CIRCLE}" />`;
  const showTutorialStep = () => {
    const step = TUTORIAL_STEPS[tutorialStep];
    view.dataset.tutorial = String(tutorialStep + 1);
    bubble.textContent = step.text;
    bubble.hidden = false;
    for (const [name, node] of Object.entries(targets)) {
      node.classList.toggle('tutorial-target', name === step.target);
    }
    if (step.target) targets[step.target].append(mark);
    else mark.remove();
  };
  const nextTutorialStep = () => {
    tutorialStep++;
    if (tutorialStep < TUTORIAL_STEPS.length) return showTutorialStep();
    finishTutorial();
  };
  const tutorialTap = (name: string) => {
    if (TUTORIAL_STEPS[tutorialStep].target !== name) return;
    const probe = getWord(TUTORIAL_WORD)!;
    if (name === 'speaker') {
      renderForeign(probe, true);
      player.play(probe, language);
    } else {
      player.stop();
    }
    nextTutorialStep();
  };
  // Sprechblasen ohne Ziel: ein Tipp irgendwohin geht weiter (vor den Buttons abgefangen)
  const onTutorialTap = (event: Event) => {
    if (tutorialStep < 0 || TUTORIAL_STEPS[tutorialStep].target) return;
    event.stopPropagation();
    event.preventDefault();
    nextTutorialStep();
  };
  view.addEventListener('click', onTutorialTap, true);
  const finishTutorial = () => {
    // geschafft: Begleiter übernimmt, erstes echtes Wort, jetzt läuft die Uhr
    tutorialStep = -1;
    view.removeEventListener('click', onTutorialTap, true);
    delete view.dataset.tutorial;
    bubble.hidden = true;
    mark.remove();
    Object.values(targets).forEach((node) => node.classList.remove('tutorial-target'));
    avatar = createAvatar(settings.companion ?? 'mimi', 'zeigt');
    avatarSlot.replaceChildren(bubble, avatar.el);
    store.dispatch({ type: 'tutorialDone' });
    showNextWord(store);
    timer.start();
  };

  if (tutorialStep >= 0) {
    renderWord(getWord(TUTORIAL_WORD)!);
    renderForeign(undefined, false);
    showTutorialStep();
  } else {
    if (store.getState().round?.wordId) showWord(store.getState());
    else showNextWord(store);
    timer.start(); // mit dem ersten angezeigten Wort
  }

  return {
    el: view,
    dispose() {
      unsubscribe();
      timer.dispose();
      document.removeEventListener('visibilitychange', onVisibility);
      stopLongPress();
      player.stop();
    },
  };
}
