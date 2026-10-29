// Vorlesen des Fremdworts. Bis die MP3-Dateien da sind (B-30a/b, B-31), nur über die
// Web Speech API des Geräts – laut Anforderungen der Fallback bei fehlender Datei.
import type { Language } from './data/words';

export const SPEECH_LANG: Record<Language, string> = { en: 'en-GB', fr: 'fr-FR' };

/** Beste verfügbare Stimme: exakte Sprache bevorzugt, lokale Stimmen vor Online-Stimmen. */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | undefined {
  const base = lang.slice(0, 2).toLowerCase();
  const matching = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base));
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase() ? 2 : 0) +
    (v.localService ? 1 : 0);
  return [...matching].sort((a, b) => score(b) - score(a))[0];
}

/**
 * Liest den Text vor; eine laufende Wiedergabe wird abgebrochen und von vorn begonnen.
 * Gibt false zurück, wenn keine Sprachausgabe verfügbar ist (die App läuft dann still weiter).
 */
export function speak(text: string, language: Language): boolean {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;
  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[language];
    const voice = pickVoice(synth.getVoices(), utterance.lang);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/** Bricht eine laufende Wiedergabe ab (z. B. beim Verlassen der Runde). */
export function stopSpeaking(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // ohne Sprachausgabe nichts zu tun
  }
}
