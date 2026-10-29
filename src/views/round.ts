// Lernrunde (anforderungen.md §3.2): Wortkarte, Flagge zum Aufdecken und Vorlesen,
// danach Selbsteinschätzung. Freigehaltener Platz für Avatar (B-24) und Timer (B-41).
import { speak, stopSpeaking } from '../audio';
import { fitText } from '../components/fit-text';
import { LANGUAGE_INFO, flagUrl } from '../data/languages';
import { WORDS, getWord, type Language } from '../data/words';
import { pickNext, type Rating } from '../scheduler';
import type { AppState, Store } from '../state';
import type { ViewHandle } from './view';

const WORD_IDS = WORDS.map((w) => w.id);
const FOREIGN_MAX_PX = 56;
const FOREIGN_MIN_PX = 28;

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
  const language: Language = store.getState().data.settings.language ?? 'en';

  const view = el('main', 'view view--round');
  view.dataset.view = 'round';

  // Kopfzeile: [×] links, Platz für den Timer rechts
  const top = el('div', 'round__top');
  const close = el('button', 'close-button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Beenden');
  close.textContent = '×';
  close.addEventListener('click', () => store.dispatch({ type: 'finish' }));
  const timer = el('div', 'round__timer');
  top.append(close, timer);

  // Bühne: Avatar | Wortkarte | Flagge
  const stage = el('div', 'round__stage');
  const avatar = el('div', 'round__avatar');

  const card = el('section', 'word-card');
  const emoji = el('div', 'word-card__emoji');
  emoji.setAttribute('role', 'img');
  const german = el('p', 'word-card__de');
  card.append(emoji, german);

  const answer = el('div', 'round__answer');
  const flag = el('button', 'flag-button');
  flag.type = 'button';
  flag.setAttribute('aria-label', `Auf ${LANGUAGE_INFO[language].name}`);
  const flagImg = el('img', 'flag-button__img');
  flagImg.src = flagUrl(language);
  flagImg.alt = '';
  flagImg.draggable = false;
  flag.append(flagImg);
  const foreign = el('p', 'round__foreign'); // bleibt leer bis zum Aufdecken
  foreign.lang = language;
  answer.append(flag, foreign);

  // Tipp auf Flagge: aufdecken und (erneut, von vorn) vorlesen
  flag.addEventListener('click', () => {
    const id = store.getState().round?.wordId;
    const word = id ? getWord(id) : undefined;
    if (!word) return;
    store.dispatch({ type: 'reveal' });
    speak(word[language], language);
  });

  stage.append(avatar, card, answer);

  // Selbsteinschätzung: zwei gleichwertige Buttons, erst nach dem Aufdecken sichtbar.
  // Kein Feedback – der Tipp speichert den Lernstand und holt direkt das nächste Wort.
  const rating = el('div', 'round__rating');
  const rateButton = (value: Rating, icon: string, label: string) => {
    const button = el('button', 'rating-button');
    button.type = 'button';
    button.dataset.rating = value;
    const iconEl = el('span', 'rating-button__icon');
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;
    const labelEl = el('span', 'rating-button__label');
    labelEl.textContent = label;
    button.append(iconEl, labelEl);
    button.addEventListener('click', () => {
      if (!store.getState().round?.revealed) return;
      store.dispatch({ type: 'rate', rating: value, at: new Date().toISOString() });
      showNextWord(store);
    });
    return button;
  };
  rating.append(rateButton('known', '👍', 'Wusste ich'), rateButton('practice', '🔁', 'Noch üben'));

  view.append(top, stage, rating);

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
    foreign.textContent = revealed ? word[language] : '';
    if (revealed) fitText(foreign, FOREIGN_MAX_PX, FOREIGN_MIN_PX);
  };

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.round?.wordId !== previous.round?.wordId) showWord(state);
    else if (state.round?.revealed !== previous.round?.revealed) showForeign(state);
  });

  if (store.getState().round?.wordId) showWord(store.getState());
  else showNextWord(store);

  return {
    el: view,
    dispose() {
      unsubscribe();
      stopSpeaking();
    },
  };
}
