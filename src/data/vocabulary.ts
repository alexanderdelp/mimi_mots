// B-84: Wortschatz je Sprache – nur Wörter, für die auf der Stimmwahl-Seite (tools/stimmwahl.html)
// eine Aufnahme gewählt wurde. „keins“ (null) und noch nicht entschiedene Wörter fehlen: lieber
// ein Wort weglassen als eine schlechte Aussprache anbieten.
import choices from '../../audio-choices.json';
import { LANGUAGE_INFO } from './languages';
import { WORDS, type Language, type Word } from './words';

type Choices = Partial<Record<Language, Record<string, unknown>>>;

/** Wörter einer Sprache mit gewählter Aufnahme, in der Reihenfolge der Wortliste. */
export function vocabularyFrom(all: Choices, language: Language): Word[] {
  const chosen = all[language] ?? {};
  return WORDS.filter((w) => chosen[w.id] != null);
}

const VOCABULARY = Object.fromEntries(
  (Object.keys(LANGUAGE_INFO) as Language[]).map((l) => [l, vocabularyFrom(choices as Choices, l)]),
) as Record<Language, Word[]>;

export function vocabulary(language: Language): readonly Word[] {
  return VOCABULARY[language];
}

export function vocabularyIds(language: Language): string[] {
  return VOCABULARY[language].map((w) => w.id);
}

/** Spielbar ist eine Sprache nur mit mindestens einem Wort. */
export function hasVocabulary(language: Language): boolean {
  return VOCABULARY[language].length > 0;
}
