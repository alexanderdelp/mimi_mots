import { afterEach, describe, expect, it, vi } from 'vitest';
import { SPEECH_LANG, pickVoice, speak, stopSpeaking } from '../src/audio';

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
