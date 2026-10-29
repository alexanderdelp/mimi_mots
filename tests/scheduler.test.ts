import { describe, expect, it } from 'vitest';
import {
  applyRating,
  createSession,
  pickNext,
  seededRng,
  weightedPick,
  type LanguageProgress,
  type Session,
} from '../src/scheduler';

const T = '2026-10-29T12:00:00.000Z';
const known = (...ids: string[]): LanguageProgress =>
  Object.fromEntries(ids.map((id) => [id, { box: 0, seen: 1, lastSeenAt: T }]));

describe('seededRng', () => {
  it('liefert Zahlen in [0, 1)', () => {
    const rng = seededRng(123);
    for (let i = 0; i < 10_000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('ist reproduzierbar und vom Seed abhängig', () => {
    const a = seededRng(5);
    const b = seededRng(5);
    const c = seededRng(6);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
  });
});

describe('weightedPick', () => {
  it('nimmt bei einem Element immer dieses', () => {
    expect(weightedPick([{ item: 'x', weight: 3 }], () => 0.999)).toBe('x');
  });

  it('ordnet Zufallswerte den Gewichtsbereichen zu', () => {
    const items = [
      { item: 'a', weight: 1 },
      { item: 'b', weight: 3 },
    ];
    expect(weightedPick(items, () => 0)).toBe('a');
    expect(weightedPick(items, () => 0.24)).toBe('a');
    expect(weightedPick(items, () => 0.26)).toBe('b');
    expect(weightedPick(items, () => 0.9999)).toBe('b');
  });
});

describe('pickNext', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

  it('ändert Eingaben nicht', () => {
    const progress = known('a', 'b');
    const session: Session = { history: ['a'], introduced: [] };
    const snapshot = structuredClone({ progress, session });
    pickNext(ids, progress, session, seededRng(1));
    expect({ progress, session }).toEqual(snapshot);
  });

  it('hängt das Wort an die Historie und merkt neue Wörter', () => {
    const { id, session } = pickNext(ids, {}, createSession(), seededRng(1));
    expect(session.history).toEqual([id]);
    expect(session.introduced).toEqual([id]);
  });

  it('zählt ein bekanntes Wort nicht als neu', () => {
    const progress = known(...ids);
    const { session } = pickNext(ids, progress, createSession(), seededRng(1));
    expect(session.introduced).toEqual([]);
  });

  it('zählt ein neues Wort, das wiederkommt, nur einmal', () => {
    // Wort wurde gezeigt, aber (noch) nicht bewertet → bleibt ohne Lernstand
    let session = createSession();
    const rng = seededRng(3);
    for (let i = 0; i < 20; i++) session = pickNext(['a', 'b', 'c', 'd'], {}, session, rng).session;
    expect(session.introduced.length).toBeLessThanOrEqual(4);
    expect(new Set(session.introduced).size).toBe(session.introduced.length);
  });

  it('weicht bei sehr kleiner Liste auf das am längsten nicht gezeigte Wort aus', () => {
    const progress = known('a', 'b', 'c');
    const session: Session = {
      history: ['a', 'b', 'c'],
      introduced: ['x', 'y', 'z', 'u', 'v', 'w'],
    };
    expect(pickNext(['a', 'b', 'c'], progress, session, seededRng(1)).id).toBe('a');
  });

  it('nimmt neue Wörter, wenn alle bekannten gerade dran waren', () => {
    const progress = known('a', 'b', 'c', 'd', 'e', 'f');
    const session: Session = { history: ['d', 'e', 'f'], introduced: [] };
    const restricted = ['d', 'e', 'f', 'neu'];
    expect(pickNext(restricted, progress, session, seededRng(1)).id).toBe('neu');
  });

  it('keine neuen Wörter mehr, wenn alle eingeführt sind', () => {
    const progress = known(...ids);
    let session = createSession();
    const rng = seededRng(9);
    for (let i = 0; i < 30; i++) session = pickNext(ids, progress, session, rng).session;
    expect(session.introduced).toEqual([]);
  });
});

describe('applyRating', () => {
  it('nutzt die aktuelle Zeit, wenn keine übergeben wird', () => {
    const before = Date.now();
    const { a } = applyRating({}, 'a', 'known');
    expect(Date.parse(a.lastSeenAt)).toBeGreaterThanOrEqual(before);
  });
});
