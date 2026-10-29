import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORDS, getWord } from '../src/data/words';
import { seededRng } from '../src/scheduler';
import { defaults } from '../src/storage';
import { createStore } from '../src/state';
import { renderRound, showNextWord } from '../src/views/round';

// Vorladen der Audiodateien: in jsdom gibt es keinen Server – alle Dateien gelten als vorhanden.
// (Der Player ist modulweit geteilt; ohne das würden frühe Tests Dateien als fehlend markieren.)
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true })),
  );
});

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
    const speaker = el.querySelector('.speak-button')!;
    expect(speaker.getAttribute('aria-label')).toBe('Auf Französisch anhören');
    expect(el.querySelector('.round__flag')!.getAttribute('src')).toMatch(/flag_fr\.svg$/);
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

describe('Aufdecken in der Lernrunde (B-22, seit B-31 mit MP3)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Attrappen für Sprachausgabe, Audio-Wiedergabe und Vorladen (jsdom kann kein Audio). */
  function withSpeech() {
    const synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] };
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        lang = '';
        constructor(public text: string) {}
      },
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true })),
    );
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      return Promise.resolve();
    });
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    return { ...synth, play, pause };
  }

  it('Tipp auf den Lautsprecher zeigt das Fremdwort und spielt die MP3', () => {
    const media = withSpeech();
    const store = roundStore('fr');
    const { el } = renderRound(store);
    const word = getWord(el.querySelector<HTMLElement>('.word-card')!.dataset.wordId!)!;
    el.querySelector<HTMLButtonElement>('.speak-button')!.click();
    expect(el.querySelector('.round__foreign')!.textContent).toBe(word.fr);
    expect(el.querySelector('.round__foreign')!.getAttribute('lang')).toBe('fr');
    expect(media.play).toHaveBeenCalledTimes(1);
    expect((media.play.mock.instances[0] as HTMLAudioElement).src).toMatch(
      new RegExp(`/audio/fr/${word.id}\\.mp3$`),
    );
    expect(media.speak).not.toHaveBeenCalled();
  });

  it('erneuter Tipp spielt erneut von vorn', () => {
    const media = withSpeech();
    const { el } = renderRound(roundStore('fr'));
    const speaker = el.querySelector<HTMLButtonElement>('.speak-button')!;
    speaker.click();
    speaker.click();
    speaker.click();
    expect(media.play).toHaveBeenCalledTimes(3);
    expect(media.pause).toHaveBeenCalledTimes(3);
  });

  it('Englisch liest mit der Gerätestimme vor, ohne MP3', () => {
    const media = withSpeech();
    const { el } = renderRound(roundStore('en'));
    const word = getWord(el.querySelector<HTMLElement>('.word-card')!.dataset.wordId!)!;
    el.querySelector<HTMLButtonElement>('.speak-button')!.click();
    expect(media.play).not.toHaveBeenCalled();
    expect(media.speak).toHaveBeenCalledTimes(1);
    expect(media.speak.mock.calls[0][0].text).toBe(word.en);
  });

  it('neues Wort verdeckt das Fremdwort wieder', () => {
    withSpeech();
    const store = roundStore('en');
    const { el } = renderRound(store);
    el.querySelector<HTMLButtonElement>('.speak-button')!.click();
    store.dispatch({ type: 'word', id: 'hund', session: store.getState().round!.session });
    expect(el.querySelector('.round__foreign')!.textContent).toBe('');
    expect(el.dataset.revealed).toBe('false');
  });

  it('dispose beendet eine laufende Wiedergabe', () => {
    const media = withSpeech();
    const { el, dispose } = renderRound(roundStore('fr'));
    el.querySelector<HTMLButtonElement>('.speak-button')!.click();
    media.pause.mockClear();
    dispose!();
    expect(media.pause).toHaveBeenCalled();
    expect(media.cancel).toHaveBeenCalled();
  });
});

describe('Selbsteinschätzung in der Lernrunde (B-23)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const setup = () => {
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class {});
    const store = roundStore('en');
    const { el } = renderRound(store);
    const q = <T extends Element>(sel: string) => el.querySelector<T & HTMLElement>(sel)!;
    return { store, el, q };
  };

  it('hat zwei Buttons „Wusste ich“ und „Noch üben“', () => {
    const { el } = setup();
    const buttons = [...el.querySelectorAll('.rating-button')];
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Wusste ich', 'Noch üben']);
    expect(buttons.map((b) => b.textContent)).toEqual(['', '']); // nur Symbol
    expect(buttons.map((b) => b.querySelector('svg')!.dataset.icon)).toEqual([
      'thumbsUp',
      'repeat',
    ]);
  });

  it('Buttons sind vor dem Aufdecken verborgen (data-revealed=false)', () => {
    const { el, q } = setup();
    expect(el.dataset.revealed).toBe('false');
    q('.speak-button').click();
    expect(el.dataset.revealed).toBe('true');
  });

  it('Tipp speichert den Lernstand und zeigt ein neues, verdecktes Wort', () => {
    const { store, el, q } = setup();
    const first = q('.word-card').dataset.wordId!;
    q('.speak-button').click();
    q('[data-rating="known"]').click();
    expect(store.getState().data.progress.en[first]).toMatchObject({ box: 1, seen: 1 });
    expect(q('.word-card').dataset.wordId).not.toBe(first);
    expect(el.dataset.revealed).toBe('false');
    expect(q('.round__foreign').textContent).toBe('');
  });

  it('Tipp ohne Aufdecken bewirkt nichts', () => {
    const { store, q } = setup();
    const first = q('.word-card').dataset.wordId!;
    q('[data-rating="practice"]').click();
    expect(q('.word-card').dataset.wordId).toBe(first);
    expect(store.getState().data.progress.en).toEqual({});
  });
});

describe('Avatar in der Lernrunde (B-24)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('zeigt den gewählten Begleiter: „zeigt“ bei neuem Wort, „freut“ nach Aufdecken', () => {
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class {});
    const data = defaults();
    data.settings = { companion: 'mots', language: 'en', durationMin: 5 };
    const store = createStore(data);
    store.dispatch({ type: 'play' });
    const { el } = renderRound(store);
    const avatar = el.querySelector<HTMLElement>('.round__avatar .avatar')!;
    const img = avatar.querySelector('img')!;
    expect(avatar.dataset.pose).toBe('zeigt');
    expect(img.getAttribute('src')).toMatch(/pony_pointing\.png$/);

    el.querySelector<HTMLButtonElement>('.speak-button')!.click();
    expect(avatar.dataset.pose).toBe('freut');
    expect(img.getAttribute('src')).toMatch(/pony_idle\.png$/);

    el.querySelector<HTMLButtonElement>('[data-rating="known"]')!.click();
    expect(avatar.dataset.pose).toBe('zeigt');
    expect(el.querySelector('.round__avatar .avatar img')).toBe(img); // nur Bildtausch
  });
});
