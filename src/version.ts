// B-98: Version des Builds; die Werte setzt Vite beim Bauen (`define` in vite.config.ts).

/** Text der Zeile „Version“: „0.1.0 · 8f48636 · 01.11.2026“. */
export function versionLabel(version: string, commit: string, date: string): string {
  return [version, commit, date].join(' · ');
}

export const VERSION_LABEL = versionLabel(__APP_VERSION__, __APP_COMMIT__, __APP_BUILD_DATE__);
