// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SPEECH_LANG,
  audioUrl,
  createAudioPlayer,
  pickVoice,
  speak,
  stopSpeaking,
} from '../src/audio';
import { LANGUAGE_INFO } from '../src/data/languages';

const voice = (lang: string, localService = true, name = lang) =>
  ({ lang, localService, name }) as SpeechSynthesisVoice;

class FakeUtterance {
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  constructor(public text: string) {}
}

function installSynth(voices: SpeechSynthesisVoice[] = []) {
  const synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => voices };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synth;
}

afterEach(() => vi.unstubAllGlobals());

describe('pickVoice', () => {
  it('bevorzugt exakte Sprache und lokale Stimmen', () => {
    const voices = [voice('en-US'), voice('en-GB', false, 'online'), voice('en-GB', true, 'lokal')];
    expect(pickVoice(voices, 'en-GB')!.name).toBe('lokal');
  });

  it('nimmt notfalls eine Stimme derselben Grundsprache', () => {
    expect(pickVoice([voice('fr-CA'), voice('de-DE')], 'fr-FR')!.lang).toBe('fr-CA');
  });

  it('versteht Unterstrich-Schreibweise (Android)', () => {
    expect(pickVoice([voice('fr_FR')], 'fr-FR')!.lang).toBe('fr_FR');
  });

  it('liefert undefined ohne passende Stimme', () => {
    expect(pickVoice([voice('de-DE')], 'en-GB')).toBeUndefined();
  });
});

describe('speak', () => {
  it('bricht laufende Wiedergabe ab und spricht in der richtigen Sprache', () => {
    const synth = installSynth([voice('fr-FR')]);
    expect(speak('la pomme', 'fr')).toBe(true);
    expect(synth.cancel).toHaveBeenCalledBefore(synth.speak);
    const utterance = synth.speak.mock.calls[0][0] as FakeUtterance;
    expect(utterance.text).toBe('la pomme');
    expect(utterance.lang).toBe(SPEECH_LANG.fr);
    expect(utterance.voice?.lang).toBe('fr-FR');
  });

  it('nutzt en-GB für Englisch', () => {
    const synth = installSynth();
    speak('apple', 'en');
    expect((synth.speak.mock.calls[0][0] as FakeUtterance).lang).toBe('en-GB');
  });

  it('meldet false ohne Sprachausgabe', () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(speak('apple', 'en')).toBe(false);
  });

  it('meldet false, wenn die Sprachausgabe wirft', () => {
    const synth = installSynth();
    synth.speak.mockImplementation(() => {
      throw new Error('kaputt');
    });
    expect(speak('apple', 'en')).toBe(false);
  });

  it('stopSpeaking bricht ab und wirft nie', () => {
    const synth = installSynth();
    stopSpeaking();
    expect(synth.cancel).toHaveBeenCalled();
    vi.stubGlobal('speechSynthesis', undefined);
    expect(() => stopSpeaking()).not.toThrow();
  });
});

