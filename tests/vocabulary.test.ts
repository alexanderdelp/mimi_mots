// B-84: Wortschatz je Sprache – nur Wörter mit gewählter Aufnahme.
import { describe, expect, it } from 'vitest';
import choices from '../audio-choices.json';
import { vocabulary, vocabularyFrom } from '../src/data/vocabulary';
import { WORDS } from '../src/data/words';
import { LANGUAGES } from '../src/storage';

describe('Wortschatz (B-84)', () => {
  const choice = { voice: 'voicevox-himari', variant: 'word' };

  it('AT-84.1: nur gewählte Wörter; „keins“ (null) und offene fehlen', () => {
    const words = vocabularyFrom({ ja: { katze: choice, hund: null, apfel: choice } }, 'ja');
    expect(words.map((w) => w.id)).toEqual(['apfel', 'katze']); // Reihenfolge der Wortliste
    expect(vocabularyFrom({}, 'ja')).toEqual([]);
  });

  it.each(LANGUAGES)('AT-84.1: %s entspricht audio-choices.json', (lang) => {
    const chosen = (choices as Record<string, Record<string, unknown>>)[lang] ?? {};
    expect(vocabulary(lang).map((w) => w.id)).toEqual(
      WORDS.filter((w) => chosen[w.id] != null).map((w) => w.id),
    );
  });
});
