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