describe('createAudioPlayer (B-31)', () => {
  const word = {
    id: 'apfel',
    emoji: '🍎',
    de: 'Apfel',
    syllables: ['Ap', 'fel'],
    ja: 'りんご',
    jaKana: 'りんご',
    en: 'apple',
    fr: 'la pomme',
    it: 'la mela',
  };

  /** Attrappe für ein Audio-Element; play() liefert das übergebene Ergebnis. */
  function fakeAudio(playResult: () => Promise<void> = () => Promise.resolve()) {
    const audio = {
      src: '',
      currentTime: 5,
      onerror: null as null | (() => void),
      play: vi.fn(playResult),
      pause: vi.fn(),
    };
    return audio;
  }

  function setup(
    options: {
      exists?: (url: string) => boolean;
      play?: () => Promise<void>;
      hasFiles?: (lang: string) => boolean;
    } = {},
  ) {
    const audio = fakeAudio(options.play);
    const deps = {
      hasFiles: vi.fn(options.hasFiles ?? (() => true)),
      createAudio: vi.fn(() => audio as unknown as HTMLAudioElement),
      fetchFile: vi.fn(async (url: string) => (options.exists ?? (() => true))(url)),
      speak: vi.fn(() => true),
      stopSpeaking: vi.fn(),
    };
    return { audio, deps, player: createAudioPlayer(deps) };
  }

  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('spielt die MP3 der Sprache von vorn ab, ohne Web Speech', async () => {
    const { audio, deps, player } = setup();
    player.play(word, 'fr');
    await flush();
    expect(audio.src).toBe(audioUrl('fr', 'apfel'));
    expect(audio.currentTime).toBe(0);
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(deps.speak).not.toHaveBeenCalled();
  });

  it('nutzt ein einziges Audio-Element und startet bei erneutem Tipp neu', () => {
    const { audio, deps, player } = setup();
    player.play(word, 'en');
    audio.currentTime = 0.4;
    player.play(word, 'en');
    expect(deps.createAudio).toHaveBeenCalledTimes(1);
    expect(audio.pause).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(0);
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it('lädt die Dateien der Sprache vor', async () => {
    const { deps, player } = setup();
    await player.preload('fr', ['apfel', 'hund']);
    expect(deps.fetchFile.mock.calls.map((c) => c[0])).toEqual([
      audioUrl('fr', 'apfel'),
      audioUrl('fr', 'hund'),
    ]);
    await player.preload('fr', ['apfel']);
    expect(deps.fetchFile).toHaveBeenCalledTimes(2); // nicht doppelt
  });

  it('fehlende Datei → Web Speech, ohne Abspielversuch', async () => {
    const { audio, deps, player } = setup({ exists: (url) => !url.includes('apfel') });
    await player.preload('fr', ['apfel']);
    player.play(word, 'fr');
    expect(deps.speak).toHaveBeenCalledWith('la pomme', 'fr');
    expect(audio.play).not.toHaveBeenCalled();
  });

  it('AT-103.3: Japanisch fällt auf die Kana-Lesung zurück', async () => {
    const { deps, player } = setup({ exists: () => false });
    await player.preload('ja', ['apfel']);
    player.play({ ...word, ja: '林檎', jaKana: 'りんご' }, 'ja'); // Schreibweise mit Kanji
    expect(deps.speak).toHaveBeenCalledWith('りんご', 'ja');
  });

  it('Abspielen scheitert → Web Speech', async () => {
    const { deps, player } = setup({
      play: () => Promise.reject(new DOMException('blockiert', 'NotAllowedError')),
    });
    player.play(word, 'en');
    await flush();
    expect(deps.speak).toHaveBeenCalledWith('apple', 'en');
  });

  it('Ladefehler des Elements → Web Speech, Datei gilt danach als fehlend', () => {
    const { audio, deps, player } = setup();
    player.play(word, 'fr');
    audio.onerror?.();
    expect(deps.speak).toHaveBeenCalledTimes(1);
    player.play(word, 'fr');
    expect(deps.speak).toHaveBeenCalledTimes(2);
    expect(audio.play).toHaveBeenCalledTimes(1);
  });

  it('abgebrochene Wiedergabe (AbortError) ist kein Fehler', async () => {
    const { deps, player } = setup({
      play: () => Promise.reject(new DOMException('abgebrochen', 'AbortError')),
    });
    player.play(word, 'en');
    await flush();
    expect(deps.speak).not.toHaveBeenCalled();
  });

  it('stop hält Datei und Sprachausgabe an', () => {
    const { audio, deps, player } = setup();
    player.play(word, 'en');
    player.stop();
    expect(audio.pause).toHaveBeenCalledTimes(2);
    expect(deps.stopSpeaking).toHaveBeenCalledTimes(2);
  });

  it('Sprache ohne MP3s: direkt Web Speech, nichts vorladen', async () => {
    const { audio, deps, player } = setup({ hasFiles: (lang) => lang !== 'en' });
    await player.preload('en', ['apfel', 'hund']);
    expect(deps.fetchFile).not.toHaveBeenCalled();
    player.play(word, 'en');
    expect(deps.speak).toHaveBeenCalledWith('apple', 'en');
    expect(deps.createAudio).not.toHaveBeenCalled();
    expect(audio.play).not.toHaveBeenCalled();
  });

  it('Standard: Englisch und Französisch mit MP3s (B-64)', () => {
    expect(LANGUAGE_INFO.fr.audioFiles).toBe(true);
    expect(LANGUAGE_INFO.en.audioFiles).toBe(true);
  });

  it('stop ohne vorheriges Abspielen wirft nicht', () => {
    const { player } = setup();
    expect(() => player.stop()).not.toThrow();
  });
});
