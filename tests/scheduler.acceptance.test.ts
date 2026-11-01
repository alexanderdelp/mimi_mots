// @vitest-environment jsdom
// Akzeptanztests B-20: simulieren ganze Sessions mit dem echten Scheduler.
import { describe, expect, it } from 'vitest';
import { WORDS } from '../src/data/words';
import {
  BOX_WEIGHTS,
  MAX_GAP,
  MAX_NEW_PER_SESSION,
  NEW_INTERVAL,
  START_NEW,
  gapFor,
  applyRating,
  createSession,
  pickNext,
  seededRng,
  weightedPick,
  type LanguageProgress,
  type Rating,
  type Rng,
} from '../src/scheduler';

const IDS = WORDS.map((w) => w.id);
const NOW = new Date('2026-10-29T12:00:00.000Z');

/** Simuliert eine Session; bewertet jedes Wort zufällig (oder fest). */
function simulate(
  progress: LanguageProgress,
  picks: number,
  rng: Rng,
  rate: (rng: Rng) => Rating = (r) => (r() < 0.6 ? 'known' : 'practice'),
) {
  let session = createSession();
  let current = progress;
  for (let i = 0; i < picks; i++) {
    const next = pickNext(IDS, current, session, rng);
    session = next.session;
    current = applyRating(current, next.id, rate(rng), NOW);
  }
  return { session, progress: current };
}

/** Lernstand mit allen Wörtern, Box gleichmäßig 0..4 verteilt. */
function evenProgress(): LanguageProgress {
  return Object.fromEntries(
    IDS.map((id, i) => [id, { box: i % 5, seen: 3, lastSeenAt: NOW.toISOString() }]),
  );
}

