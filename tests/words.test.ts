import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WORDS, getWord, type Word } from '../src/data/words';

const COLOR_EMOJIS = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];
const isColor = (w: Word) => COLOR_EMOJIS.includes(w.emoji);
/** Zahlen 0–10 (B-68): Tasten-Emoji wie 0️⃣ … 🔟. */
const isNumber = (w: Word) => /^(\d\uFE0F\u20E3|🔟)$/u.test(w.emoji);

/** Spalten der Tabelle in anforderungen.md §10, nach Überschrift (weitere Spalten zählen nicht). */
const COLUMNS = {
  id: 'id',
  emoji: 'Emoji',
  de: 'DE',
  en: 'EN',
  fr: 'FR',
  ja: 'JA',
  jaKana: 'JA (Lesung)',
} as const;

/** Liest die Wortliste aus der Tabelle in anforderungen.md §10. */
function wordsFromRequirements(): Omit<Word, 'syllables'>[] {
  const section = readFileSync('anforderungen.md', 'utf8').split('## 10.')[1].split('## 11.')[0];
  const cells = (line: string) =>
    line
      .split('|')
      .slice(1, -1)
      .map((s) => s.trim());
  const lines = section.split('\n').filter((line) => line.startsWith('| '));
  const header = cells(lines.find((line) => line.startsWith('| id'))!);
  return lines
    .filter((line) => !line.startsWith('| id'))
    .map((line) => {
      const row = cells(line);
      const entries = Object.entries(COLUMNS).map(([key, title]) => [
        key,
        row[header.indexOf(title)],
      ]);
      return Object.fromEntries(entries) as Omit<Word, 'syllables'>;
    });
}

