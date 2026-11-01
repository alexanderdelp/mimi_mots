// B-89: Lernmodi mit Namen (nur für Screenreader) und Symbol – Startseite und Elternbereich.
import type { IconName } from '../components/icons';
import type { Mode } from '../storage';

export const MODE_INFO: Record<Mode, { name: string; icon: IconName }> = {
  speak: { name: 'Sprechen', icon: 'speak' },
  listen: { name: 'Hören', icon: 'listen' },
};
