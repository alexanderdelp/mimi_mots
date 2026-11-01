// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORDS, getWord } from '../src/data/words';
import { seededRng } from '../src/scheduler';
import { childDefaults } from '../src/storage';
import { createStore } from './test-store';
import { renderRound, showNextWord } from '../src/views/round';
import { TUTORIAL_STEPS } from '../src/views/tutorial';

// Vorladen der Audiodateien: in jsdom gibt es keinen Server – alle Dateien gelten als vorhanden.
// (Der Player ist modulweit geteilt; ohne das würden frühe Tests Dateien als fehlend markieren.)
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true })),
  );
});

function roundStore(language: 'en' | 'fr' = 'en', mode: 'speak' | 'listen' = 'speak') {
  const data = childDefaults();
  data.settings = { companion: 'mimi', language, mode };
  data.tutorialDone = true; // Tutorial (B-74) eigens getestet
  data.listenTutorialDone = true;
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
    const data = childDefaults();
    data.settings = { companion: 'mimi', language: 'en', mode: 'speak' };
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
    const data = childDefaults();
    data.settings = { companion: 'mimi', language: 'en', mode: 'speak' };
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
    const store = createStore(childDefaults());
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

describe('Hörrunde (B-89)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const media = () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    return play;
  };

  it('AT-89.4: Fremdwortkarte zuerst, Fremdwort sofort sichtbar und einmal abgespielt', () => {
    const play = media();
    const store = roundStore('fr', 'listen');
    const { el } = renderRound(store);
    expect(el.dataset.mode).toBe('listen');
    const cards = [...el.querySelector('.round__cards')!.children];
    expect(cards.map((c) => c.classList.contains('round__answer'))).toEqual([true, false]);
    const word = getWord(el.querySelector<HTMLElement>('.word-card')!.dataset.wordId!)!;
    expect(el.querySelector('.round__foreign')!.textContent).toBe(word.fr);
    expect(play).toHaveBeenCalledTimes(1);
    expect((play.mock.instances[0] as HTMLAudioElement).src).toMatch(`/audio/fr/${word.id}.mp3`);
    expect(el.dataset.revealed).toBe('false');
  });

  it('AT-89.4: Lautsprecher spielt erneut, deckt aber nicht auf; Auge deckt auf', () => {
    const play = media();
    const store = roundStore('fr', 'listen');
    const { el } = renderRound(store);
    el.querySelector<HTMLButtonElement>('.speak-button')!.click();
    expect(play).toHaveBeenCalledTimes(2);
    expect(store.getState().round!.revealed).toBe(false);
    const reveal = el.querySelector<HTMLButtonElement>('.word-card .reveal-button')!;
    expect(reveal.getAttribute('aria-label')).toBe('Zeig mir das deutsche Wort');
    reveal.click();
    expect(store.getState().round!.revealed).toBe(true);
    expect(el.dataset.revealed).toBe('true');
    expect(play).toHaveBeenCalledTimes(2); // Aufdecken spielt nicht noch einmal
  });

  it('AT-89.4: nächstes Wort wird wieder abgespielt', () => {
    const play = media();
    const store = roundStore('fr', 'listen');
    const { el } = renderRound(store);
    el.querySelector<HTMLButtonElement>('.reveal-button')!.click();
    el.querySelector<HTMLButtonElement>('[data-rating="known"]')!.click();
    expect(play).toHaveBeenCalledTimes(2);
    expect(store.getState().data.listenProgress.fr).not.toEqual({});
    expect(store.getState().data.progress.fr).toEqual({});
  });

  it('Sprechrunde hat keinen Auge-Button', () => {
    const { el } = renderRound(roundStore('fr'));
    expect(el.querySelector('.reveal-button')).toBeNull();
    expect(el.dataset.mode).toBe('speak');
  });

  it('AT-89.5: der Scheduler nutzt den Hör-Lernstand', () => {
    const store = roundStore('en', 'listen');
    const entry = { box: 4, seen: 3, lastSeenAt: '2026-10-29T10:00:00.000Z' };
    const ids = WORDS.map((w) => w.id);
    // im Sprech-Lernstand alles bekannt, im Hör-Lernstand nichts → in der Hörrunde nur neue
    const data = store.getState().data;
    data.progress.en = Object.fromEntries(ids.map((id) => [id, entry]));
    showNextWord(store, seededRng(2));
    expect(store.getState().round!.session.introduced).toHaveLength(1);
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
    const data = childDefaults();
    data.settings = { companion: 'mots', language: 'en', mode: 'speak' };
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
    const data = childDefaults();
    data.settings = { companion: 'mots', language: 'fr', mode: 'speak' };
    const store = createStore(data);
    store.dispatch({ type: 'play' });
    return store;
  }

  const click = (el: HTMLElement, label: string) =>
    el.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!.click();

  it('B-87/B-95: zehn Schritte, nur „Weiter“ geht weiter, Buttons wirken nicht, zählt nicht', () => {
    const store = tutorialStore();
    const { el } = renderRound(store);
    const bubble = el.querySelector('.tutorial-bubble')!;
    const avatar = () => el.querySelector('.round__avatar img')!.getAttribute('src');
    const marked = () => el.querySelector('.tutorial-target');
    const tap = () => click(el, 'Weiter');
    const step = () => el.dataset.tutorial;
    expect(el.querySelector('.word-card')!.getAttribute('data-word-id')).toBe('apfel');
    expect(TUTORIAL_STEPS).toHaveLength(10);
    for (const step of TUTORIAL_STEPS) expect(step.text.split(' ').length).toBeLessThanOrEqual(12);

    // Begrüßung: der gewählte Begleiter (Mots) winkt, alles andere unscharf
    expect(bubble.textContent).toBe('Hallo! Schön, dass du da bist!');
    expect(avatar()).toMatch(/pony_waving/);
    expect(el.dataset.tutorialBlur).toBe('all');
    expect(el.dataset.tutorialTimer).toBe('false'); // Uhr erst mit ihrem Schritt
    expect(marked()).toBeNull();
    click(el, 'Wusste ich'); // B-95: geht nicht weiter und bewertet nicht
    el.querySelector<HTMLElement>('.word-card')!.click();
    bubble.querySelector<HTMLElement>('.tutorial-bubble__text')!.click();
    expect(step()).toBe('1');
    tap();
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
    click(el, 'Auf Französisch anhören'); // außerhalb seines Schritts: nichts
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(step()).toBe('4');
    tap();
    expect(marked()!.getAttribute('aria-label')).toBe('Auf Französisch anhören');
    expect(el.querySelector('.round__foreign')!.textContent).toBe('');
    click(el, 'Auf Französisch anhören'); // spielt das Probewort, bleibt im Schritt
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(step()).toBe('5');
    tap();
    expect(el.querySelector('.round__foreign')!.textContent).toBe('la pomme');
    expect(marked()!.getAttribute('aria-label')).toBe('Wusste ich');
    click(el, 'Wusste ich');
    expect(step()).toBe('6');
    tap();
    expect(marked()!.getAttribute('aria-label')).toBe('Noch üben');
    const path = el.querySelector('.tutorial-mark path')!.getAttribute('d');
    tap();
    expect(bubble.textContent).toBe('Das Wort kommt dann später wieder.');
    expect(el.querySelector('.tutorial-mark path')!.getAttribute('d')).toBe(path); // bleibt stehen
    tap();
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
    expect(bubble.hasAttribute('hidden')).toBe(true); // samt „Weiter“
    expect(store.getState().data.tutorialDone).toBe(true);
    expect(store.getState().round!.wordId).not.toBeNull();
    expect(store.getState().data.progress.fr).toEqual({}); // Probewort zählt nicht
    expect(avatar()).toMatch(/pony_/);
    expect(el.querySelectorAll('.tutorial-target')).toHaveLength(0);
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
