import { describe, expect, it } from 'vitest';
import { createTimerDial, sectorPath } from '../src/components/timer-dial';

describe('sectorPath', () => {
  it('leer bei 0 (abgelaufen)', () => {
    expect(sectorPath(0)).toBe('');
    expect(sectorPath(-0.2)).toBe('');
  });

  it('ganze Scheibe bei 1', () => {
    expect(sectorPath(1)).toMatch(/^M50 10 A40 40 0 1 1/);
    expect(sectorPath(1.5)).toBe(sectorPath(1));
  });

  it.each([
    [0.75, '90.000 50.000', 1], // Rest beginnt bei 3 Uhr
    [0.5, '50.000 90.000', 0], // Halbkreis von 6 bis 12 Uhr
    [0.25, '10.000 50.000', 0], // Rest beginnt bei 9 Uhr
  ])('Anteil %f beginnt bei %s und endet bei 12 Uhr', (fraction, start, largeArc) => {
    const d = sectorPath(fraction);
    expect(d.startsWith(`M50 50 L${start} `)).toBe(true);
    expect(d).toContain(`A40 40 0 ${largeArc} 1 50 10 Z`);
  });
});

describe('createTimerDial', () => {
  it('ist dekorativ, hat 12 Strichmarken und keinen Text', () => {
    const { el } = createTimerDial();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('.timer-dial__ticks line')).toHaveLength(12);
    expect(el.textContent).toBe('');
    expect(el.dataset.fraction).toBe('1.0000');
  });

  it('setFraction setzt Sektor und Anteil (begrenzt auf 0..1)', () => {
    const dial = createTimerDial();
    dial.setFraction(0.5);
    expect(dial.el.querySelector('.timer-dial__sector')!.getAttribute('d')).toBe(sectorPath(0.5));
    expect(dial.el.dataset.fraction).toBe('0.5000');
    dial.setFraction(-1);
    expect(dial.el.querySelector('.timer-dial__sector')!.getAttribute('d')).toBe('');
    expect(dial.el.dataset.fraction).toBe('0.0000');
  });
});
