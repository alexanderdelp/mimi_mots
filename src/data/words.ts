// Wortliste v1 (anforderungen.md §10). Die Daten liegen in words.json,
// damit das Audio-Skript (scripts/generate_audio.py) sie direkt lesen kann.
import data from './words.json';

export type Language = 'en' | 'fr' | 'ja';

export interface Word {
  /** Eindeutig, nur a–z; zugleich Dateiname der Audiodatei (`audio/<lang>/<id>.mp3`). */
  id: string;
  emoji: string;
  de: string;
  /** Sprechsilben des deutschen Worts für die Silbenfarben (B-66); zusammen = `de`. */
  syllables: string[];
  /** Englisch, ohne Artikel. */
  en: string;
  /** Französisch, Nomen mit bestimmtem Artikel (la pomme, l'œuf); Farben ohne. */
  fr: string;
  /** Japanisch in üblicher Schreibweise (Kanji, Hiragana oder Katakana), B-67. */
  ja: string;
  /** Lesung in Kana – Vorlage für die Aussprache (`jaKana`), nicht angezeigt. */
  jaKana: string;
}

export const WORDS: readonly Word[] = data;

const byId = new Map(WORDS.map((w) => [w.id, w]));

export function getWord(id: string): Word | undefined {
  return byId.get(id);
}
