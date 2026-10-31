// Persistenz in localStorage (anforderungen.md §7): ein Schlüssel, versioniert.
// Kaputte oder fehlende Daten führen nie zum Absturz, sondern zu Defaults.
import { COMPANIONS, type Companion } from './components/avatar';
import { hasVocabulary, vocabularyIds } from './data/vocabulary';
import type { Language } from './data/words';
import type { Store } from './state';

export const STORAGE_KEY = 'mimi-mots:v1';
export const VERSION = 1;

export const LANGUAGES: readonly Language[] = ['en', 'fr', 'ja', 'it'];
export const DURATIONS = [3, 7] as const;
export type DurationMin = (typeof DURATIONS)[number];
/** Frühere Dauern (bis B-27) → heutige Entsprechung, damit die Auswahl erhalten bleibt. */
const LEGACY_DURATIONS: Record<number, DurationMin> = { 5: 3, 10: 7 };

export const MAX_BOX = 4;

export interface Settings {
  companion: Companion | null;
  language: Language | null;
  durationMin: DurationMin | null;
}

export interface WordProgress {
  /** Leitner-Box 0..4 */
  box: number;
  seen: number;
  /** ISO-Zeitstempel */
  lastSeenAt: string;
}

export type Progress = Record<Language, Record<string, WordProgress>>;

/** B-88: im Elternbereich ausgeschaltete Wörter je Sprache (Wort-ids). */
export type DisabledWords = Record<Language, string[]>;

/** B-65: Nach einer Runde schläft der Begleiter und die Dauer ist verbraucht – bis zum
 *  nächsten Tag (`since`: lokales Datum JJJJ-MM-TT des Einschlafens). */
export interface Rest {
  sleeping: Companion[];
  usedDurations: DurationMin[];
  since: string | null;
}

export interface AppData {
  version: typeof VERSION;
  settings: Settings;
  progress: Progress;
  rest: Rest;
  /** B-73: im Elternbereich aktivierte Sprachen (mindestens eine). */
  enabledLanguages: Language[];
  /** B-74: Tutorial der Lernrunde schon gesehen (im Elternbereich zurücksetzbar). */
  tutorialDone: boolean;
  /** B-82: keine neuen Wörter, solange viele auf „noch üben“ stehen (Schalter im Elternbereich). */
  brakeNew: boolean;
  /** B-88: ausgeschaltete Wörter – kommen in der Lernrunde nicht vor, ihr Lernstand bleibt. */
  disabledWords: DisabledWords;
}

/** Standard: Englisch und Französisch aktiv, Japanisch und Italienisch aus (B-73/B-80). */
export const DEFAULT_ENABLED_LANGUAGES: readonly Language[] = ['en', 'fr'];

/**
 * B-86: Eingeschaltet sein können nur Sprachen mit Wörtern (B-84), und mindestens eine ist an –
 * sonst stünde die Startseite ohne Sprache da. Fällt alles weg, gilt der Standard bzw. jede
 * Sprache mit Wörtern.
 */
export function withWords(enabled: readonly Language[]): Language[] {
  for (const candidate of [enabled, DEFAULT_ENABLED_LANGUAGES, LANGUAGES]) {
    const usable = LANGUAGES.filter((l) => candidate.includes(l) && hasVocabulary(l));
    if (usable.length > 0) return usable;
  }
  return [];
}

