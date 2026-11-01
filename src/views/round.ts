// Lernrunde (anforderungen.md §3.2): Kopfleiste, Avatar zeigt auf die Wortkarte,
// Lautsprecher zum Aufdecken und Vorlesen (Flagge daneben nur zur Anzeige), danach
// Selbsteinschätzung; oben rechts das Timer-Zifferblatt. In der allerersten Runde erklärt
// der Begleiter vorher an einem Probewort, was es hier gibt (Tutorial, B-74/B-87).
// Hörrunde (B-89): Fremdwort steht sofort da und wird abgespielt; Bild und deutsches Wort
// deckt das Kind mit dem Auge-Button auf. Eigenes Tutorial, eigener Lernstand.
import { createAudioPlayer } from '../audio';
import { createAppHeader } from '../components/app-header';
import { createAvatar, type Pose } from '../components/avatar';
import { fitText } from '../components/fit-text';
import { roundButton } from '../components/icons';
import { onLongPress } from '../components/long-press';
import { createTimerDial } from '../components/timer-dial';
import { LANGUAGE_INFO, flagUrl } from '../data/languages';
import { getWord, type Language, type Word } from '../data/words';
import { pickNext, type Rating } from '../scheduler';
import { activeWords, progressKey, tutorialSeen, type AppState, type Store } from '../state';
import { createSessionTimer } from '../timer';
import type { ViewHandle } from './view';

/** Ein Player für alle Runden: auf iOS bleibt das Audio-Element nach dem ersten Tipp freigeschaltet. */
const player = createAudioPlayer();
const FOREIGN_MAX_PX = 56;
const FOREIGN_MIN_PX = 28;
/** Unter dieser Größe wird ein zu langes Wort lieber getrennt als weiter verkleinert. */
const FOREIGN_BREAK_BELOW_PX = 36;

/** Tutorial (B-74/B-87): Probewort und die Schritte. Nur „Weiter“ geht weiter (B-95). */
export const TUTORIAL_WORD = 'apfel';

/** Probewort: Apfel, oder das erste Wort, wenn Apfel fehlt (B-84) oder ausgeschaltet ist (B-88). */
export function tutorialWord(words: readonly Word[]): Word {
  return words.find((w) => w.id === TUTORIAL_WORD) ?? words[0];
}

export type TutorialTarget =
  'card' | 'answer' | 'flag' | 'speaker' | 'reveal' | 'known' | 'practice' | 'timer';

/** Unscharf (B-87): alles außer Kopfleiste und Begleiter, oder nur die Übersetzungskarte (samt
 *  Bewertung), in der Hörrunde (B-89) nur die Bildkarte (samt Bewertung). Die Kopfleiste bleibt
 *  immer scharf. */
export type TutorialBlur = 'all' | 'answer' | 'word';

export interface TutorialStep {
  text: string;
  pose: Pose;
  /** Eingekreistes Element; null = keins. */
  target: TutorialTarget | null;
  blur?: TutorialBlur;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { text: 'Hallo! Schön, dass du da bist!', pose: 'winkt', target: null, blur: 'all' },
  {
    text: 'Lass uns mal sehen, was du hier machen kannst.',
    pose: 'freut',
    target: null,
    blur: 'all',
  },
  { text: 'Hier ist das Wort zum Übersetzen.', pose: 'zeigt', target: 'card', blur: 'answer' },
  { text: 'Sprich das übersetzte Wort laut aus.', pose: 'zeigt', target: 'flag' },
  { text: 'Tippe hier, um es anzuhören.', pose: 'zeigt', target: 'speaker' },
  { text: 'Hast du es gewusst? Dann tippe hier.', pose: 'ruhig', target: 'known' },
  { text: 'Wusstest du es noch nicht? Dann tippe hier.', pose: 'ruhig', target: 'practice' },
  { text: 'Das Wort kommt dann später wieder.', pose: 'ruhig', target: 'practice' },
  {
    text: 'Nach einiger Zeit werde ich müde und möchte mich hinlegen.',
    pose: 'zeigt',
    target: 'timer',
    blur: 'all',
  },
  { text: 'Los geht’s!', pose: 'winkt', target: null, blur: 'all' },
];

