// B-30b: erzeugte Audiodateien und Hörprüfliste passen zur Wortliste.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import choices from '../audio-choices.json';
import { WORDS } from '../src/data/words';
import { isChecked, parseAudioCheck } from '../tools/audio-check-status';

// B-64: auch Englisch aus MP3s (Piper), B-67: Japanisch (VOICEVOX), B-80: Italienisch (Kokoro/Piper)
const LANGS = ['en', 'fr', 'ja', 'it'] as const;
const dir = (lang: string) => `public/audio/${lang}`;
const chosen = (lang: string) => (choices as Record<string, Record<string, unknown>>)[lang] ?? {};
/** B-85/B-103: Datei nur für Wörter mit gewählter Aufnahme – nicht bei „keins“ (null) und nicht
 *  für noch unentschiedene Wörter (die nutzt die App nicht, B-84). */
const withFile = (lang: string) => WORDS.filter((w) => chosen(lang)[w.id] != null);

/** MP3 erkennbar an ID3-Tag oder MPEG-Frame-Sync (0xFFE…). */
function isMp3(path: string): boolean {
  const head = readFileSync(path).subarray(0, 3);
  return head.toString('latin1') === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);
}

describe('Audiodateien (B-30b)', () => {
  it.each(LANGS)('AT-30b.1/AT-85.1/AT-103.2: %s – genau eine Datei je gewähltem Wort', (lang) => {
    const files = readdirSync(dir(lang)).filter((f) => f.endsWith('.mp3'));
    expect(files.sort()).toEqual(
      withFile(lang)
        .map((w) => `${w.id}.mp3`)
        .sort(),
    );
  });

  it('AT-30b.2: klein und gültig', () => {
    let total = 0;
    for (const lang of LANGS) {
      for (const word of withFile(lang)) {
        const path = `${dir(lang)}/${word.id}.mp3`;
        const size = statSync(path).size;
        total += size;
        expect(size, path).toBeGreaterThan(1000);
        // seit B-79 bis 32 KB: manche wählbaren Stimmen (z. B. Piper cori) sprechen langsamer
        expect(size, path).toBeLessThan(32 * 1024);
        expect(isMp3(path), path).toBe(true);
      }
    }
    expect(total).toBeLessThan(3 * 1024 * 1024);
  });
});

describe('Hörprüfliste (B-30b)', () => {
  const lines = readFileSync('audio-check.md', 'utf8').split('\n');

  it('AT-30b.4/AT-64.6/AT-67.6/AT-80.4: jedes Wort genau einmal mit Kästchen je Sprache', () => {
    for (const word of WORDS) {
      const rows = lines.filter((l) => l.startsWith(`| ${word.id} |`));
      expect(rows, word.id).toHaveLength(1);
      expect(rows[0]).toContain(word.en);
      expect(rows[0]).toContain(word.fr);
      expect(rows[0]).toContain(word.ja);
      expect(rows[0]).toContain(word.it);
      expect(rows[0].match(/\[[ x]\]/g), word.id).toHaveLength(4);
    }
  });

  it.each(LANGS)('AT-85.3: %s – abgehakt genau die Wörter mit gewählter Aufnahme', (lang) => {
    const rows = parseAudioCheck(lines.join('\n'));
    for (const word of WORDS) {
      expect(isChecked(rows, word.id, lang), word.id).toBe(chosen(lang)[word.id] != null);
    }
  });

  it('nennt die Abhörseite, die es im Projekt gibt', () => {
    expect(lines.join('\n')).toContain('tools/hoerpruefung.html');
    expect(existsSync('tools/hoerpruefung.html')).toBe(true);
  });
});
