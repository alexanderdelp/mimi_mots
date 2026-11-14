// @vitest-environment jsdom
// Umgebungs-Abzeichen (Cloudflare: Produktion / Integration / Abnahme / lokal)
import { describe, expect, it } from 'vitest';
import { stageBadge, stageLabel } from '../src/env';

describe('Umgebungs-Abzeichen', () => {
  it('Texte je Umgebung, in Produktion keins', () => {
    expect(stageLabel('produktion', 'release')).toBeNull();
    expect(stageLabel('integration', 'main')).toBe('Integration');
    expect(stageLabel('abnahme', 'feat/x')).toBe('Abnahme: feat/x');
    expect(stageLabel('lokal', 'main')).toBe('Lokal: main');
  });

  it('Element nur außerhalb der Produktion, für Screenreader verborgen', () => {
    expect(stageBadge('produktion', 'release')).toBeNull();
    const badge = stageBadge('abnahme', 'feat/x')!;
    expect(badge.className).toBe('stage-badge stage-badge--abnahme');
    expect(badge.textContent).toBe('Abnahme: feat/x');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
  });
});
