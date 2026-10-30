import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WORDS, getWord, type Word } from '../src/data/words';

const COLOR_EMOJIS = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];
const isColor = (w: Word) => COLOR_EMOJIS.includes(w.emoji);

/** Liest die Wortliste aus der Tabelle in anforderungen.md §10. */
function wordsFromRequirements(): Omit<Word, 'syllables'>[] {
  const section = readFileSync('anforderungen.md', 'utf8').split('## 10.')[1].split('## 11.')[0];
  return section
    .split('\n')
    .filter((line) => line.startsWith('| ') && !line.startsWith('| id'))
    .map((line) => {
      const [id, emoji, de, en, fr, ja, jaKana] = line
        .split('|')
        .slice(1, -1)
        .map((s) => s.trim());
      return { id, emoji, de, en, fr, ja, jaKana };
    });
}

describe('Wortliste', () => {
  it('enthält 50 Wörter', () => {
    expect(WORDS).toHaveLength(50);
  });

  it('hat eindeutige ids', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
  });

  it('hat eindeutige Emojis', () => {
    expect(new Set(WORDS.map((w) => w.emoji)).size).toBe(WORDS.length);
  });

  it.each(WORDS.map((w) => [w.id, w] as const))('%s hat keine leeren Felder', (_, word) => {
    for (const key of ['id', 'emoji', 'de', 'en', 'fr'] as const) {
      expect(word[key].trim(), key).not.toBe('');
      expect(word[key], key).toBe(word[key].trim());
    }
  });

  it('ids taugen als Dateinamen (nur a–z)', () => {
    for (const w of WORDS) expect(w.id).toMatch(/^[a-z]+$/);
  });

  it('französische Nomen haben einen bestimmten Artikel, Farben nicht', () => {
    for (const w of WORDS) {
      if (isColor(w)) expect(w.fr, w.id).not.toMatch(/^(le |la |l')/);
      else expect(w.fr, w.id).toMatch(/^(le |la |l')\S/);
    }
  });

  it('englische Wörter haben keinen Artikel', () => {
    for (const w of WORDS) expect(w.en, w.id).not.toMatch(/^(the|a|an) /);
  });

  it('stimmt Eintrag für Eintrag mit anforderungen.md §10 überein (AT-04.2)', () => {
    // Silben (B-66) stehen nur in words.json, nicht in der Tabelle
    const withoutSyllables = WORDS.map(({ syllables, ...rest }) => (void syllables, rest));
    expect(withoutSyllables).toEqual(wordsFromRequirements());
  });

  it('words.json ist reines JSON für das Audio-Skript (AT-04.2)', () => {
    const json = JSON.parse(readFileSync('src/data/words.json', 'utf8'));
    expect(json).toEqual(WORDS);
  });

  it('getWord findet Wörter per id', () => {
    expect(getWord('apfel')).toMatchObject({ en: 'apple', fr: 'la pomme' });
    expect(getWord('gibtsnicht')).toBeUndefined();
  });
});

describe('Silben (B-66)', () => {
  it.each(WORDS.map((w) => [w.de, w.syllables] as const))(
    'AT-66.1: %s – Silben ergeben das Wort',
    (de, syllables) => {
      expect(syllables.join('')).toBe(de);
      for (const s of syllables) expect(s.length).toBeGreaterThan(0);
    },
  );

  it.each([
    ['Banane', ['Ba', 'na', 'ne']],
    ['Schmetterling', ['Schmet', 'ter', 'ling']],
    ['Elefant', ['E', 'le', 'fant']],
    ['Hund', ['Hund']],
  ])('Sprechsilben: %s', (de, syllables) => {
    expect(WORDS.find((w) => w.de === de)!.syllables).toEqual(syllables);
  });
});

describe('Japanisch (B-67)', () => {
  it.each(WORDS.map((w) => [w.id, w.ja, w.jaKana] as const))(
    'AT-67.1: %s – Schreibweise und Kana-Lesung',
    (_, ja, jaKana) => {
      expect(ja.trim()).not.toBe('');
      expect(jaKana).toMatch(/^[ぁ-ゖァ-ヺー]+$/);
    },
  );

  it('Kanji-Wörter haben eine abweichende Lesung, reine Kana-Wörter dieselbe', () => {
    for (const w of WORDS) {
      const kanaOnly = /^[ぁ-ゖァ-ヺー]+$/.test(w.ja);
      if (kanaOnly) expect(w.jaKana, w.id).toBe(w.ja);
      else expect(w.jaKana, w.id).not.toBe(w.ja);
    }
  });
});
