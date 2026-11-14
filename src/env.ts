// Umgebungs-Abzeichen: Welche Umgebung läuft? Branch und Umgebung setzt Vite beim Bauen (`define`
// in vite.config.ts, ermittelt in tools/build-info.ts). In Produktion gibt es kein Abzeichen.

export type Stage = 'produktion' | 'integration' | 'abnahme' | 'lokal';

/** Text des Abzeichens; in Produktion keins. */
export function stageLabel(stage: Stage, branch: string): string | null {
  switch (stage) {
    case 'produktion':
      return null;
    case 'integration':
      return 'Integration';
    case 'abnahme':
      return `Abnahme: ${branch}`;
    case 'lokal':
      return `Lokal: ${branch}`;
  }
}

/** Kleines Abzeichen unten links (nicht antippbar), oder null in Produktion. */
export function stageBadge(stage: Stage, branch: string): HTMLElement | null {
  const label = stageLabel(stage, branch);
  if (!label) return null;
  const badge = document.createElement('div');
  badge.className = `stage-badge stage-badge--${stage}`;
  badge.textContent = label;
  badge.setAttribute('aria-hidden', 'true');
  return badge;
}

export const BUILD = { stage: __APP_STAGE__ as Stage, branch: __APP_BRANCH__ };
