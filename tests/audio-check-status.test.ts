// B-71: Prüfstand der Abhörseite aus audio-check.md.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WORDS } from '../src/data/words';
import { isChecked, parseAudioCheck } from '../tools/audio-check-status';

const SAMPLE = `
| id | Deutsch | Englisch | ok | Französisch | ok | Japanisch | ok | Italienisch | ok |
|---|---|---|---|---|---|---|---|---|---|
| apfel | 🍎 Apfel | apple | [x] | la pomme | [X] | りんご | [ ] | la mela | [x] |
| banane | 🍌 Banane | banana | [ ] | la banane | [x] | バナナ | [ ] | la banana | [ ] |
`;

describe('parseAudioCheck (B-71)', () => {
  it('AT-71.1/AT-85.3: liest je Sprache abgehakt oder offen (ohne Notizspalte)', () => {
    const rows = parseAudioCheck(SAMPLE);
    expect(rows.get('apfel')).toEqual({ checked: { en: true, fr: true, ja: false, it: true } });
    expect(rows.get('banane')).toEqual({ checked: { en: false, fr: true, ja: false, it: false } });
    expect(rows.has('id')).toBe(false);
  });

  it('AT-71.1: fehlende Wörter gelten als offen', () => {
    const rows = parseAudioCheck(SAMPLE);
    expect(isChecked(rows, 'katze', 'en')).toBe(false);
    expect(isChecked(rows, 'apfel', 'en')).toBe(true);
  });

  it('die echte audio-check.md enthält jedes Wort', () => {
    const rows = parseAudioCheck(readFileSync('audio-check.md', 'utf8'));
    for (const w of WORDS) expect(rows.has(w.id), w.id).toBe(true);
  });
});
