// Wortauswahl nach Leitner (anforderungen.md §5). Reine Funktionen, Zufall injizierbar.
import type { WordProgress } from './storage';
import { MAX_BOX } from './storage';

/** Gewicht je Leitner-Box 0..4: Ungewusstes kommt öfter. */
export const BOX_WEIGHTS = [8, 5, 3, 2, 1] as const;
export const MAX_NEW_PER_SESSION = 6;
/** Takt für neue Wörter: jedes 3. Wort ist neu (2 bekannte, 1 neues), bis das Limit erreicht ist. */
export const NEW_INTERVAL = 3;
/** Ein Wort kommt frühestens nach so vielen anderen Wörtern wieder. */
export const MIN_GAP = 3;

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
 * - Neue Wörter (max. 6 pro Session): solange es weniger als 6 bekannte gibt, wird mit
 *   neuen aufgefüllt; sonst ist jedes 3. Wort neu (gemischt mit bekannten).
 * - Bekannte Wörter gewichtet nach Leitner-Box.
 * - Die letzten 3 Wörter sind ausgeschlossen; nur wenn sonst nichts übrig bleibt,
 *   kommt das am längsten nicht gezeigte Wort.
 */
export function pickNext(
  wordIds: readonly string[],
  progress: LanguageProgress,
  session: Session,
  rng: Rng = Math.random,
): { id: string; session: Session } {
  const recent = new Set(session.history.slice(-MIN_GAP));
  const known = wordIds.filter((id) => progress[id] && !recent.has(id));
  const fresh = wordIds.filter((id) => !progress[id] && !recent.has(id));
  const knownTotal = wordIds.filter((id) => progress[id]).length;
  const newAllowed = session.introduced.length < MAX_NEW_PER_SESSION && fresh.length > 0;
  const lastNew = session.introduced.at(-1);
  const sinceLastNew =
    lastNew === undefined
      ? session.history.length
      : session.history.length - session.history.lastIndexOf(lastNew) - 1;
  const newDue =
    knownTotal < MAX_NEW_PER_SESSION || known.length === 0 || sinceLastNew >= NEW_INTERVAL - 1;

  let id: string;
  if (newAllowed && newDue) {
    id = randomOf(fresh, rng);
  } else if (known.length > 0) {
    id = weightedPick(
      known.map((k) => ({ item: k, weight: BOX_WEIGHTS[progress[k].box] })),
      rng,
    );
  } else {
    id = leastRecent(wordIds, session.history);
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
