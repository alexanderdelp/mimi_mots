// B-78: Stimmwahl – Speichern einer Auswahl über den Dev-Server (vite.config.ts). Reine Funktionen
// für Auswahl-Datei und Hörprüfliste, dazu das Übernehmen in die App (Dateisystem).
// B-85: „keins“ (null) – kein Kandidat taugt; das Wort fehlt dann im Wortschatz der Sprache (B-84).
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAudioCheck, type CheckLanguage } from './audio-check-status';

export type Variant = 'word' | 'dot';
export interface Choice {
  voice: string;
  variant: Variant;
}
export type Choices = Partial<Record<CheckLanguage, Record<string, Choice | null>>>;

/** Spalte des „ok“-Kästchens je Sprache in audio-check.md (nach dem führenden „|“). */
const OK_CELL: Record<CheckLanguage, number> = { en: 3, fr: 5, ja: 7, it: 9 };

/** Kandidaten-Ordner `<stimme>-<variante>` gibt es je Sprache in tools/stimmwahl/<lang>/. */
const VARIANTS = ['word', 'dot'];

/** Neue Auswahl-Datei mit der Wahl für ein Wort; Wörter alphabetisch für ruhige Diffs. */
export function applyChoice(
  choices: Choices,
  lang: CheckLanguage,
  id: string,
  choice: Choice | null,
): Choices {
  const words = { ...(choices[lang] ?? {}), [id]: choice };
  const sorted = Object.fromEntries(Object.entries(words).sort(([a], [b]) => a.localeCompare(b)));
  return { ...choices, [lang]: sorted };
}

/** Hakt ein Wort für eine Sprache in audio-check.md ab – wer auswählt, hat es gehört – oder
 *  nimmt den Haken weg („keins“). */
export function markChecked(
  markdown: string,
  id: string,
  lang: CheckLanguage,
  checked = true,
): string {
  return markdown
    .split('\n')
    .map((line) => {
      if (!line.startsWith(`| ${id} |`)) return line;
      const cells = line.split('|');
      cells[OK_CELL[lang] + 1] = checked ? ' [x] ' : ' [ ] ';
      return cells.join('|');
    })
    .join('\n');
}

export interface StoreFiles {
  root: string;
  choices: string;
  check: string;
  candidates: string;
  audio: string;
}

export const defaultFiles = (root: string): StoreFiles => ({
  root,
  choices: join(root, 'audio-choices.json'),
  check: join(root, 'audio-check.md'),
  candidates: join(root, 'tools', 'stimmwahl'),
  audio: join(root, 'public', 'audio'),
});

export function readChoices(files: StoreFiles): Choices {
  return existsSync(files.choices) ? JSON.parse(readFileSync(files.choices, 'utf8')) : {};
}

/** Stand für die Seite: gespeicherte Auswahl und je Wort, ob es in einer Sprache abgehakt ist. */
export function readState(files: StoreFiles) {
  const rows = parseAudioCheck(readFileSync(files.check, 'utf8'));
  const checked = Object.fromEntries([...rows].map(([id, row]) => [id, row.checked]));
  return { choices: readChoices(files), checked };
}

/**
 * Übernimmt einen Kandidaten in die App: Datei kopieren, Wahl merken, Hörprüfliste abhaken.
 * `null` („keins“): App-Datei löschen, „keins“ merken, Haken entfernen.
 */
export function choose(
  files: StoreFiles,
  lang: CheckLanguage,
  id: string,
  choice: Choice | null,
): Choices {
  if (!(lang in OK_CELL) || !/^[a-z]+$/.test(id)) throw new Error('ungültig');
  const target = join(files.audio, lang, `${id}.mp3`);
  if (choice === null) {
    rmSync(target, { force: true });
  } else {
    if (!/^[a-z0-9_-]+$/i.test(choice.voice) || !VARIANTS.includes(choice.variant)) {
      throw new Error('ungültig');
    }
    const source = join(files.candidates, lang, `${choice.voice}-${choice.variant}`, `${id}.mp3`);
    if (!existsSync(source)) throw new Error(`Kandidat fehlt: ${source}`);
    copyFileSync(source, target);
  }
  const choices = applyChoice(readChoices(files), lang, id, choice);
  writeFileSync(files.choices, JSON.stringify(choices, null, 2) + '\n');
  const check = markChecked(readFileSync(files.check, 'utf8'), id, lang, choice !== null);
  writeFileSync(files.check, check);
  return choices;
}
