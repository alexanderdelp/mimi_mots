// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as round from '../src/views/round';
import { LISTEN_TUTORIAL_STEPS, TUTORIAL_STEPS, penLoop } from '../src/views/tutorial';

describe('Tutorial-Modul (B-102)', () => {
  it('AT-102.2: Schritte beider Modi und penLoop kommen aus tutorial.ts, nicht aus round.ts', () => {
    expect(TUTORIAL_STEPS).toHaveLength(10);
    expect(LISTEN_TUTORIAL_STEPS).toHaveLength(10);
    expect(typeof penLoop).toBe('function');
    expect(Object.keys(round).sort()).toEqual(['renderRound', 'showNextWord']);
    const source = readFileSync('src/views/round.ts', 'utf8');
    expect(source).not.toMatch(/penLoop|TUTORIAL_STEPS|tutorial-mark|tutorial-bubble/);
    for (const step of [...TUTORIAL_STEPS, ...LISTEN_TUTORIAL_STEPS]) {
      expect(source).not.toContain(step.text);
    }
  });

  it('B-87: penLoop ist eine geschlossene Schleife mit mehr als einer Umdrehung', () => {
    const d = penLoop(200, 100);
    const pts = d
      .slice(1)
      .split(' L')
      .map((p) => p.split(' ').map(Number));
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(200);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
    // Winkel um die Mitte aufsummieren: mehr als 360°
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = Math.atan2(pts[i - 1][1] - 50, pts[i - 1][0] - 100);
      const b = Math.atan2(pts[i][1] - 50, pts[i][0] - 100);
      total += Math.atan2(Math.sin(b - a), Math.cos(b - a));
    }
    expect(Math.abs(total)).toBeGreaterThan(2 * Math.PI);
  });
});
