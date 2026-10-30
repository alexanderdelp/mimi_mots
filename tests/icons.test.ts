import { describe, expect, it } from 'vitest';
import { clockIcon, icon, roundButton } from '../src/components/icons';
import { createAppHeader } from '../src/components/app-header';

describe('icon', () => {
  it.each(['play', 'thumbsUp', 'repeat', 'speaker', 'home', 'back', 'rotate'] as const)(
    '%s ist ein dekoratives SVG',
    (n) => {
      const svg = icon(n);
      expect(svg.tagName.toLowerCase()).toBe('svg');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.dataset.icon).toBe(n);
      expect(svg.innerHTML).toContain('currentColor');
    },
  );
});

describe('clockIcon', () => {
  it.each([
    [5, 30, '0 0 1'],
    [10, 60, '0 0 1'],
    [45, 270, '0 1 1'],
  ])('%i Minuten → Sektor %i°', (minutes, angle, arcFlags) => {
    const svg = clockIcon(minutes);
    expect(svg.dataset.angle).toBe(String(angle));
    expect(svg.querySelector('.clock-icon__sector')!.getAttribute('d')).toContain(
      `A38 38 ${arcFlags}`,
    );
    expect(svg.querySelectorAll('.clock-icon__ticks line')).toHaveLength(12);
  });
});

describe('roundButton', () => {
  it('hat nur ein Symbol und einen Namen für Screenreader', () => {
    const b = roundButton('Wusste ich', 'thumbsUp', 'rating-button');
    expect(b.type).toBe('button');
    expect(b.className).toBe('round-button rating-button');
    expect(b.getAttribute('aria-label')).toBe('Wusste ich');
    expect(b.textContent).toBe('');
    expect(b.querySelector('svg')!.dataset.icon).toBe('thumbsUp');
  });
});

describe('createAppHeader', () => {
  it('zeigt Icon und Titel', () => {
    const h = createAppHeader();
    expect(h.querySelector('img')!.getAttribute('src')).toMatch(/icons\/icon\.svg$/);
    expect(h.querySelector('h1')!.textContent).toBe('Mimi & Mots');
  });
});