describe('B-20 Scheduler – Akzeptanz', () => {
  it('AT-20.1: mindestens 3 andere Wörter vor einer Wiederholung', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const start = seed % 2 ? {} : evenProgress();
      const { session } = simulate(start, 60, seededRng(seed));
      const h = session.history;
      for (let i = 0; i < h.length; i++) {
        const window = h.slice(Math.max(0, i - 3), i);
        expect(window, `Seed ${seed}, Position ${i}`).not.toContain(h[i]);
      }
    }
  });

  it('AT-20.2/AT-70.3: höchstens 8 neue Wörter pro Session', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const rng = seededRng(seed);
      // unterschiedlich viel Vorwissen: 0 bis 49 bekannte Wörter
      const knownCount = seed % 50;
      const start: LanguageProgress = Object.fromEntries(
        IDS.slice(0, knownCount).map((id) => [
          id,
          { box: seed % 5, seen: 1, lastSeenAt: NOW.toISOString() },
        ]),
      );
      const { session } = simulate(start, 60, rng);
      expect(session.introduced.length).toBeLessThanOrEqual(MAX_NEW_PER_SESSION);
      const shownNew = new Set(session.history.filter((id) => !start[id]));
      expect(shownNew.size, `Seed ${seed}`).toBeLessThanOrEqual(MAX_NEW_PER_SESSION);
    }
  });

  it('AT-20.3/AT-70.3: erste Session beginnt mit 6 neuen Wörtern am Stück, dann bis 8 im Takt', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { session } = simulate({}, 40, seededRng(seed));
      const first = session.history.slice(0, START_NEW);
      expect(new Set(first).size).toBe(START_NEW);
      expect(session.introduced.slice(0, START_NEW)).toEqual(first);
      expect(session.introduced).toHaveLength(MAX_NEW_PER_SESSION);
      expect(new Set(session.history).size).toBe(MAX_NEW_PER_SESSION); // danach keine weiteren
    }
  });

  it('AT-70.1: Pause wächst mit dem Wortschatz', () => {
    expect([0, 3, 6, 7, 8, 9, 20, 61].map(gapFor)).toEqual([3, 3, 3, 4, 5, 6, 6, 6]);
  });

  it('AT-70.2: mit vielen bekannten Wörtern mindestens 6 andere vor einer Wiederholung', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { session } = simulate(evenProgress(), 60, seededRng(seed));
      const h = session.history;
      for (let i = 0; i < h.length; i++) {
        const window = h.slice(Math.max(0, i - MAX_GAP), i);
        expect(window, `Seed ${seed}, Position ${i}`).not.toContain(h[i]);
      }
    }
  });

  it('AT-20.4a: gewichtete Wahl im Verhältnis 8 : 5 : 3 : 2 : 1', () => {
    const rng = seededRng(42);
    const items = BOX_WEIGHTS.map((weight, box) => ({ item: box, weight }));
    const counts = [0, 0, 0, 0, 0];
    const n = 190_000;
    for (let i = 0; i < n; i++) counts[weightedPick(items, rng)]++;
    const total = BOX_WEIGHTS.reduce((a, b) => a + b, 0);
    BOX_WEIGHTS.forEach((w, box) => {
      const expected = (n * w) / total;
      expect(Math.abs(counts[box] - expected) / expected, `Box ${box}`).toBeLessThan(0.1);
    });
  });

  it('AT-20.4b: in ganzen Sessions kommen niedrigere Boxen häufiger', () => {
    const counts = [0, 0, 0, 0, 0];
    const start = evenProgress();
    for (let seed = 1; seed <= 200; seed++) {
      // Bewertung ändert die Boxen nicht, damit die Verteilung konstant bleibt
      let session = createSession();
      const rng = seededRng(seed);
      for (let i = 0; i < 40; i++) {
        const next = pickNext(IDS, start, session, rng);
        session = next.session;
        counts[start[next.id].box]++;
      }
    }
    for (let box = 0; box < 4; box++) {
      expect(counts[box], `Box ${box} vs ${box + 1}`).toBeGreaterThan(counts[box + 1]);
    }
  });

  it('AT-20.5: Bewertungsregeln', () => {
    const progress: LanguageProgress = {
      apfel: { box: 2, seen: 4, lastSeenAt: '2026-10-01T00:00:00.000Z' },
      hund: { box: 4, seen: 9, lastSeenAt: '2026-10-01T00:00:00.000Z' },
      katze: { box: 3, seen: 5, lastSeenAt: '2026-10-01T00:00:00.000Z' },
    };
    const snapshot = structuredClone(progress);

    expect(applyRating(progress, 'apfel', 'known', NOW).apfel).toEqual({
      box: 3,
      seen: 5,
      lastSeenAt: NOW.toISOString(),
    });
    expect(applyRating(progress, 'hund', 'known', NOW).hund.box).toBe(4); // max. 4
    expect(applyRating(progress, 'katze', 'practice', NOW).katze).toEqual({
      box: 0,
      seen: 6,
      lastSeenAt: NOW.toISOString(),
    });
    expect(applyRating(progress, 'baum', 'known', NOW).baum).toEqual({
      box: 1,
      seen: 1,
      lastSeenAt: NOW.toISOString(),
    });
    expect(applyRating(progress, 'baum', 'practice', NOW).baum.box).toBe(0);

    const after = applyRating(progress, 'apfel', 'known', NOW);
    expect(after.hund).toEqual(progress.hund);
    expect(after.katze).toEqual(progress.katze);
    expect(progress).toEqual(snapshot); // Eingabe unverändert
  });

  it('AT-20.6: gleicher Seed → gleiche Wortfolge', () => {
    const a = simulate(evenProgress(), 50, seededRng(7)).session.history;
    const b = simulate(evenProgress(), 50, seededRng(7)).session.history;
    const c = simulate(evenProgress(), 50, seededRng(8)).session.history;
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('AT-20.7: nach und nach werden alle Wörter eingeführt', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = seededRng(seed);
      let progress: LanguageProgress = {};
      let sessions = 0;
      while (Object.keys(progress).length < IDS.length && sessions < 20) {
        progress = simulate(progress, 40, rng, () => 'known').progress;
        sessions++;
      }
      expect(Object.keys(progress)).toHaveLength(IDS.length);
      // höchstens 8 neue Wörter pro Runde (B-70): bei 61 Wörtern spätestens nach 8 Runden
      expect(sessions, `Seed ${seed}`).toBeLessThanOrEqual(
        Math.ceil(IDS.length / MAX_NEW_PER_SESSION),
      );
    }
  });

  it('AT-20.8/AT-70.4: ab 6 bekannten Wörtern ist jedes 3. Wort neu, bis 8 eingeführt sind', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const start = Object.fromEntries(
        IDS.slice(0, 6 + (seed % 30)).map((id) => [
          id,
          { box: seed % 5, seen: 2, lastSeenAt: NOW.toISOString() },
        ]),
      );
      const { session } = simulate(start, 30, seededRng(seed));
      const newPositions = session.history
        .map((id, i) => (start[id] ? -1 : i))
        .filter((i) => i >= 0);
      const firstOccurrences = newPositions.filter(
        (i) => session.history.indexOf(session.history[i]) === i,
      );
      expect(firstOccurrences, `Seed ${seed}`).toEqual(
        Array.from({ length: MAX_NEW_PER_SESSION }, (_, k) => (k + 1) * NEW_INTERVAL - 1),
      );
    }
  });
});
