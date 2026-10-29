// Anzeige-Infos je Lernsprache: Name (für Screenreader) und Flaggenbild.
import type { Language } from './words';

export const LANGUAGE_INFO: Record<Language, { name: string; flag: string }> = {
  en: { name: 'Englisch', flag: 'flag_gb.png' },
  fr: { name: 'Französisch', flag: 'flag_fr.png' },
};

export function flagUrl(language: Language): string {
  return `${import.meta.env.BASE_URL}flags/${LANGUAGE_INFO[language].flag}`;
}
