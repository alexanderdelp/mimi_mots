// Vorlesen des Fremdworts (anforderungen.md §6): vorproduzierte MP3s über HTMLAudioElement
// (nicht Web Audio – wegen der iOS-Stummschaltung). Hat die Sprache keine MP3s, fehlt eine
// Datei oder scheitert das Abspielen, liest die Web Speech API des Geräts vor (en-GB / fr-FR / ja-JP).
import { LANGUAGE_INFO } from './data/languages';
import type { Language, Word } from './data/words';

export const SPEECH_LANG: Record<Language, string> = { en: 'en-GB', fr: 'fr-FR', ja: 'ja-JP' };

export function audioUrl(language: Language, id: string): string {
  return `${import.meta.env.BASE_URL}audio/${language}/${id}.mp3`;
}

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

function synth(): SpeechSynthesis | undefined {
  return typeof window !== 'undefined' ? window.speechSynthesis : undefined;
}

/**
 * Stößt das Laden der Stimmenliste an: Browser liefern sie verzögert, beim allerersten
 * getVoices() oft noch leer. So steht beim ersten Fallback schon die passende Stimme bereit.
 */
export function warmUpVoices(): void {
  try {
    synth()?.getVoices();
  } catch {
    // ohne Sprachausgabe nichts zu tun
  }
}

/**
 * Liest den Text per Web Speech vor; eine laufende Wiedergabe wird abgebrochen.
 * Gibt false zurück, wenn keine Sprachausgabe verfügbar ist (die App läuft dann still weiter).
 */
export function speak(text: string, language: Language): boolean {
  const s = synth();
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') return false;
  try {
    s.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[language];
    const voice = pickVoice(s.getVoices(), utterance.lang);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    s.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  try {
    synth()?.cancel();
  } catch {
    // ohne Sprachausgabe nichts zu tun
  }
}

/** Zustand einer Audiodatei nach dem Vorladen. */
type FileState = 'pending' | 'ok' | 'missing';

export interface AudioPlayerDeps {
  /** Gibt es für die Sprache vorproduzierte MP3s? Sonst direkt Web Speech. */
  hasFiles: (language: Language) => boolean;
  createAudio: () => HTMLAudioElement;
  fetchFile: (url: string) => Promise<boolean>;
  speak: (text: string, language: Language) => boolean;
  stopSpeaking: () => void;
}

const defaultDeps: AudioPlayerDeps = {
  hasFiles: (language) => LANGUAGE_INFO[language].audioFiles,
  createAudio: () => new Audio(),
  // lädt die Datei in den HTTP-Cache (iOS lädt <audio> ohne Geste nicht vor)
  fetchFile: (url) =>
    fetch(url)
      .then((res) => res.ok)
      .catch(() => false),
  speak,
  stopSpeaking,
};

export interface AudioPlayer {
  /** Lädt die Dateien der Runde vor und merkt sich, welche fehlen. */
  preload(language: Language, ids: readonly string[]): Promise<void>;
  /** Spielt das Fremdwort von vorn ab; ohne MP3s der Sprache oder als Fallback: Web Speech. */
  play(word: Word, language: Language): void;
  /** Beendet eine laufende Wiedergabe (Datei und Sprachausgabe). */
  stop(): void;
}

export function createAudioPlayer(deps: AudioPlayerDeps = defaultDeps): AudioPlayer {
  const files = new Map<string, FileState>();
  let element: HTMLAudioElement | null = null;

  const fallback = (word: Word, language: Language) => deps.speak(word[language], language);

  return {
    async preload(language, ids) {
      warmUpVoices();
      if (!deps.hasFiles(language)) return;
      await Promise.all(
        ids.map(async (id) => {
          const url = audioUrl(language, id);
          if (files.has(url)) return;
          files.set(url, 'pending');
          files.set(url, (await deps.fetchFile(url)) ? 'ok' : 'missing');
        }),
      );
    },

    play(word, language) {
      const url = audioUrl(language, word.id);
      if (!deps.hasFiles(language) || files.get(url) === 'missing') {
        fallback(word, language); // speak() bricht eine laufende Ausgabe selbst ab
        return;
      }
      deps.stopSpeaking();
      // ein gemeinsames Element: auf iOS bleibt es nach dem ersten Tipp „freigeschaltet“
      element ??= deps.createAudio();
      const audio = element;
      audio.pause();
      if (!audio.src.endsWith(url)) audio.src = url;
      audio.currentTime = 0;
      audio.onerror = () => {
        files.set(url, 'missing');
        fallback(word, language);
      };
      const result = audio.play();
      // AbortError = vorherige Wiedergabe durch erneuten Tipp/Stop abgebrochen, kein Fehler
      result?.catch?.((error: unknown) => {
        if ((error as { name?: string } | null)?.name !== 'AbortError') fallback(word, language);
      });
    },

    stop() {
      element?.pause();
      deps.stopSpeaking();
    },
  };
}
