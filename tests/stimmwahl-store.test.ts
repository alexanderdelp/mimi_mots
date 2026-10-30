// B-78: Stimmwahl – Auswahl speichern, Datei übernehmen, Hörprüfliste abhaken.
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyChoice,
  choose,
  defaultFiles,
  markChecked,
  readState,
} from '../tools/stimmwahl-store';

const CHECK = `| id | Deutsch | Englisch | ok | Französisch | ok | Japanisch | ok | neu |
|---|---|---|---|---|---|---|---|---|
| apfel | 🍎 Apfel | apple | [ ] | la pomme | [x] | りんご | [ ] | klingt komisch |
| ei | 🥚 Ei | egg | [ ] | l'œuf | [ ] | 卵（たまご） | [ ] |  |
`;

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'stimmwahl-'));
  const files = defaultFiles(root);
  mkdirSync(join(files.candidates, 'en', 'piper-cori-dot'), { recursive: true });
  mkdirSync(join(files.audio, 'en'), { recursive: true });
  writeFileSync(join(files.candidates, 'en', 'piper-cori-dot', 'ei.mp3'), 'KANDIDAT');
  writeFileSync(join(files.audio, 'en', 'ei.mp3'), 'ALT');
  writeFileSync(files.check, CHECK);
  return files;
}

describe('Stimmwahl (B-78)', () => {
  it('applyChoice setzt die Wahl und sortiert die Wörter', () => {
    const a = applyChoice({}, 'en', 'ei', { voice: 'piper-cori', variant: 'dot' });
    const b = applyChoice(a, 'en', 'apfel', { voice: 'kokoro-af_heart', variant: 'word' });
    expect(Object.keys(b.en!)).toEqual(['apfel', 'ei']);
    expect(a.en!.apfel).toBeUndefined(); // unverändert
  });

  it('markChecked hakt nur das Wort in der Sprache ab', () => {
    const md = markChecked(CHECK, 'ei', 'en');
    expect(md).toContain("| ei | 🥚 Ei | egg | [x] | l'œuf | [ ] | 卵（たまご） | [ ] |  |");
    expect(md).toContain('| apfel | 🍎 Apfel | apple | [ ] |');
  });

  it('choose kopiert den Kandidaten, speichert die Wahl und hakt ab', () => {
    const files = sandbox();
    choose(files, 'en', 'ei', { voice: 'piper-cori', variant: 'dot' });
    expect(readFileSync(join(files.audio, 'en', 'ei.mp3'), 'utf8')).toBe('KANDIDAT');
    const state = readState(files);
    expect(state.choices.en!.ei).toEqual({ voice: 'piper-cori', variant: 'dot' });
    expect(state.checked.ei.en).toBe(true);
    expect(state.notes.apfel).toBe('klingt komisch');
  });

  it('choose lehnt Unbekanntes ab, ohne etwas zu ändern', () => {
    const files = sandbox();
    expect(() => choose(files, 'en', 'ei', { voice: 'kokoro-af_heart', variant: 'dot' })).toThrow(
      /Kandidat fehlt/,
    );
    expect(() => choose(files, 'en', '../x', { voice: 'piper-cori', variant: 'dot' })).toThrow();
    expect(() =>
      choose(files, 'de' as 'en', 'ei', { voice: 'piper-cori', variant: 'dot' }),
    ).toThrow();
    expect(readFileSync(join(files.audio, 'en', 'ei.mp3'), 'utf8')).toBe('ALT');
    expect(readState(files).choices).toEqual({});
  });
});
