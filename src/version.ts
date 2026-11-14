// B-98: Version des Builds; die Werte setzt Vite beim Bauen (`define` in vite.config.ts).

/** Text der Zeile „Version“: „0.1.0 · 8f48636 · 01.11.2026“; außerhalb der Produktion mit Branch
 *  davor: „0.1.0 · main · 8f48636 · 01.11.2026“. */
export function versionLabel(
  version: string,
  commit: string,
  date: string,
  branch?: string,
): string {
  return [version, branch, commit, date].filter(Boolean).join(' · ');
}

export const VERSION_LABEL = versionLabel(
  __APP_VERSION__,
  __APP_COMMIT__,
  __APP_BUILD_DATE__,
  __APP_STAGE__ === 'produktion' ? undefined : __APP_BRANCH__,
);
