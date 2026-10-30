// Wortauswahl nach Leitner (anforderungen.md §5). Reine Funktionen, Zufall injizierbar.
import type { WordProgress } from './storage';
import { MAX_BOX } from './storage';

/** Gewicht je Leitner-Box 0..4: Ungewusstes kommt öfter. */
export const BOX_WEIGHTS = [8, 5, 3, 2, 1] as const;
/** Höchstens so viele neue Wörter pro Session (B-70: 8 statt 6). */
export const MAX_NEW_PER_SESSION = 8;
/** Solange weniger Wörter bekannt sind, kommen nur neue (Startphase). */
export const START_NEW = 6;
/** Takt für neue Wörter: jedes 3. Wort ist neu (2 bekannte, 1 neues), bis das Limit erreicht ist. */
export const NEW_INTERVAL = 3;
/** Ein Wort kommt frühestens nach so vielen anderen Wörtern wieder (B-70: 6 statt 3) … */
export const MAX_GAP = 6;
/** … aber nie weniger als 3, und es bleiben immer mindestens 3 bekannte Wörter zur Auswahl,
 *  damit die Gewichtung nach Stufe auch bei kleinem Wortschatz wirkt. */
export const MIN_GAP = 3;
export const MIN_CHOICES = 3;
/** B-82: Bremse – ab so vielen Wörtern auf Stufe 0 („noch üben“) kommen keine neuen dazu. */
export const BRAKE_AT = 6;

/** Pause (Anzahl anderer Wörter) bei `knownTotal` bekannten Wörtern. */
export function gapFor(knownTotal: number): number {
  return Math.min(MAX_GAP, Math.max(MIN_GAP, knownTotal - MIN_CHOICES));
}

export type Rng = () => number;
export type Rating = 'known' | 'practice';
export type LanguageProgress = Readonly<Record<string, WordProgress>>;

export interface Session {
  /** Bisher gezeigte Wort-ids in Reihenfolge. */
  readonly history: readonly string[];
  /** In dieser Session neu eingeführte Wort-ids. */
  readonly introduced: readonly string[];
}

export function createSession(): Session {
  return { history: [], introduced: [] };
}

/** Deterministischer Zufallsgenerator (mulberry32) für Tests und reproduzierbare Abläufe. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wählt gewichtet zufällig ein Element. */
export function weightedPick<T>(items: readonly { item: T; weight: number }[], rng: Rng): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let r = rng() * total;
  for (const { item, weight } of items) {
    r -= weight;
    if (r < 0) return item;
  }
  return items[items.length - 1].item;
}

function randomOf<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/**
 * Bestimmt das nächste Wort und den neuen Session-Stand.
 * - Neue Wörter (max. 8 pro Session): solange es weniger als 6 bekannte gibt, wird mit
 *   neuen aufgefüllt; sonst ist jedes 3. Wort neu (gemischt mit bekannten).
 * - Bekannte Wörter gewichtet nach Leitner-Box.
 * - Die letzten 3–6 Wörter sind ausgeschlossen (siehe `gapFor`); nur wenn sonst nichts übrig
 *   bleibt, kommt das am längsten nicht gezeigte Wort.
 * - Bremse (B-82): Stehen mindestens 6 Wörter auf Stufe 0, kommen keine neuen dazu; das wird bei
 *   jedem Wort neu geprüft, so kommen neue wieder, sobald genug gefestigt ist.
 */
export function pickNext(
  wordIds: readonly string[],
  progress: LanguageProgress,
  session: Session,
  rng: Rng = Math.random,
  /** B-82: Bremse für neue Wörter eingeschaltet (Elternbereich). */
  brake = false,
): { id: string; session: Session } {
  const knownTotal = wordIds.filter((id) => progress[id]).length;
  const practicing = wordIds.filter((id) => progress[id]?.box === 0).length;
  const knownOnly = brake && practicing >= BRAKE_AT;
  const recent = new Set(session.history.slice(-gapFor(knownTotal)));
  const known = wordIds.filter((id) => progress[id] && !recent.has(id));
  const fresh = wordIds.filter((id) => !progress[id] && !recent.has(id));
  const newAllowed =
    !knownOnly && session.introduced.length < MAX_NEW_PER_SESSION && fresh.length > 0;
  const lastNew = session.introduced.at(-1);
  const sinceLastNew =
    lastNew === undefined
      ? session.history.length
      : session.history.length - session.history.lastIndexOf(lastNew) - 1;
  const newDue = knownTotal < START_NEW || known.length === 0 || sinceLastNew >= NEW_INTERVAL - 1;

  let id: string;
  if (newAllowed && newDue) {
    id = randomOf(fresh, rng);
  } else if (known.length > 0) {
    id = weightedPick(
      known.map((k) => ({ item: k, weight: BOX_WEIGHTS[progress[k].box] })),
      rng,
    );
  } else {
    // nur wenn sonst nichts übrig bleibt; bei Bremse unter den bekannten
    const pool = knownOnly && knownTotal > 0 ? wordIds.filter((w) => progress[w]) : wordIds;
    id = leastRecent(pool, session.history);
  }

  const isNew = !progress[id] && !session.introduced.includes(id);
  return {
    id,
    session: {
      history: [...session.history, id],
      introduced: isNew ? [...session.introduced, id] : session.introduced,
    },
  };
}

/** Wort, das am längsten nicht (oder nie) in dieser Session gezeigt wurde. */
function leastRecent(wordIds: readonly string[], history: readonly string[]): string {
  let best = wordIds[0];
  let bestIndex = Infinity;
  for (const id of wordIds) {
    const index = history.lastIndexOf(id);
    if (index < bestIndex) {
      best = id;
      bestIndex = index;
    }
  }
  return best;
}

/** Aktualisiert den Lernstand nach der Selbsteinschätzung; die Eingabe bleibt unverändert. */
export function applyRating(
  progress: LanguageProgress,
  id: string,
  rating: Rating,
  now: Date = new Date(),
): Record<string, WordProgress> {
  const current = progress[id];
  const box = rating === 'known' ? Math.min((current?.box ?? 0) + 1, MAX_BOX) : 0;
  return {
    ...progress,
    [id]: { box, seen: (current?.seen ?? 0) + 1, lastSeenAt: now.toISOString() },
  };
}
