// B-109: Blumen (Samen bis Blüte) aus assets/blumen.png, zerschnitten per `npm run flowers`.
// Im Elternbereich wird eingestellt, welche Samen zur Verfügung stehen; wo die Blumen in der App
// erscheinen (das Kind wählt), kommt später.

export const FLOWERS = ['sunflower', 'peony', 'clematis'] as const;
export type Flower = (typeof FLOWERS)[number];

/** Wachstum: Samen, eingepflanzt, Keimling, Pflanze, Knospe, Blüte. */
export const FLOWER_STAGES = ['seed', 'planted', 'sprout', 'plant', 'bud', 'bloom'] as const;
export type FlowerStage = (typeof FLOWER_STAGES)[number];

/** Namen nur für Screenreader. */
export const FLOWER_NAMES: Record<Flower, string> = {
  sunflower: 'Sonnenblume',
  peony: 'Pfingstrose',
  clematis: 'Stern-Clematis',
};

export function flowerUrl(flower: Flower, stage: FlowerStage): string {
  return `${import.meta.env.BASE_URL}flowers/${flower}_${stage}.webp`;
}
