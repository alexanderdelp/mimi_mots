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
import { createTutorial, tutorialWord } from './tutorial';
import type { ViewHandle } from './view';

/** Ein Player für alle Runden: auf iOS bleibt das Audio-Element nach dem ersten Tipp freigeschaltet. */
const player = createAudioPlayer();
const FOREIGN_MAX_PX = 48;
const FOREIGN_MIN_PX = 28;
/** Unter dieser Größe wird ein zu langes Wort lieber getrennt als weiter verkleinert. */
const FOREIGN_BREAK_BELOW_PX = 36;

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
  const avatarSlot = el('div', 'round__avatar');
  const avatar = createAvatar(settings.companion ?? 'mimi', 'zeigt');

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
    if (tutorial.active()) return; // im Tutorial fängt es jeden Tipp ab
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
    if (tutorial.active()) return; // im Tutorial fängt es jeden Tipp ab
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
      if (tutorial.active()) return;
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

  // Tutorial (B-74/B-87/B-95): „Weiter“ geht weiter; das Probewort zählt nicht
  const tutorial = createTutorial({
    view,
    listen,
    avatar,
    targets: {
      card,
      answer,
      flag,
      speaker,
      reveal,
      known: rating.children[0],
      practice: rating.children[1],
      timer: timerSlot,
    },
    play: () => player.play(tutorialWord(words), language),
    stop: () => player.stop(),
    reveal: () => renderForeign(tutorialWord(words), true),
    onDone: () => {
      // geschafft: erstes echtes Wort, jetzt läuft die Uhr
      store.dispatch({ type: 'tutorialDone' });
      showNextWord(store);
      timer.start();
    },
  });
  avatarSlot.append(tutorial.bubble, avatar.el, timerSlot);

  // B-99: die Uhr hängt rechts unten am Begleiter (im avatarSlot) – oben rechts in der Kopfleiste
  // ist Platz für den Namen (wie auf allen Seiten)
  const body = el('div', 'round__body');
  body.append(avatarSlot, cards, rating);
  view.append(createAppHeader({ start: close, name: store.getState().data.name }), body);

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
    if (shown) {
      // B-99: so groß wie das deutsche Wort (gleiche Größe und Stärke); nur zu lange Fremdwörter
      // werden kleiner gesetzt
      const max = Math.round(parseFloat(getComputedStyle(german).fontSize)) || FOREIGN_MAX_PX;
      fitText(foreign, max, Math.min(FOREIGN_MIN_PX, max), Math.min(FOREIGN_BREAK_BELOW_PX, max));
    }
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

  if (!tutorialSeen(store.getState().data)) {
    renderWord(tutorialWord(words));
    renderForeign(listen ? tutorialWord(words) : undefined, false);
    tutorial.start();
  } else {
    if (store.getState().round?.wordId) showWord(store.getState());
    else showNextWord(store);
    timer.start(); // mit dem ersten angezeigten Wort
  }

  return {
    el: view,
    dispose() {
      unsubscribe();
      tutorial.dispose();
      timer.dispose();
      document.removeEventListener('visibilitychange', onVisibility);
      stopLongPress();
      player.stop();
    },
  };
}
