import { describe, expect, it } from 'vitest';
import { BREAK_CLASS, fitText } from '../src/components/fit-text';

/**
 * Element mit simulierter Breite: Textbreite wächst proportional zur Schriftgröße.
 * Mit Silbentrennung (BREAK_CLASS) verteilt sich der Text auf zwei Zeilen (halbe Breite).
 */
function fakeElement(textWidthAt56: number, boxWidth: number) {
  const el = document.createElement('p') as HTMLParagraphElement & { textWidthAt56: number };
  el.textWidthAt56 = textWidthAt56;
  Object.defineProperty(el, 'clientWidth', { get: () => boxWidth });
  Object.defineProperty(el, 'clientHeight', { get: () => 100 });
  Object.defineProperty(el, 'scrollHeight', { get: () => 100 });
  Object.defineProperty(el, 'scrollWidth', {
    get: () => {
      const width = Math.ceil((el.textWidthAt56 * parseFloat(el.style.fontSize)) / 56);
      return el.classList.contains(BREAK_CLASS) ? Math.ceil(width / 2) : width;
    },
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

  it('trennt nicht, solange das Wort ab der Trenngrenze passt', () => {
    const el = fakeElement(330, 260); // passt bei ~44 px
    const size = fitText(el, 56, 28, 36);
    expect(size).toBeGreaterThanOrEqual(36);
    expect(el.classList.contains(BREAK_CLASS)).toBe(false);
  });

  it('trennt sehr lange Einzelwörter, statt sie winzig zu machen', () => {
    const el = fakeElement(560, 260); // passt ungetrennt erst bei 26 px
    const size = fitText(el, 56, 28, 36);
    expect(el.classList.contains(BREAK_CLASS)).toBe(true);
    expect(size).toBeGreaterThan(36);
    expect(el.scrollWidth).toBeLessThanOrEqual(260);
  });

  it('nimmt die Trennung beim nächsten, kürzeren Wort wieder zurück', () => {
    const el = fakeElement(560, 260);
    fitText(el, 56, 28, 36);
    el.textWidthAt56 = 100;
    expect(fitText(el, 56, 28, 36)).toBe(56);
    expect(el.classList.contains(BREAK_CLASS)).toBe(false);
  });
});
