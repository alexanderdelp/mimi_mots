// Persistenz in localStorage (anforderungen.md §7): ein Schlüssel, versioniert.
// Kaputte oder fehlende Daten führen nie zum Absturz, sondern zu Defaults.
// B-97: Alle Daten gehören zu einem Kind (`children`, Platz für weitere – B-90); ids und
// Zeitstempel so, dass die Kinder später 1 : 1 als Zeilen in Supabase passen. Daten älterer
// Versionen (`mimi-mots:v1`) werden nicht übernommen – eine neue Version darf sie verwerfen.
import { COMPANIONS, type Companion } from './components/avatar';
import { hasVocabulary, vocabularyIds } from './data/vocabulary';
import type { Language } from './data/words';
import type { Store } from './state';
import { isUuid, newId } from './uuid';

export const STORAGE_KEY = 'mimi-mots:v2';
const VERSION = 2;
/** B-97: Länge des Namens – passt so in die Kopfleiste (1024 px, iPhone). */
export const NAME_MAX = 16;

export const LANGUAGES: readonly Language[] = ['en', 'fr', 'ja', 'it'];
/** B-93: Dauer einer Runde in Minuten (Standard), im Elternbereich einstellbar. */
export const ROUND_MIN = 5;
export const ROUND_MIN_LOWEST = 3;
export const ROUND_MIN_HIGHEST = 10;
/** B-89: Lernmodus – Sprechen (Bild → Fremdwort) oder Hören (Fremdwort → Bild). */
export const MODES = ['speak', 'listen'] as const;
export type Mode = (typeof MODES)[number];

export const MAX_BOX = 4;

export interface Settings {
  companion: Companion | null;
  language: Language | null;
  mode: Mode | null;
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

/** B-65: Nach einer Runde schläft der Begleiter – bis zum nächsten Tag (`since`: lokales Datum
 *  JJJJ-MM-TT des Einschlafens). */
export interface Rest {
  sleeping: Companion[];
  since: string | null;
}

/** Daten eines Kinds (B-97) – bis B-96 der ganze gespeicherte Stand. */
export interface ChildData {
  /** B-97: Name des Kinds; null, solange er noch nicht gefragt wurde. */
  name: string | null;
  settings: Settings;
  /** Lernstand der Sprechrunde. */
  progress: Progress;
  /** B-89: Lernstand der Hörrunde, getrennt von der Sprechrunde. */
  listenProgress: Progress;
  rest: Rest;
  /** B-73: im Elternbereich aktivierte Sprachen (mindestens eine). */
  enabledLanguages: Language[];
  /** B-74: Tutorial der Lernrunde schon gesehen (im Elternbereich zurücksetzbar). */
  tutorialDone: boolean;
  /** B-89: Tutorial der Hörrunde schon gesehen. */
  listenTutorialDone: boolean;
  /** B-82: keine neuen Wörter, solange viele auf „noch üben“ stehen (Schalter im Elternbereich). */
  brakeNew: boolean;
  /** B-88: ausgeschaltete Wörter – kommen in der Lernrunde nicht vor, ihr Lernstand bleibt. */
  disabledWords: DisabledWords;
  /** B-93: Dauer einer Runde in Minuten (3 bis 10), gilt für beide Modi. */
  roundMin: number;
}

/** Ein Kind mit id (UUID) und Zeitstempeln (ISO) – später eine Zeile in Supabase. */
export interface Child extends ChildData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Der gespeicherte Stand (B-97): alle Kinder, eines davon ist aktiv. */
export interface AppData {
  version: typeof VERSION;
  activeChildId: string;
  children: Child[];
}

/** Standard: Englisch und Französisch aktiv, Japanisch und Italienisch aus (B-73/B-80). */
const DEFAULT_ENABLED_LANGUAGES: readonly Language[] = ['en', 'fr'];

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

/** Erststart: nur der Modus ist vorbelegt (anforderungen.md §3.1). */
export function childDefaults(): ChildData {
  return {
    name: null,
    settings: { companion: null, language: null, mode: 'speak' },
    progress: { en: {}, fr: {}, ja: {}, it: {} },
    listenProgress: { en: {}, fr: {}, ja: {}, it: {} },
    rest: { sleeping: [], since: null },
    enabledLanguages: withWords(DEFAULT_ENABLED_LANGUAGES),
    tutorialDone: false,
    listenTutorialDone: false,
    brakeNew: true,
    disabledWords: { en: [], fr: [], ja: [], it: [] },
    roundMin: ROUND_MIN,
  };
}

/** Neues Kind mit Standarddaten. */
export function newChild(now: Date = new Date(), data: ChildData = childDefaults()): Child {
  const at = now.toISOString();
  return { id: newId(), ...data, createdAt: at, updatedAt: at };
}

/** Erststart: ein Kind ohne Namen. */
export function defaults(now: Date = new Date()): AppData {
  const child = newChild(now);
  return { version: VERSION, activeChildId: child.id, children: [child] };
}

/** Das aktive Kind (gibt es immer – sanitize stellt das sicher). */
export function activeChild(data: AppData): Child {
  return data.children.find((c) => c.id === data.activeChildId) ?? data.children[0];
}

/** Nur die Daten eines Kinds, ohne id und Zeitstempel (für den App-State). */
export function childData(child: Child): ChildData {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, createdAt, updatedAt, ...data } = child;
  return data;
}

