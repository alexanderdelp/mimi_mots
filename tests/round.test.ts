import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORDS, getWord } from '../src/data/words';
import { seededRng } from '../src/scheduler';
import { defaults } from '../src/storage';
import { createStore } from '../src/state';
import { TUTORIAL_STEPS, penLoop, renderRound, showNextWord } from '../src/views/round';

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
  data.settings = { companion: 'mimi', language, durationMin: 3 };
  data.tutorialDone = true; // Tutorial (B-74) eigens getestet
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

  it('AT-88.2: ausgeschaltete Wörter kommen nicht vor', () => {
    const data = defaults();
    data.settings = { companion: 'mimi', language: 'en', durationMin: 3 };
    data.tutorialDone = true;
    const off = WORDS.slice(0, WORDS.length - 4).map((w) => w.id);
    data.disabledWords.en = off;
    const store = createStore(data);
    store.dispatch({ type: 'play' });
    const rng = seededRng(3);
    for (let i = 0; i < 40; i++) {
      showNextWord(store, rng);
      expect(off).not.toContain(store.getState().round!.wordId);
    }
  });

  it('AT-88.4: die Bremse zählt nur eingeschaltete Wörter auf Stufe 0', () => {
    const at = (box: number) => ({ box, seen: 1, lastSeenAt: '2026-10-30T08:00:00.000Z' });
    const data = defaults();
    data.settings = { companion: 'mimi', language: 'en', durationMin: 3 };
    data.tutorialDone = true;
    const ids = WORDS.map((w) => w.id);
    // 6 auf Stufe 0 bremsen; eins davon aus → nur noch 5, neue Wörter kommen wieder
    data.progress.en = Object.fromEntries(ids.slice(0, 7).map((id, i) => [id, at(i < 6 ? 0 : 2)]));
    const run = (disabled: string[]) => {
      const store = createStore({
        ...data,
        disabledWords: { ...data.disabledWords, en: disabled },
      });
      store.dispatch({ type: 'play' });
      const rng = seededRng(5);
      for (let i = 0; i < 12; i++) showNextWord(store, rng);
      return store.getState().round!.session.introduced;
    };
    expect(run([])).toEqual([]);
    expect(run([ids[0]]).length).toBeGreaterThan(0);
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

  it('AT-66.2/66.3: deutsches Wort in Silben, abwechselnd a/b', () => {
    const store = roundStore();
    store.dispatch({ type: 'play' });
    const { el } = renderRound(store);
    store.dispatch({ type: 'word', id: 'banane', session: store.getState().round!.session });
    const spans = [...el.querySelectorAll<HTMLElement>('.word-card__de .word-card__syllable')];
    expect(spans.map((s) => s.textContent)).toEqual(['Ba', 'na', 'ne']);
    expect(spans.map((s) => s.className.split('--')[1])).toEqual(['a', 'b', 'a']);
    store.dispatch({ type: 'word', id: 'hund', session: store.getState().round!.session });
    const one = el.querySelectorAll('.word-card__de .word-card__syllable');
    expect([...one].map((s) => s.className)).toEqual([
      'word-card__syllable word-card__syllable--a',
    ]);
  });

  it('enthält das Fremdwort nicht', () => {
    const store = roundStore('fr');
    const { el } = renderRound(store);
    const word = getWord(el.querySelector<HTMLElement>('.word-card')!.dataset.wordId!)!;
    // ohne die deutsche Karte prüfen: bei „orange“ ist das Fremdwort gleich dem deutschen Wort
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelector('.word-card')!.remove();
    expect(copy.textContent).not.toContain(word.fr);
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

  it('Englisch spielt ebenfalls die MP3 (B-64)', () => {
    const media = withSpeech();
    const { el } = renderRound(roundStore('en'));
    const word = getWord(el.querySelector<HTMLElement>('.word-card')!.dataset.wordId!)!;
    el.querySelector<HTMLButtonElement>('.speak-button')!.click();
    expect(media.play).toHaveBeenCalledTimes(1);
    expect((media.play.mock.instances[0] as HTMLAudioElement).src).toMatch(
      new RegExp(`/audio/en/${word.id}\\.mp3$`),
    );
    expect(media.speak).not.toHaveBeenCalled();
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
    data.settings = { companion: 'mots', language: 'en', durationMin: 3 };
    data.tutorialDone = true;
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

describe('Tutorial (B-74)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function tutorialStore() {
    vi.stubGlobal('speechSynthesis', { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] });
    vi.stubGlobal('SpeechSynthesisUtterance', class {});
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const data = defaults();
    data.settings = { companion: 'mots', language: 'fr', durationMin: 3 };
    const store = createStore(data);
    store.dispatch({ type: 'play' });
    return store;
  }

  const click = (el: HTMLElement, label: string) =>
    el.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click();

  it('B-87: zehn Schritte, jeder Tipp geht weiter, Buttons wirken nicht, zählt nicht', () => {
    const store = tutorialStore();
    const { el } = renderRound(store);
    const bubble = el.querySelector('.tutorial-bubble')!;
    const avatar = () => el.querySelector('.round__avatar img')!.getAttribute('src');
    const marked = () => el.querySelector('.tutorial-target');
    const tap = () => el.querySelector<HTMLElement>('.word-card')!.click();
    expect(el.querySelector('.word-card')!.getAttribute('data-word-id')).toBe('apfel');
    expect(TUTORIAL_STEPS).toHaveLength(10);
    for (const step of TUTORIAL_STEPS) expect(step.text.split(' ').length).toBeLessThanOrEqual(12);

    // Begrüßung: der gewählte Begleiter (Mots) winkt, alles andere unscharf
    expect(bubble.textContent).toBe('Hallo! Schön, dass du da bist!');
    expect(avatar()).toMatch(/pony_waving/);
    expect(el.dataset.tutorialBlur).toBe('all');
    expect(el.dataset.tutorialTimer).toBe('false'); // Uhr erst mit ihrem Schritt
    expect(marked()).toBeNull();
    click(el, 'Wusste ich'); // jeder Tipp geht weiter, bewertet aber nicht
    expect(bubble.textContent).toBe('Lass uns mal sehen, was du hier machen kannst.');
    expect(avatar()).toMatch(/pony_idle/);
    tap();

    // Wortkarte, Übersetzungskarte noch unscharf; Kreis in eigener Ebene, wird gezogen
    expect(el.dataset.tutorialBlur).toBe('answer');
    expect(marked()!.classList.contains('word-card')).toBe(true);
    const mark = el.querySelector('.tutorial-mark')!;
    expect(mark.parentElement).toBe(el);
    expect(mark.classList.contains('tutorial-mark--draw')).toBe(true);
    tap();
    expect(el.dataset.tutorialBlur).toBe('none');
    expect(marked()!.classList.contains('round__flag')).toBe(true);
    expect(bubble.textContent).toBe('Sprich das übersetzte Wort laut aus.');
    click(el, 'Noch üben');
    expect(marked()!.getAttribute('aria-label')).toBe('Auf Französisch anhören');
    expect(el.querySelector('.round__foreign')!.textContent).toBe('');
    click(el, 'Auf Französisch anhören');
    expect(el.querySelector('.round__foreign')!.textContent).toBe('la pomme');
    expect(marked()!.getAttribute('aria-label')).toBe('Wusste ich');
    click(el, 'Wusste ich');
    expect(marked()!.getAttribute('aria-label')).toBe('Noch üben');
    const path = el.querySelector('.tutorial-mark path')!.getAttribute('d');
    click(el, 'Noch üben');
    expect(bubble.textContent).toBe('Das Wort kommt dann später wieder.');
    expect(el.querySelector('.tutorial-mark path')!.getAttribute('d')).toBe(path); // bleibt stehen
    click(el, 'Noch üben');
    expect(marked()!.classList.contains('round__timer')).toBe(true);
    expect(el.dataset.tutorialBlur).toBe('all');
    expect(el.dataset.tutorialTimer).toBe('true');
    expect(store.getState().round!.wordId).toBeNull();
    tap();
    expect(bubble.textContent).toBe('Los geht’s!');
    expect(avatar()).toMatch(/pony_waving/);
    expect(el.dataset.tutorialBlur).toBe('all');
    expect(el.querySelector('.tutorial-mark')).toBeNull();
    expect(store.getState().data.tutorialDone).toBe(false);

    tap();
    expect(el.dataset.tutorial).toBeUndefined();
    expect(el.dataset.tutorialBlur).toBeUndefined();
    expect(el.dataset.tutorialTimer).toBeUndefined();
    expect(bubble.hasAttribute('hidden')).toBe(true);
    expect(store.getState().data.tutorialDone).toBe(true);
    expect(store.getState().round!.wordId).not.toBeNull();
    expect(store.getState().data.progress.fr).toEqual({}); // Probewort zählt nicht
    expect(avatar()).toMatch(/pony_/);
    expect(el.querySelectorAll('.tutorial-target')).toHaveLength(0);
  });

  it('B-87: penLoop ist eine geschlossene Schleife mit mehr als einer Umdrehung', () => {
    const d = penLoop(200, 100);
    const pts = d
      .slice(1)
      .split(' L')
      .map((p) => p.split(' ').map(Number));
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(200);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
    // Winkel um die Mitte aufsummieren: mehr als 360°
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = Math.atan2(pts[i - 1][1] - 50, pts[i - 1][0] - 100);
      const b = Math.atan2(pts[i][1] - 50, pts[i][0] - 100);
      total += Math.atan2(Math.sin(b - a), Math.cos(b - a));
    }
    expect(Math.abs(total)).toBeGreaterThan(2 * Math.PI);
  });

  it('kein Tutorial, wenn es schon gesehen wurde', () => {
    const store = tutorialStore();
    store.dispatch({ type: 'finish' });
    const data = { ...store.getState().data, tutorialDone: true };
    const again = createStore(data);
    again.dispatch({ type: 'play' });
    const { el } = renderRound(again);
    expect(el.querySelector('.tutorial-bubble')!.hasAttribute('hidden')).toBe(true);
    expect(again.getState().round!.wordId).not.toBeNull();
  });
});
