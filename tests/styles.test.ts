import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

/** Liest `--name: wert;` Paare aus CSS/Markdown, Werte normalisiert (klein, ohne Leerraum). */
function parseTokens(text: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of text.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    tokens.set(name, value.toLowerCase().replace(/\s+/g, '').replace(/,\./g, ',0.'));
  }
  return tokens;
}

describe('Design-Tokens', () => {
  const tokensCss = parseTokens(read('src/styles/tokens.css'));
  const claudeBlock = read('CLAUDE.md').split('## Design-Tokens')[1].split('```')[1];
  const documented = parseTokens(claudeBlock);

  it('CLAUDE.md dokumentiert Tokens', () => {
    expect(documented.size).toBeGreaterThanOrEqual(13);
  });

  it.each([...documented])('%s entspricht CLAUDE.md', (name, value) => {
    expect(tokensCss.get(name)).toBe(value);
  });

  it('Schrift-Stack: ui-rounded, dann Nunito, dann system-ui', () => {
    expect(tokensCss.get('--font')).toMatch(/^ui-rounded,'nunito',system-ui/);
  });
});

describe('Basis-CSS', () => {
  const base = read('src/styles/base.css');

  it.each(['top', 'right', 'bottom', 'left'])('beachtet Safe Area %s', (side) => {
    expect(base).toContain(`env(safe-area-inset-${side})`);
  });

  it('unterdrückt das iOS-Kontextmenü bei langem Drücken', () => {
    expect(base).toContain('-webkit-touch-callout: none');
  });

  it('verhindert Gummiband-Scrollen', () => {
    expect(base).toContain('overscroll-behavior: none');
  });

  it('nutzt dynamische Viewport-Einheiten', () => {
    expect(base).toContain('100dvh');
    expect(base).toContain('100dvw');
  });

  it('respektiert prefers-reduced-motion', () => {
    expect(base).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it('lädt Nunito lokal aus dem Paket, nicht von einem CDN', () => {
    expect(base).toMatch(/url\('@fontsource-variable\/nunito\/files\/[^']+\.woff2'\)/);
    expect(base).not.toMatch(/https?:\/\//);
  });
});

describe('Silbenfarbe (B-66)', () => {
  const tokens = parseTokens(read('src/styles/tokens.css'));
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it('AT-66.4: zweite Silbenfarbe lesbar auf Weiß und deutlich anders als die Schrift', () => {
    const beere = tokens.get('--beere-600')!;
    expect(contrast(beere, tokens.get('--white')!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(beere, tokens.get('--lila-900')!)).toBeGreaterThanOrEqual(2);
  });
});
