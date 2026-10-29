// Persistenz in localStorage (anforderungen.md §7): ein Schlüssel, versioniert.
// Kaputte oder fehlende Daten führen nie zum Absturz, sondern zu Defaults.
import { COMPANIONS, type Companion } from './components/avatar';
import type { Language } from './data/words';
import type { Store } from './state';

export const STORAGE_KEY = 'mimi-mots:v1';
export const VERSION = 1;

export const LANGUAGES: readonly Language[] = ['en', 'fr'];
export const DURATIONS = [5] as const;
export type DurationMin = (typeof DURATIONS)[number];

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

export interface AppData {
  version: typeof VERSION;
  settings: Settings;
  progress: Progress;
}

/** Erststart: nur die Dauer ist vorbelegt (anforderungen.md §3.1). */
export function defaults(): AppData {
  return {
    version: VERSION,
    settings: { companion: null, language: null, durationMin: 5 },
    progress: { en: {}, fr: {} },
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
    durationMin: oneOf<DurationMin | null>([...DURATIONS, null], raw.durationMin, d.durationMin),
  };
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
