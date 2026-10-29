// Infos je Lernsprache: Name (für Screenreader), Flaggenbild und ob es vorproduzierte
// MP3s gibt. Ohne MP3s liest die Stimme des Geräts vor (Web Speech).
import type { Language } from './words';

export interface LanguageInfo {
  name: string;
  flag: string;
  /** true: Aussprache aus public/audio/<lang>/<id>.mp3; false: Gerätestimme. */
  audioFiles: boolean;
}

export const LANGUAGE_INFO: Record<Language, LanguageInfo> = {
  // Englisch: Piper (en_US-ljspeech-high), Französisch: Kokoro (ff_siwis)
  en: { name: 'Englisch', flag: 'flag_gb.svg', audioFiles: true },
  fr: { name: 'Französisch', flag: 'flag_fr.svg', audioFiles: true },
};

export function flagUrl(language: Language): string {
  return `${import.meta.env.BASE_URL}flags/${LANGUAGE_INFO[language].flag}`;
}