/** Ersetzt die Daten des aktiven Kinds und setzt `updatedAt`. */
export function withActiveChildData(data: AppData, child: ChildData, now: Date): AppData {
  const active = activeChild(data);
  return {
    ...data,
    children: data.children.map((c) =>
      c === active
        ? { id: c.id, ...child, createdAt: c.createdAt, updatedAt: now.toISOString() }
        : c,
    ),
  };
}

/** B-97: Name aufräumen – Leerraum am Rand weg, innen ein Leerzeichen, keine Steuerzeichen,
 *  höchstens NAME_MAX Zeichen; leer → null. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const name = Array.from(text).slice(0, NAME_MAX).join('').trim();
  return name === '' ? null : name;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function oneOf<T>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function sanitizeSettings(raw: unknown): Settings {
  const d = childDefaults().settings;
  if (!isObject(raw)) return d;
  return {
    companion: oneOf<Companion | null>([...COMPANIONS, null], raw.companion, d.companion),
    language: oneOf<Language | null>([...LANGUAGES, null], raw.language, d.language),
    mode: oneOf<Mode | null>([...MODES, null], raw.mode, d.mode),
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
  if (!isObject(raw)) return childDefaults().rest;
  return {
    sleeping: subsetOf(COMPANIONS, raw.sleeping), // `usedDurations` (bis B-89) fällt weg
    since: typeof raw.since === 'string' && DAY.test(raw.since) ? raw.since : null,
  };
}

/** B-93: ganze Minuten von 3 bis 10; alles andere (auch fehlend) → 5. */
export function isRoundMin(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= ROUND_MIN_LOWEST &&
    (value as number) <= ROUND_MIN_HIGHEST
  );
}

function sanitizeEnabled(raw: unknown): Language[] {
  return withWords(subsetOf(LANGUAGES, raw));
}

/** Nur Wörter des Wortschatzes (B-84); sind alle einer Sprache aus, sind alle wieder an. */
function sanitizeDisabled(raw: unknown): DisabledWords {
  const disabled = childDefaults().disabledWords;
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
  const progress = childDefaults().progress;
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

/** Prüft die Daten eines Kinds; Ungültiges wird einzeln durch den Standard ersetzt. */
export function sanitizeChild(raw: unknown): ChildData {
  if (!isObject(raw)) return childDefaults();
  return {
    name: cleanName(raw.name),
    settings: sanitizeSettings(raw.settings),
    progress: sanitizeProgress(raw.progress),
    listenProgress: sanitizeProgress(raw.listenProgress),
    rest: sanitizeRest(raw.rest),
    enabledLanguages: sanitizeEnabled(raw.enabledLanguages),
    tutorialDone: raw.tutorialDone === true,
    listenTutorialDone: raw.listenTutorialDone === true,
    brakeNew: raw.brakeNew !== false, // fehlt bei älteren Daten → an
    disabledWords: sanitizeDisabled(raw.disabledWords), // fehlt bei älteren Daten → alle an
    roundMin: isRoundMin(raw.roundMin) ? raw.roundMin : ROUND_MIN, // fehlt bei älteren Daten → 5
  };
}

const isTime = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/**
 * Prüft gespeicherte Daten (Version 2) und liefert einen gültigen Stand – oder null, wenn sie
 * unbrauchbar sind (dann gilt der Standard). Ungültige ids werden neu vergeben,
 * ungültige Zeitstempel auf jetzt gesetzt, doppelte ids verworfen.
 */
export function sanitize(raw: unknown, now: Date = new Date()): AppData | null {
  if (!isObject(raw) || raw.version !== VERSION || !Array.isArray(raw.children)) return null;
  const at = now.toISOString();
  const children: Child[] = [];
  for (const item of raw.children) {
    if (!isObject(item)) continue;
    const id = isUuid(item.id) ? item.id.toLowerCase() : newId();
    if (children.some((c) => c.id === id)) continue;
    children.push({
      id,
      ...sanitizeChild(item),
      createdAt: isTime(item.createdAt) ? item.createdAt : at,
      updatedAt: isTime(item.updatedAt) ? item.updatedAt : at,
    });
  }
  if (children.length === 0) return null;
  const wanted = typeof raw.activeChildId === 'string' ? raw.activeChildId.toLowerCase() : '';
  const active = children.find((c) => c.id === wanted) ?? children[0];
  return { version: VERSION, activeChildId: active.id, children };
}

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Liest den Stand; fehlt er oder ist er unbrauchbar, gilt der Erststart. */
export function load(storage: Storage | null = getStorage(), now: Date = new Date()): AppData {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    return (text && sanitize(JSON.parse(text), now)) || defaults(now);
  } catch {
    return defaults(now);
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

/** Speichert die Daten, sobald sie sich im Store ändern (z. B. neue Auswahl, Lernstand).
 *  Der Store kennt nur das aktive Kind; es wird in `stored` (alle Kinder) eingesetzt. */
export function persistOnChange(
  store: Pick<Store, 'subscribe'>,
  stored: AppData,
  write: (data: AppData) => boolean = save,
  now: () => Date = () => new Date(),
): () => void {
  let current = stored;
  return store.subscribe((state, previous) => {
    if (state.data === previous.data) return;
    current = withActiveChildData(current, state.data, now());
    write(current);
  });
}
