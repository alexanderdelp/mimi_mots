// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { childDefaults } from '../src/storage';
import { reduce, type AppState, type ViewName } from '../src/state';
import { learnedWords } from '../src/views/words';

const entry = (box: number) => ({ box, seen: 2, lastSeenAt: '2026-11-07T10:00:00.000Z' });

const data = () => {
  const d = childDefaults();
  d.name = 'Lina';
  d.settings = { companion: 'mimi', language: 'en', mode: 'speak' };
  d.tutorialDone = true;
  d.progress.en = { hund: entry(0), katze: entry(4), maus: entry(4) };
  d.listenProgress.en = { hund: entry(2) };
  d.disabledWords.en = ['maus'];
  return d;
};

const at = (view: ViewName, d = data()): AppState => ({
  view,
  portrait: false,
  data: d,
  round: null,
});

describe('Meine Wörter (B-107)', () => {
  it('AT-107.3: nur eingeschaltete Wörter mit Lernstand, nach Stufe 0–4, je Modus', () => {
    const rows = learnedWords(data(), 'en', 'speak').map((r) => r.map((w) => w.id));
    expect(rows).toEqual([['hund'], [], [], [], ['katze']]);
    const listen = learnedWords(data(), 'en', 'listen').map((r) => r.map((w) => w.id));
    expect(listen).toEqual([[], [], ['hund'], [], []]);
    expect(learnedWords(data(), 'fr', 'speak').flat()).toEqual([]);
  });

  it('AT-107.1: Start und Schlafseite öffnen „Meine Wörter“, Haus führt zurück', () => {
    const words = reduce(at('start'), { type: 'words' });
    expect(words.view).toBe('words');
    expect(reduce(words, { type: 'home' }).view).toBe('start');

    const asleep = data();
    asleep.rest = { sleeping: ['mimi', 'mots'], since: '2026-11-08' };
    const fromSleep = reduce(at('sleep', asleep), { type: 'words' }, '2026-11-08');
    expect(fromSleep.view).toBe('words');
    expect(reduce(fromSleep, { type: 'home' }, '2026-11-08').view).toBe('sleep');
  });

  it('AT-107.4: von anderen Ansichten nicht erreichbar, von hier kein Elternbereich', () => {
    for (const view of ['round', 'end', 'admin', 'welcome'] as ViewName[]) {
      const state = at(view);
      expect(reduce(state, { type: 'words' }).view).toBe(view);
    }
    const words = at('words');
    expect(reduce(words, { type: 'admin' })).toBe(words);
    expect(reduce(words, { type: 'play' })).toBe(words);
  });

  it('AT-107.2: Ansehen ändert keine Daten', () => {
    const start = at('start');
    const back = reduce(reduce(start, { type: 'words' }), { type: 'home' });
    expect(back.data).toBe(start.data);
  });
});
