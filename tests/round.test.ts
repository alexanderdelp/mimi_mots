import { describe, expect, it } from 'vitest';
import { WORDS, getWord } from '../src/data/words';
import { seededRng } from '../src/scheduler';
import { defaults } from '../src/storage';
import { createStore } from '../src/state';
import { renderRound, showNextWord } from '../src/views/round';

function roundStore(language: 'en' | 'fr' = 'en') {
  const data = defaults();
  data.settings = { companion: 'mimi', language, durationMin: 5 };
  const store = createStore(data);
  store.dispatch({ type: 'play' });
  return store;
}

describe('showNextWord', () => {
  it('wählt ein Wort aus der Liste und merkt es in der Session', () => {
    const store = roundStore();
    showNextWord(store, seededRng(1));
    const { round } = store.getState();
    expect(getWord(round!.wordId!)).toBeDefined();
    expect(round!.session.history).toEqual([round!.wordId]);
  });

  it('nutzt den Lernstand der gewählten Sprache (erste 6 sind neu)', () => {
    const store = roundStore('fr');
    for (let i = 0; i < 6; i++) showNextWord(store, seededRng(i + 1));
    expect(store.getState().round!.session.introduced.length).toBeGreaterThan(0);
  });

  it('macht außerhalb der Lernrunde nichts', () => {
    const store = createStore(defaults());
    const before = store.getState();
    showNextWord(store);
    expect(store.getState()).toBe(before);
  });
});

describe('renderRound', () => {
  it('zeigt sofort ein Wort: Emoji und deutsches Wort passen zusammen', () => {
    const store = roundStore();
    const { el } = renderRound(store);
    const card = el.querySelector<HTMLElement>('.word-card')!;
    const word = getWord(card.dataset.wordId!)!;
    expect(card.querySelector('.word-card__emoji')!.textContent).toBe(word.emoji);
    expect(card.querySelector('.word-card__de')!.textContent).toBe(word.de);
  });

  it('enthält das Fremdwort nicht', () => {
    const store = roundStore('fr');
    const { el } = renderRound(store);
    const word = getWord(el.querySelector<HTMLElement>('.word-card')!.dataset.wordId!)!;
    expect(el.textContent).not.toContain(word.fr);
    expect(el.querySelector('.round__foreign')!.textContent).toBe('');
  });

  it('Flaggen-Button passt zur Sprache', () => {
    const { el } = renderRound(roundStore('fr'));
    const flag = el.querySelector('.flag-button')!;
    expect(flag.getAttribute('aria-label')).toBe('Auf Französisch');
    expect(flag.querySelector('img')!.getAttribute('src')).toMatch(/flag_fr\.png$/);
  });

  it('aktualisiert die Karte beim nächsten Wort und meldet sich mit dispose ab', () => {
    const store = roundStore();
    const { el, dispose } = renderRound(store);
    const card = el.querySelector<HTMLElement>('.word-card')!;
    const other = WORDS.find((w) => w.id !== card.dataset.wordId)!;
    store.dispatch({ type: 'word', id: other.id, session: store.getState().round!.session });
    expect(card.dataset.wordId).toBe(other.id);
    dispose!();
    const third = WORDS.find((w) => w.id !== other.id)!;
    store.dispatch({ type: 'word', id: third.id, session: store.getState().round!.session });
    expect(card.dataset.wordId).toBe(other.id);
  });

  it('übernimmt ein bereits gewähltes Wort, statt ein neues zu ziehen', () => {
    const store = roundStore();
    store.dispatch({ type: 'word', id: 'hund', session: { history: ['hund'], introduced: [] } });
    const { el } = renderRound(store);
    expect(el.querySelector<HTMLElement>('.word-card')!.dataset.wordId).toBe('hund');
    expect(store.getState().round!.session.history).toEqual(['hund']);
  });
});
