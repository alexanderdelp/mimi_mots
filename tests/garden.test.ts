import { describe, expect, it } from 'vitest';
import {
  BLOOM,
  NEED_MAX,
  NEED_MIN,
  PLANTED,
  canPlant,
  completeRound,
  emptyGarden,
  plant,
  rollNeed,
  setCurrentFlower,
  setCurrentRounds,
  setCurrentStage,
  type Garden,
} from '../src/garden';

const AT = '2026-11-08T10:00:00.000Z';

describe('rollNeed (B-112)', () => {
  it('liefert 3 bis 6, für denselben Zeitpunkt immer gleich', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const at = new Date(Date.UTC(2026, 10, 8, 10, 0, i)).toISOString();
      const need = rollNeed(at);
      expect(need).toBeGreaterThanOrEqual(NEED_MIN);
      expect(need).toBeLessThanOrEqual(NEED_MAX);
      expect(rollNeed(at)).toBe(need);
      seen.add(need);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]); // alle Werte kommen vor
  });
});

describe('Garten (B-112)', () => {
  it('ohne Pflanze: Samenwahl, nichts zählt', () => {
    const garden = emptyGarden();
    expect(canPlant(garden)).toBe(true);
    expect(completeRound(garden, AT)).toEqual({ garden, harvest: 'choose' });
  });

  it('einpflanzen: Stufe „eingepflanzt“, neue Rundenzahl 3–6', () => {
    const garden = plant(emptyGarden(), 'peony', AT);
    expect(garden.plants).toEqual([{ flower: 'peony', stage: PLANTED }]);
    expect(garden.rounds).toBe(0);
    expect(garden.need).toBe(rollNeed(AT));
    expect(canPlant(garden)).toBe(false);
    expect(plant(garden, 'sunflower', AT)).toBe(garden); // wächst noch → kein zweiter Samen
  });

  it('wächst nach `need` abgeschlossenen Runden eine Stufe', () => {
    let garden: Garden = { plants: [{ flower: 'sunflower', stage: PLANTED }], rounds: 0, need: 4 };
    for (let i = 1; i < 4; i++) {
      const result = completeRound(garden, AT);
      expect(result.harvest).toBeNull();
      expect(result.garden.rounds).toBe(i);
      garden = result.garden;
    }
    const grown = completeRound(garden, AT);
    expect(grown.harvest).toBe('grew');
    expect(grown.garden.plants[0].stage).toBe(PLANTED + 1);
    expect(grown.garden.rounds).toBe(0);
    expect(grown.garden.need).toBe(rollNeed(AT));
  });

  it('nur die letzte Pflanze wächst; blüht sie, kommt nach der nächsten Runde die Wahl', () => {
    const garden: Garden = {
      plants: [
        { flower: 'sunflower', stage: BLOOM },
        { flower: 'clematis', stage: BLOOM - 1 },
      ],
      rounds: 2,
      need: 3,
    };
    const bloomed = completeRound(garden, AT);
    expect(bloomed.harvest).toBe('grew');
    expect(bloomed.garden.plants).toEqual([
      { flower: 'sunflower', stage: BLOOM },
      { flower: 'clematis', stage: BLOOM },
    ]);
    const next = completeRound(bloomed.garden, AT);
    expect(next.harvest).toBe('choose');
    expect(next.garden).toBe(bloomed.garden); // blüht weiter, wächst nicht über die Blüte hinaus
    const replanted = plant(next.garden, 'peony', AT);
    expect(replanted.plants).toHaveLength(3);
    expect(replanted.plants[2]).toEqual({ flower: 'peony', stage: PLANTED });
  });
});

describe('Einstellen im Elternbereich (B-114)', () => {
  const growing: Garden = {
    plants: [
      { flower: 'sunflower', stage: BLOOM },
      { flower: 'clematis', stage: 2 },
    ],
    rounds: 1,
    need: 4,
  };
  const done: Garden = { ...growing, rounds: 0, plants: [growing.plants[0]] };

  it('aktuelle Blume tauschen, entfernen; im leeren Garten einpflanzen', () => {
    const swapped = setCurrentFlower(growing, 'peony', AT);
    expect(swapped.plants[1]).toEqual({ flower: 'peony', stage: 2 });
    expect(swapped.rounds).toBe(1);
    expect(setCurrentFlower(growing, 'clematis', AT)).toBe(growing);
    const removed = setCurrentFlower(growing, null, AT);
    expect(removed.plants).toEqual([{ flower: 'sunflower', stage: BLOOM }]);
    expect(removed.rounds).toBe(0);
    expect(setCurrentFlower(done, 'peony', AT).plants).toEqual([{ flower: 'peony', stage: BLOOM }]);
    expect(setCurrentFlower(emptyGarden(), null, AT)).toEqual(emptyGarden());
    const planted = setCurrentFlower(emptyGarden(), 'peony', AT);
    expect(planted.plants).toEqual([{ flower: 'peony', stage: PLANTED }]);
    expect(planted).toMatchObject({ rounds: 0, need: rollNeed(AT) });
  });

  it('Stufe von eingepflanzt bis Blüte; mit der Blüte ist sie fertig, zurück geht auch', () => {
    expect(setCurrentStage(growing, 4).plants[1].stage).toBe(4);
    expect(setCurrentStage(growing, 4).rounds).toBe(1);
    const bloomed = setCurrentStage(growing, BLOOM);
    expect(bloomed.rounds).toBe(0);
    expect(canPlant(bloomed)).toBe(true);
    expect(canPlant(setCurrentStage(done, 3))).toBe(false);
    for (const bad of [0, BLOOM + 1, 2.5]) expect(setCurrentStage(growing, bad)).toBe(growing);
    expect(setCurrentStage(emptyGarden(), 2)).toEqual(emptyGarden());
  });

  it('Runden von 0 bis need − 1, nicht nach der Blüte', () => {
    expect(setCurrentRounds(growing, 3).rounds).toBe(3);
    expect(setCurrentRounds(growing, 0).rounds).toBe(0);
    for (const bad of [-1, 4, 1.5]) expect(setCurrentRounds(growing, bad)).toBe(growing);
    expect(setCurrentRounds(done, 1)).toBe(done);
    expect(completeRound(setCurrentRounds(growing, 3), AT).harvest).toBe('grew');
  });
});
