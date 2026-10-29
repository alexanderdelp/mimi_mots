import { describe, expect, it } from 'vitest';
import { fitText } from '../src/components/fit-text';

/** Element mit simulierter Breite: Textbreite wächst proportional zur Schriftgröße. */
function fakeElement(textWidthAt56: number, boxWidth: number) {
  const el = document.createElement('p');
  Object.defineProperty(el, 'clientWidth', { get: () => boxWidth });
  Object.defineProperty(el, 'clientHeight', { get: () => 100 });
  Object.defineProperty(el, 'scrollHeight', { get: () => 100 });
  Object.defineProperty(el, 'scrollWidth', {
    get: () => Math.ceil((textWidthAt56 * parseFloat(el.style.fontSize)) / 56),
  });
  return el;
}

describe('fitText', () => {
  it('lässt kurze Wörter in voller Größe', () => {
    expect(fitText(fakeElement(150, 260), 56, 28)).toBe(56);
  });

  it('verkleinert lange Wörter, bis sie passen', () => {
    const el = fakeElement(330, 260);
    const size = fitText(el, 56, 28);
    expect(size).toBeLessThan(56);
    expect(el.scrollWidth).toBeLessThanOrEqual(260);
    expect(el.style.fontSize).toBe(`${size}px`);
  });

  it('geht nie unter die Mindestgröße', () => {
    expect(fitText(fakeElement(2000, 100), 56, 28)).toBe(28);
  });
});
