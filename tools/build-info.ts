// B-98: Version, Commit und Datum des Builds für den Elternbereich. Läuft nur beim Bauen
// (vite.config.ts, Vite `define`); alles ist klein und ohne Nebenwirkungen testbar.
// Nur für Node: Code aus src/ darf diese Datei nicht laden (B-105), sonst bleibt die App im
// Dev-Server leer.
import { execFileSync } from 'node:child_process';

export const UNKNOWN = 'unbekannt';

/** Datum als TT.MM.JJJJ (lokale Zeit, zweistellig). */
export function formatBuildDate(date: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(date.getDate())}.${two(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/** Kurzer Commit (7 Zeichen) aus einer Git-Ausgabe oder SHA; sonst „unbekannt“. */
export function shortCommit(raw: string | undefined): string {
  const sha = (raw ?? '').trim().toLowerCase();
  return /^[0-9a-f]{7,40}$/.test(sha) ? sha.slice(0, 7) : UNKNOWN;
}

/**
 * Commit des Builds: `git rev-parse --short=7 HEAD`, sonst GITHUB_SHA (GitHub Action), sonst
 * „unbekannt“. Wirft nie – ein fehlendes Git darf den Build nicht abbrechen.
 */
export function resolveCommit(
  git: () => string = () =>
    execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  env: Record<string, string | undefined> = process.env,
): string {
  try {
    const commit = shortCommit(git());
    if (commit !== UNKNOWN) return commit;
  } catch {
    // kein Git oder kein Repository → Fallback
  }
  return shortCommit(env.GITHUB_SHA);
}