/** Erststart: nur die Dauer ist vorbelegt (anforderungen.md §3.1). */
export function defaults(): AppData {
  return {
    version: VERSION,
    settings: { companion: null, language: null, durationMin: 3 },
    progress: { en: {}, fr: {}, ja: {}, it: {} },
    rest: { sleeping: [], usedDurations: [], since: null },
    enabledLanguages: withWords(DEFAULT_ENABLED_LANGUAGES),
    tutorialDone: false,
    brakeNew: true,
    disabledWords: { en: [], fr: [], ja: [], it: [] },
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function oneOf<T>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function sanitizeSettings(raw: unknown): Settings {
  const d = defaults().settings;
  if (!isObject(raw)) return d;
  return {
    companion: oneOf<Companion | null>([...COMPANIONS, null], raw.companion, d.companion),
    language: oneOf<Language | null>([...LANGUAGES, null], raw.language, d.language),
    durationMin: oneOf<DurationMin | null>(
      [...DURATIONS, null],
      LEGACY_DURATIONS[raw.durationMin as number] ?? raw.durationMin,
      d.durationMin,
    ),
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Lokales Kalenderdatum als JJJJ-MM-TT (Tageswechsel um Mitternacht auf dem Gerät). */
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Nur bekannte Werte, jeder höchstens einmal, in fester Reihenfolge. */
function subsetOf<T>(allowed: readonly T[], raw: unknown): T[] {
  return Array.isArray(raw) ? allowed.filter((v) => raw.includes(v)) : [];
}

function sanitizeRest(raw: unknown): Rest {
  if (!isObject(raw)) return defaults().rest;
  return {
    sleeping: subsetOf(COMPANIONS, raw.sleeping),
    usedDurations: subsetOf(DURATIONS, raw.usedDurations),
    since: typeof raw.since === 'string' && DAY.test(raw.since) ? raw.since : null,
  };
}

function sanitizeEnabled(raw: unknown): Language[] {
  return withWords(subsetOf(LANGUAGES, raw));
}

/** Nur Wörter des Wortschatzes (B-84); sind alle einer Sprache aus, sind alle wieder an. */
function sanitizeDisabled(raw: unknown): DisabledWords {
  const disabled = defaults().disabledWords;
  if (!isObject(raw)) return disabled;
  for (const lang of LANGUAGES) {
    const ids = vocabularyIds(lang);
    const off = subsetOf(ids, raw[lang]);
    if (off.length < ids.length) disabled[lang] = off;
  }
  return disabled;
}

function sanitizeWordProgress(raw: unknown): WordProgress | null {
  if (!isObject(raw)) return null;
  const { box, seen, lastSeenAt } = raw;
  if (!Number.isInteger(box) || (box as number) < 0 || (box as number) > MAX_BOX) return null;
  if (!Number.isInteger(seen) || (seen as number) < 0) return null;
  if (typeof lastSeenAt !== 'string' || Number.isNaN(Date.parse(lastSeenAt))) return null;
  return { box: box as number, seen: seen as number, lastSeenAt };
}

function sanitizeProgress(raw: unknown): Progress {
  const progress = defaults().progress;
  if (!isObject(raw)) return progress;
  for (const lang of LANGUAGES) {
    const entries = raw[lang];
    if (!isObject(entries)) continue;
    for (const [id, value] of Object.entries(entries)) {
      const wp = sanitizeWordProgress(value);
      if (wp) progress[lang][id] = wp;
    }
  }
  return progress;
}

/** Prüft beliebige Daten und liefert immer einen gültigen Stand; Ungültiges wird verworfen. */
export function sanitize(raw: unknown): AppData {
  if (!isObject(raw) || raw.version !== VERSION) return defaults();
  return {
    version: VERSION,
    settings: sanitizeSettings(raw.settings),
    progress: sanitizeProgress(raw.progress),
    rest: sanitizeRest(raw.rest),
    enabledLanguages: sanitizeEnabled(raw.enabledLanguages),
    tutorialDone: raw.tutorialDone === true,
    brakeNew: raw.brakeNew !== false, // fehlt bei älteren Daten → an
    disabledWords: sanitizeDisabled(raw.disabledWords), // fehlt bei älteren Daten → alle an
  };
}

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function load(storage: Storage | null = getStorage()): AppData {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return text ? sanitize(JSON.parse(text)) : defaults();
  } catch {
    return defaults();
  }
}

/** Speichert den Stand; gibt false zurück, wenn der Speicher nicht verfügbar oder voll ist. */
export function save(data: AppData, storage: Storage | null = getStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Speichert die Daten, sobald sie sich im Store ändern (z. B. neue Auswahl, Lernstand). */
export function persistOnChange(
  store: Pick<Store, 'subscribe'>,
  write: (data: AppData) => boolean = save,
): () => void {
  return store.subscribe((state, previous) => {
    if (state.data !== previous.data) write(state.data);
  });
}
