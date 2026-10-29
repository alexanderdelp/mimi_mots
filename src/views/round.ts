// Lernrunde (anforderungen.md §3.2): Kopfleiste, Avatar zeigt auf die Wortkarte,
// Lautsprecher zum Aufdecken und Vorlesen (Flagge daneben nur zur Anzeige), danach
// Selbsteinschätzung; oben rechts das Timer-Zifferblatt.
import { createAudioPlayer } from '../audio';
import { createAppHeader } from '../components/app-header';
import { createAvatar, type Pose } from '../components/avatar';
import { fitText } from '../components/fit-text';
import { roundButton } from '../components/icons';
import { onLongPress } from '../components/long-press';
import { createTimerDial } from '../components/timer-dial';
import { LANGUAGE_INFO, flagUrl } from '../data/languages';
import { WORDS, getWord, type Language } from '../data/words';
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
  const next = pickNext(WORD_IDS, data.progress[language], round.session, rng);
  store.dispatch({ type: 'word', id: next.id, session: next.session });
}

export function renderRound(store: Store): ViewHandle {
  const { settings } = store.getState().data;
  const language: Language = settings.language ?? 'en';

  const view = el('main', 'view view--round');
  view.dataset.view = 'round';

  // Unter der Kopfleiste: [×] links, Platz für den Timer rechts
  const top = el('div', 'round__top');
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
  top.append(close, timerSlot);

  // Bühne: Avatar | Wortkarte | Flagge + Lautsprecher
  const stage = el('div', 'round__stage');
  // Avatar links, damit die Zeigegeste nach rechts zur Karte geht; Posen nur per Bildtausch.
  const avatarSlot = el('div', 'round__avatar');
  const avatar = createAvatar(settings.companion ?? 'mimi', 'zeigt');
  avatarSlot.append(avatar.el);

  const card = el('section', 'word-card');
  const emoji = el('div', 'word-card__emoji');
  emoji.setAttribute('role', 'img');
  const german = el('p', 'word-card__de');
  card.append(emoji, german);

  const answer = el('div', 'round__answer');
  const speakRow = el('div', 'round__speak');
  const flag = el('img', 'round__flag');
  flag.src = flagUrl(language);
  flag.alt = LANGUAGE_INFO[language].name;
  flag.draggable = false;
  const speaker = roundButton(
    `Auf ${LANGUAGE_INFO[language].name} anhören`,
    'speaker',
    'speak-button',
  );
  speakRow.append(flag, speaker);
  const foreign = el('p', 'round__foreign'); // bleibt leer bis zum Aufdecken
  foreign.lang = language;
  answer.append(speakRow, foreign);

  // Tipp auf den Lautsprecher: aufdecken und (erneut, von vorn) vorlesen
  speaker.addEventListener('click', () => {
    const id = store.getState().round?.wordId;
    const word = id ? getWord(id) : undefined;
    if (!word) return;
    store.dispatch({ type: 'reveal' });
    player.play(word, language);
  });

  stage.append(avatarSlot, card, answer);

  // Selbsteinschätzung: zwei gleichwertige runde Buttons nur mit Symbol, erst nach dem
  // Aufdecken sichtbar. Kein Feedback – der Tipp speichert und holt das nächste Wort.
  const rating = el('div', 'round__rating');
  const rateButton = (value: Rating, name: 'thumbsUp' | 'repeat', label: string) => {
    const button = roundButton(label, name, 'rating-button');
    button.dataset.rating = value;
    button.addEventListener('click', () => {
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
  body.append(top, stage, rating);
  view.append(createAppHeader(), body);

  const showWord = (state: AppState) => {
    const word = state.round?.wordId ? getWord(state.round.wordId) : undefined;
    if (!word) return;
    card.dataset.wordId = word.id;
    // dezentes Einblenden (≤ 200 ms) als Übergang zum nächsten Wort
    card.classList.remove('word-card--enter');
    void card.offsetWidth;
    card.classList.add('word-card--enter');
    emoji.textContent = word.emoji;
    emoji.setAttribute('aria-label', word.de);
    german.textContent = word.de;
    showForeign(state);
  };

  const showForeign = (state: AppState) => {
    const word = state.round?.wordId ? getWord(state.round.wordId) : undefined;
    const revealed = !!word && !!state.round?.revealed;
    view.dataset.revealed = String(revealed);
    // neues Wort: zeigt auf die Aufgabe; aufgedeckt: freut sich, „spricht mit“
    const pose: Pose = revealed ? 'freut' : 'zeigt';
    if (avatar.pose !== pose) avatar.setPose(pose);
    foreign.textContent = revealed ? word[language] : '';
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
  const durationMs = (settings.durationMin ?? 5) * 60_000;
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

  if (store.getState().round?.wordId) showWord(store.getState());
  else showNextWord(store);
  timer.start(); // mit dem ersten angezeigten Wort

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