describe('Wortliste', () => {
  it('enthält 89 Wörter (50 + Zahlen 0–10, B-68, + 28 neue, B-119)', () => {
    expect(WORDS).toHaveLength(89);
  });

  it('hat eindeutige ids', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
  });

  it('hat eindeutige Emojis', () => {
    expect(new Set(WORDS.map((w) => w.emoji)).size).toBe(WORDS.length);
  });

  it.each(WORDS.map((w) => [w.id, w] as const))('%s hat keine leeren Felder', (_, word) => {
    for (const key of ['id', 'emoji', 'de', 'en', 'fr', 'ja', 'jaKana'] as const) {
      expect(word[key].trim(), key).not.toBe('');
      expect(word[key], key).toBe(word[key].trim());
    }
  });

  it('ids taugen als Dateinamen (nur a–z)', () => {
    for (const w of WORDS) expect(w.id).toMatch(/^[a-z]+$/);
  });

  it('französische Nomen haben einen bestimmten Artikel, Farben und Zahlen nicht', () => {
    for (const w of WORDS) {
      if (isColor(w) || isNumber(w)) expect(w.fr, w.id).not.toMatch(/^(le |la |l')/);
      else expect(w.fr, w.id).toMatch(/^(le |la |l')\S/);
    }
  });

  it('AT-118: kein Wort hat noch ein italienisches Feld', () => {
    for (const w of WORDS) expect(Object.keys(w), w.id).not.toContain('it');
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
    expect(getWord('apfel')).toMatchObject({ en: 'apple', fr: 'la pomme', ja: 'りんご' });
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

describe('Zahlen 0–10 (B-68)', () => {
  const numbers = WORDS.filter(isNumber);

  it('AT-68.1: elf Zahlen in Reihenfolge', () => {
    expect(numbers.map((w) => w.en)).toEqual([
      'zero',
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
      'nine',
      'ten',
    ]);
    expect(numbers.map((w) => w.ja)).toEqual([
      'ゼロ',
      '一',
      '二',
      '三',
      '四',
      '五',
      '六',
      '七',
      '八',
      '九',
      '十',
    ]);
  });

  it('AT-68.2: ohne Artikel, Deutsch klein', () => {
    for (const w of numbers) {
      expect(w.fr, w.id).not.toMatch(/^(le |la |l'|un |une )\S/);
      expect(w.de, w.id).toBe(w.de.toLowerCase());
    }
  });
});

describe('Neue Wörter (B-119)', () => {
  const NEW = [
    ['schaf', '🐑', 'Schaf', 'sheep', 'le mouton', '羊', 'ひつじ'],
    ['huhn', '🐔', 'Huhn', 'chicken', 'la poule', '鶏', 'にわとり'],
    ['schildkroete', '🐢', 'Schildkröte', 'turtle', 'la tortue', '亀', 'かめ'],
    ['giraffe', '🦒', 'Giraffe', 'giraffe', 'la girafe', 'キリン', 'キリン'],
    ['affe', '🐒', 'Affe', 'monkey', 'le singe', '猿', 'さる'],
    ['biene', '🐝', 'Biene', 'bee', "l'abeille", '蜂', 'はち'],
    ['schnecke', '🐌', 'Schnecke', 'snail', "l'escargot", 'かたつむり', 'かたつむり'],
    ['fuchs', '🦊', 'Fuchs', 'fox', 'le renard', '狐', 'きつね'],
    ['pinguin', '🐧', 'Pinguin', 'penguin', 'le pingouin', 'ペンギン', 'ペンギン'],
    ['eule', '🦉', 'Eule', 'owl', 'le hibou', 'ふくろう', 'ふくろう'],
    ['trauben', '🍇', 'Trauben', 'grapes', 'le raisin', 'ぶどう', 'ぶどう'],
    ['wassermelone', '🍉', 'Wassermelone', 'watermelon', 'la pastèque', 'すいか', 'すいか'],
    ['tomate', '🍅', 'Tomate', 'tomato', 'la tomate', 'トマト', 'トマト'],
    ['kartoffel', '🥔', 'Kartoffel', 'potato', 'la pomme de terre', 'じゃがいも', 'じゃがいも'],
    ['pizza', '🍕', 'Pizza', 'pizza', 'la pizza', 'ピザ', 'ピザ'],
    ['schokolade', '🍫', 'Schokolade', 'chocolate', 'le chocolat', 'チョコレート', 'チョコレート'],
    ['auge', '👁️', 'Auge', 'eye', "l'œil", '目', 'め'],
    ['ohr', '👂', 'Ohr', 'ear', "l'oreille", '耳', 'みみ'],
    ['mund', '👄', 'Mund', 'mouth', 'la bouche', '口', 'くち'],
    ['fuss', '🦶', 'Fuß', 'foot', 'le pied', '足', 'あし'],
    ['regenbogen', '🌈', 'Regenbogen', 'rainbow', "l'arc-en-ciel", '虹', 'にじ'],
    ['wolke', '☁️', 'Wolke', 'cloud', 'le nuage', '雲', 'くも'],
    ['geschenk', '🎁', 'Geschenk', 'present', 'le cadeau', 'プレゼント', 'プレゼント'],
    ['teddy', '🧸', 'Teddy', 'teddy bear', 'le nounours', 'テディベア', 'テディベア'],
    ['bett', '🛏️', 'Bett', 'bed', 'le lit', 'ベッド', 'ベッド'],
    ['stuhl', '🪑', 'Stuhl', 'chair', 'la chaise', '椅子', 'いす'],
    ['schluessel', '🔑', 'Schlüssel', 'key', 'la clé', '鍵', 'かぎ'],
    ['flugzeug', '✈️', 'Flugzeug', 'plane', "l'avion", '飛行機', 'ひこうき'],
  ] as const;

  it('AT-119.1: alle 28 Wörter mit Emoji, Deutsch, Englisch, Französisch und Japanisch', () => {
    expect(WORDS.slice(61).map((w) => [w.id, w.emoji, w.de, w.en, w.fr, w.ja, w.jaKana])).toEqual(
      NEW.map((row) => [...row]),
    );
  });

  it.each([
    ['Schildkröte', ['Schild', 'krö', 'te']],
    ['Wassermelone', ['Was', 'ser', 'me', 'lo', 'ne']],
    ['Schokolade', ['Scho', 'ko', 'la', 'de']],
    ['Regenbogen', ['Re', 'gen', 'bo', 'gen']],
    ['Schlüssel', ['Schlüs', 'sel']],
    ['Pinguin', ['Pin', 'guin']],
    ['Fuß', ['Fuß']],
  ])('AT-119.1: Silben %s', (de, syllables) => {
    expect(WORDS.find((w) => w.de === de)!.syllables).toEqual(syllables);
  });
});