/** B-89: Tutorial der Hörrunde – gleicher Aufbau, eigene Schritte. */
export const LISTEN_TUTORIAL_STEPS: readonly TutorialStep[] = [
  { text: 'Hallo! Jetzt spitzen wir die Ohren.', pose: 'winkt', target: null, blur: 'all' },
  {
    text: 'Lass uns mal sehen, wie das Zuhören geht.',
    pose: 'freut',
    target: null,
    blur: 'all',
  },
  { text: 'Hör gut zu: Hier ist das Wort.', pose: 'zeigt', target: 'answer', blur: 'word' },
  { text: 'Tippe hier, um es noch mal zu hören.', pose: 'zeigt', target: 'speaker', blur: 'word' },
  { text: 'Was bedeutet es? Tippe hier, dann siehst du es.', pose: 'zeigt', target: 'reveal' },
  { text: 'Hast du es gewusst? Dann tippe hier.', pose: 'ruhig', target: 'known' },
  { text: 'Wusstest du es noch nicht? Dann tippe hier.', pose: 'ruhig', target: 'practice' },
  { text: 'Das Wort kommt dann später wieder.', pose: 'ruhig', target: 'practice' },
  {
    text: 'Nach einiger Zeit werde ich müde und möchte mich hinlegen.',
    pose: 'zeigt',
    target: 'timer',
    blur: 'all',
  },
  { text: 'Los geht’s!', pose: 'winkt', target: null, blur: 'all' },
];

/**
 * Von Hand eingekreist (B-87): eine leicht unregelmäßige Schleife mit gut einer Umdrehung, die
 * oben links beginnt und über den Anfang hinausläuft – in Pixeln für eine Box w × h berechnet,
 * damit der Strich überall gleich dick ist und die Zeichen-Animation den ganzen Weg geht.
 */
export function penLoop(w: number, h: number): string {
  const steps = 72;
  const turns = 1.25;
  const start = -2.5; // oben links
  const rx = (w / 2 - 3) / 1.05;
  const ry = (h / 2 - 3) / 1.05;
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const t = start + (i / steps) * turns * 2 * Math.PI;
    // leichtes Wackeln und ein wenig nach innen, damit sich der Strich am Ende nicht deckt
    const wobble = 1 + 0.035 * Math.sin(2.3 * t + 0.5) - 0.05 * (i / steps);
    const x = w / 2 + rx * wobble * Math.cos(t);
    const y = h / 2 + ry * wobble * Math.sin(t);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `M${points.join(' L')}`;
}

/** Abstand des Kreises um das Ziel – um die Uhr am Rand der Kopfleiste enger. */
function markPadding(target: TutorialTarget, height: number): [number, number] {
  if (target === 'timer') return [height * 0.16, height * 0.08];
  return [Math.min(44, height * 0.45), Math.min(16, height * 0.18)];
}

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
  // nur Wörter mit gewählter Aufnahme (B-84), ohne ausgeschaltete (B-88)
  const ids = activeWords(data, language).map((w) => w.id);
  const progress = data[progressKey(data.settings.mode ?? 'speak')][language]; // B-89: je Modus
  const next = pickNext(ids, progress, round.session, rng, data.brakeNew);
  store.dispatch({ type: 'word', id: next.id, session: next.session });
}

