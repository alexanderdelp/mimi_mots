// B-112: Garten des Kindes. Nach einer abgeschlossenen Lernreise (Zeit abgelaufen, nicht per [×]
// abgebrochen) wählt das Kind einen Samen, wenn es noch keinen hat oder seine letzte Blume schon
// blüht. Sonst zählt die Runde für die wachsende Pflanze: alle 3–6 Runden (Zufall) eine Stufe,
// bis sie blüht. Nur das Abschließen zählt – nie „Wusste ich“ oder „Noch üben“ (Leitprinzip 1).
import { FLOWERS, FLOWER_STAGES, type Flower } from './data/flowers';

/** Eine Pflanze: Blume und Stufe (Index in FLOWER_STAGES, 1 = eingepflanzt … 5 = Blüte). */
export interface Plant {
  flower: Flower;
  stage: number;
}

/** Garten eines Kinds: Pflanzen in der Reihenfolge des Einpflanzens; die letzte wächst. */
export interface Garden {
  plants: Plant[];
  /** abgeschlossene Runden seit dem Einpflanzen bzw. der letzten Stufe */
  rounds: number;
  /** so viele Runden braucht die nächste Stufe (3–6) */
  need: number;
}

export const PLANTED = FLOWER_STAGES.indexOf('planted');
export const BLOOM = FLOWER_STAGES.indexOf('bloom');
export const NEED_MIN = 3;
export const NEED_MAX = 6;

export function emptyGarden(): Garden {
  return { plants: [], rounds: 0, need: NEED_MIN };
}

/** Die Pflanze, die gerade wächst bzw. zuletzt gepflanzt wurde. */
export function currentPlant(garden: Garden): Plant | null {
  return garden.plants.at(-1) ?? null;
}

/** Ein neuer Samen darf gewählt werden: noch keiner da, oder die letzte Blume blüht. */
export function canPlant(garden: Garden): boolean {
  const plant = currentPlant(garden);
  return plant === null || plant.stage >= BLOOM;
}

/** Zufällige Rundenzahl 3–6 – aus einem Zeitpunkt abgeleitet, damit der Reducer rein bleibt. */
export function rollNeed(at: string): number {
  let h = 2166136261;
  for (let i = 0; i < at.length; i++) h = Math.imul(h ^ at.charCodeAt(i), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return NEED_MIN + ((h >>> 0) % (NEED_MAX - NEED_MIN + 1));
}

export type Harvest = 'choose' | 'grew' | null;

/** Abgeschlossene Runde: Samenwahl anbieten oder die wachsende Pflanze eine Runde weiterbringen. */
export function completeRound(garden: Garden, at: string): { garden: Garden; harvest: Harvest } {
  if (canPlant(garden)) return { garden, harvest: 'choose' };
  const rounds = garden.rounds + 1;
  if (rounds < garden.need) return { garden: { ...garden, rounds }, harvest: null };
  const plants = garden.plants.map((p, i) =>
    i === garden.plants.length - 1 ? { ...p, stage: p.stage + 1 } : p,
  );
  return { garden: { plants, rounds: 0, need: rollNeed(at) }, harvest: 'grew' };
}

/** Samen einpflanzen (nur, wenn gerade erlaubt). */
export function plant(garden: Garden, flower: Flower, at: string): Garden {
  if (!canPlant(garden)) return garden;
  return { plants: [...garden.plants, { flower, stage: PLANTED }], rounds: 0, need: rollNeed(at) };
}

const withCurrent = (garden: Garden, change: Partial<Plant>): Plant[] =>
  garden.plants.map((p, i) => (i === garden.plants.length - 1 ? { ...p, ...change } : p));

/** B-114 (Elternbereich): aktuelle (zuletzt gepflanzte) Blume tauschen, mit `null` entfernen;
 *  ist der Garten leer, wird sie eingepflanzt. */
export function setCurrentFlower(garden: Garden, flower: Flower | null, at: string): Garden {
  const current = currentPlant(garden);
  if (flower === null) {
    if (!current) return garden;
    return { plants: garden.plants.slice(0, -1), rounds: 0, need: garden.need };
  }
  if (!current) return plant(garden, flower, at);
  if (current.flower === flower) return garden;
  return { ...garden, plants: withCurrent(garden, { flower }) };
}

/** B-114: Stufe der aktuellen Blume (eingepflanzt bis Blüte); mit der Blüte ist sie fertig. */
export function setCurrentStage(garden: Garden, stage: number): Garden {
  const current = currentPlant(garden);
  if (!current || !Number.isInteger(stage) || stage < PLANTED || stage > BLOOM) return garden;
  if (stage === current.stage) return garden;
  const rounds = stage === BLOOM ? 0 : garden.rounds;
  return { ...garden, plants: withCurrent(garden, { stage }), rounds };
}

/** B-114: abgeschlossene Runden auf der aktuellen Stufe (0 bis need − 1); nicht nach der Blüte. */
export function setCurrentRounds(garden: Garden, rounds: number): Garden {
  if (canPlant(garden) || !Number.isInteger(rounds)) return garden;
  if (rounds < 0 || rounds >= garden.need || rounds === garden.rounds) return garden;
  return { ...garden, rounds };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function sanitizePlant(raw: unknown): Plant | null {
  if (!isObject(raw)) return null;
  const { flower, stage } = raw;
  if (!FLOWERS.includes(flower as Flower)) return null;
  if (!Number.isInteger(stage) || (stage as number) < PLANTED || (stage as number) > BLOOM) {
    return null;
  }
  return { flower: flower as Flower, stage: stage as number };
}

/** Gespeicherten Garten prüfen; fehlt er (ältere Daten), ist er leer – kein Datenverlust. */
export function sanitizeGarden(raw: unknown): Garden {
  if (!isObject(raw)) return emptyGarden();
  const plants = Array.isArray(raw.plants)
    ? raw.plants.map(sanitizePlant).filter((p): p is Plant => p !== null)
    : [];
  const { rounds, need } = raw;
  const validNeed =
    Number.isInteger(need) && (need as number) >= NEED_MIN && (need as number) <= NEED_MAX;
  return {
    plants,
    rounds: Number.isInteger(rounds) && (rounds as number) >= 0 ? (rounds as number) : 0,
    need: validNeed ? (need as number) : NEED_MIN,
  };
}
