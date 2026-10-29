// Infos je Lernsprache: Name (für Screenreader), Flaggenbild und ob es vorproduzierte
// MP3s gibt. Ohne MP3s liest die Stimme des Geräts vor (Web Speech).
import type { Language } from './words';

export interface LanguageInfo {
  name: string;
  flag: string;
  /** true: Aussprache aus public/audio/<lang>/<id>.mp3 (Kokoro); false: Gerätestimme. */
  audioFiles: boolean;
}

export const LANGUAGE_INFO: Record<Language, LanguageInfo> = {
  // Kokoro (bf_emma) spricht bei englischen Einzelwörtern einen falschen Anfangslaut mit –
  // Englisch daher vorerst über die Gerätestimme (anforderungen.md §11).
  en: { name: 'Englisch', flag: 'flag_gb.svg', audioFiles: false },
  fr: { name: 'Französisch', flag: 'flag_fr.svg', audioFiles: true },
};

export function flagUrl(language: Language): string {
  return `${import.meta.env.BASE_URL}flags/${LANGUAGE_INFO[language].flag}`;
}