export function renderRound(store: Store): ViewHandle {
  const { settings } = store.getState().data;
  const language: Language = settings.language ?? 'en';
  const words = activeWords(store.getState().data, language); // B-88: ohne ausgeschaltete
  const listen = settings.mode === 'listen'; // B-89: Hörrunde

  const view = el('main', 'view view--round');
  view.dataset.view = 'round';
  view.dataset.mode = listen ? 'listen' : 'speak';

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
  // Das Tutorial erklärt der gewählte Begleiter selbst (B-87) – er legt sich später auch hin.
  let tutorialStep = tutorialSeen(store.getState().data) ? -1 : 0;
  const steps = listen ? LISTEN_TUTORIAL_STEPS : TUTORIAL_STEPS;
  /** Die Uhr erscheint erst, wenn sie erklärt wird (B-87). */
  const timerStep = steps.findIndex((step) => step.target === 'timer');
  const avatarSlot = el('div', 'round__avatar');
  const avatar = createAvatar(settings.companion ?? 'mimi', 'zeigt');
  // Sprechblase mit Text und „Weiter“-Button (B-95): nur er schaltet die Schritte weiter
  const bubble = el('div', 'tutorial-bubble');
  bubble.hidden = true;
  const bubbleText = el('p', 'tutorial-bubble__text');
  bubbleText.setAttribute('role', 'status');
  const next = roundButton('Weiter', 'next', 'tutorial-next');
  bubble.append(bubbleText, next);
  avatarSlot.append(bubble, avatar.el);

  // Zwei gleich große Karten: links das deutsche Wort, rechts Flagge, Fremdwort, Lautsprecher.
  // Hörrunde (B-89): umgekehrt – erst das Fremdwort, rechts Bild und deutsches Wort, die das
  // Kind mit dem Auge-Button aufdeckt.
  const card = el('section', 'round-card word-card');
  const emoji = el('div', 'word-card__emoji');
  emoji.setAttribute('role', 'img');
  const german = el('p', 'word-card__de');
  card.append(emoji, german);
  const reveal = roundButton('Zeig mir das deutsche Wort', 'eye', 'reveal-button');
  if (listen) card.append(reveal);
  reveal.addEventListener('click', () => {
    if (tutorialStep >= 0) return; // im Tutorial fängt onTutorialTap jeden Tipp ab
    if (store.getState().round?.wordId) store.dispatch({ type: 'reveal' });
  });

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

  // Tipp auf den Lautsprecher: aufdecken (nur Sprechrunde) und (erneut, von vorn) vorlesen
  speaker.addEventListener('click', () => {
    if (tutorialStep >= 0) return; // im Tutorial fängt onTutorialTap jeden Tipp ab
    const id = store.getState().round?.wordId;
    const word = id ? getWord(id) : undefined;
    if (!word) return;
    if (!listen) store.dispatch({ type: 'reveal' });
    player.play(word, language);
  });

  const cards = el('div', 'round__cards');
  if (listen) cards.append(answer, card);
  else cards.append(card, answer);

  // Selbsteinschätzung: zwei gleichwertige runde Buttons nur mit Symbol, erst nach dem
  // Aufdecken sichtbar. Kein Feedback – der Tipp speichert und holt das nächste Wort.
  const rating = el('div', 'round__rating');
  const rateButton = (value: Rating, name: 'thumbsUp' | 'repeat', label: string) => {
    const button = roundButton(label, name, 'rating-button');
    button.dataset.rating = value;
    button.addEventListener('click', () => {
      if (tutorialStep >= 0) return;
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
  view.append(
    createAppHeader({ start: close, end: timerSlot, name: store.getState().data.name }),
    body,
  );

  // Hörrunde: jedes neue Wort einmal abspielen (der Tipp davor war eine Nutzer-Geste). Gezählt
  // wird am Verlauf der Session – der Store meldet dasselbe Wort beim Start sonst zweimal.
  let played = 0;
  const showWord = (state: AppState) => {
    const word = state.round?.wordId ? getWord(state.round.wordId) : undefined;
    if (!word) return;
    renderWord(word);
    showForeign(state);
    const shown = state.round!.session.history.length;
    if (listen && shown > played) {
      played = shown;
      player.play(word, language);
    }
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
    // Hörrunde: das Fremdwort steht sofort da, aufgedeckt wird die Bildkarte (per CSS)
    const shown = (revealed || listen) && word;
    foreign.textContent = shown ? word[language] : '';
    if (shown) fitText(foreign, FOREIGN_MAX_PX, FOREIGN_MIN_PX, FOREIGN_BREAK_BELOW_PX);
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
  void player.preload(
    language,
    words.map((w) => w.id),
  );

  // Session-Timer: läuft ab dem ersten Wort, pausiert im Hintergrund und im Hochformat.
  // Der Ablauf ändert an der Runde nichts Sichtbares (§3.4); Abschluss erst nach Bewertung (B-42).
  view.dataset.expired = 'false';
  const durationMs = store.getState().data.roundMin * 60_000; // B-93: im Elternbereich eingestellt
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

  // Tutorial (B-74/B-87/B-95): „Weiter“ geht weiter; das Probewort zählt nicht
  const targets: Record<TutorialTarget, Element> = {
    card,
    answer,
    flag,
    speaker,
    reveal,
    known: rating.children[0],
    practice: rating.children[1],
    timer: timerSlot,
  };
  // Der Kreis liegt in einer eigenen Ebene über der Ansicht (auch um Bilder wie die Flagge)
  // und bleibt immer ganz im Bild.
  const mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mark.setAttribute('class', 'tutorial-mark');
  mark.setAttribute('aria-hidden', 'true');
  const markPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  markPath.setAttribute('pathLength', '100');
  mark.append(markPath);
  let marked: TutorialTarget | null = null;
  const placeMark = () => {
    if (!marked) return;
    const box = targets[marked].getBoundingClientRect();
    const frame = view.getBoundingClientRect();
    const [padX, padY] = markPadding(marked, box.height);
    const left = Math.max(2, box.left - frame.left - padX);
    const top = Math.max(2, box.top - frame.top - padY);
    const right = Math.min(frame.width - 2, box.right - frame.left + padX);
    const bottom = Math.min(frame.height - 2, box.bottom - frame.top + padY);
    const [w, h] = [Math.max(right - left, 1), Math.max(bottom - top, 1)];
    Object.assign(mark.style, { left: `${left}px`, top: `${top}px` });
    mark.setAttribute('width', String(w));
    mark.setAttribute('height', String(h));
    mark.setAttribute('viewBox', `0 0 ${w} ${h}`);
    markPath.setAttribute('d', penLoop(w, h));
  };
  window.addEventListener('resize', placeMark);
  const showTutorialStep = () => {
    const step = steps[tutorialStep];
    const previous = steps[tutorialStep - 1];
    view.dataset.tutorial = String(tutorialStep + 1);
    view.dataset.tutorialBlur = step.blur ?? 'none';
    view.dataset.tutorialTimer = String(tutorialStep >= timerStep);
    bubbleText.textContent = step.text;
    bubble.hidden = false;
    // nach dem Lautsprecher (Hörrunde: dem Auge) ist das Probewort aufgedeckt, damit die
    // Bewertung Sinn ergibt
    if (previous?.target === (listen ? 'reveal' : 'speaker')) {
      renderForeign(tutorialWord(words), true);
    }
    // Hörrunde: beim Zeigen auf das Wort wird es einmal abgespielt
    if (listen && step.target === 'answer' && previous?.target !== 'answer') {
      player.play(tutorialWord(words), language);
    }
    if (avatar.pose !== step.pose) avatar.setPose(step.pose);
    for (const [name, node] of Object.entries(targets)) {
      node.classList.toggle('tutorial-target', name === step.target);
    }
    if (!step.target) {
      marked = null;
      return mark.remove();
    }
    // gleiches Ziel wie zuvor: Kreis bleibt stehen; neues Ziel: wird neu gezogen
    if (marked !== step.target) {
      marked = step.target;
      view.append(mark);
      placeMark();
      mark.classList.remove('tutorial-mark--draw');
      void mark.getBoundingClientRect();
      mark.classList.add('tutorial-mark--draw');
    }
  };
  const nextTutorialStep = () => {
    tutorialStep++;
    if (tutorialStep < steps.length) return showTutorialStep();
    finishTutorial();
  };
  // Jeder Tipp wird vor den Buttons abgefangen, damit sie im Tutorial nichts tun (B-95). Nur
  // „Weiter“ geht weiter; der Lautsprecher spielt in seinem Schritt das Probewort ab.
  const onTutorialTap = (event: Event) => {
    if (tutorialStep < 0) return;
    event.stopPropagation();
    event.preventDefault();
    const tapped = event.target as Node;
    if (next.contains(tapped)) {
      player.stop();
      nextTutorialStep();
    } else if (steps[tutorialStep].target === 'speaker' && speaker.contains(tapped)) {
      player.play(tutorialWord(words), language);
    }
  };
  view.addEventListener('click', onTutorialTap, true);
  const finishTutorial = () => {
    // geschafft: erstes echtes Wort, jetzt läuft die Uhr
    tutorialStep = -1;
    view.removeEventListener('click', onTutorialTap, true);
    delete view.dataset.tutorial;
    delete view.dataset.tutorialBlur;
    delete view.dataset.tutorialTimer;
    bubble.hidden = true;
    marked = null;
    mark.remove();
    window.removeEventListener('resize', placeMark);
    Object.values(targets).forEach((node) => node.classList.remove('tutorial-target'));
    avatar.setPose('zeigt');
    store.dispatch({ type: 'tutorialDone' });
    showNextWord(store);
    timer.start();
  };

  if (tutorialStep >= 0) {
    renderWord(tutorialWord(words));
    renderForeign(listen ? tutorialWord(words) : undefined, false);
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
      window.removeEventListener('resize', placeMark);
      timer.dispose();
      document.removeEventListener('visibilitychange', onVisibility);
      stopLongPress();
      player.stop();
    },
  };
}
