// B-69: Gruppierung der Wörter nach Stufe im Elternbereich – nur der Wortschatz (B-84).
import { describe, expect, it } from 'vitest';
import { vocabulary } from '../src/data/vocabulary';
import { childDefaults } from '../src/storage';
import { wordsByLevel } from '../src/views/admin';

describe('wordsByLevel (B-69)', () => {
  it('ohne Lernstand sind alle Wörter neu', () => {
    const groups = wordsByLevel(childDefaults().progress, 'en');
    expect(groups.get(null)).toHaveLength(vocabulary('en').length);
    for (const level of [0, 1, 2, 3, 4]) expect(groups.get(level)).toEqual([]);
  });

  it('ordnet jedes Wort genau einer Stufe zu', () => {
    const progress = childDefaults().progress;
    const entry = (box: number) => ({ box, seen: 1, lastSeenAt: '2026-10-30T08:00:00.000Z' });
    progress.fr = { apfel: entry(0), hund: entry(4), katze: entry(2) };
    const groups = wordsByLevel(progress, 'fr');
    const all = vocabulary('fr').length;
    expect(groups.get(0)!.map((w) => w.id)).toEqual(['apfel']);
    expect(groups.get(2)!.map((w) => w.id)).toEqual(['katze']);
    expect(groups.get(4)!.map((w) => w.id)).toEqual(['hund']);
    expect(groups.get(null)).toHaveLength(all - 3);
    expect([...groups.values()].flat()).toHaveLength(all);
  });
});
