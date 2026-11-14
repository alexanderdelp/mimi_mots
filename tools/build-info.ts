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
 * Commit des Builds: `git rev-parse --short=7 HEAD`, sonst WORKERS_CI_COMMIT_SHA (Cloudflare
 * Workers Builds) oder GITHUB_SHA (GitHub Action), sonst „unbekannt“. Wirft nie – ein fehlendes Git darf den Build nicht abbrechen.
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
  const ci = shortCommit(env.WORKERS_CI_COMMIT_SHA);
  return ci !== UNKNOWN ? ci : shortCommit(env.GITHUB_SHA);
}

/** Umgebung des Builds: Produktion (`release`), Integration (`main`), Abnahme (übrige Branches) –
 *  nur in Cloudflare Workers Builds; jeder Build auf dem eigenen Rechner ist „lokal“. */
export type Stage = 'produktion' | 'integration' | 'abnahme' | 'lokal';

type Env = Record<string, string | undefined>;

/**
 * Branch des Builds: `APP_BRANCH` (von Hand, z. B. Playwright), sonst `WORKERS_CI_BRANCH`
 * (Cloudflare Workers Builds), sonst Git; ohne Git oder bei losgelöstem HEAD „lokal“. Wirft nie.
 */
export function resolveBranch(
  git: () => string = () =>
    execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  env: Env = process.env,
): string {
  const given = (env.APP_BRANCH || env.WORKERS_CI_BRANCH || '').trim();
  if (given) return given;
  try {
    const branch = git().trim();
    if (branch && branch !== 'HEAD' && !branch.includes(' ')) return branch;
  } catch {
    // kein Git → „lokal“
  }
  return 'lokal';
}

/** Umgebung zum Branch; ohne `APP_BRANCH`/`WORKERS_CI_BRANCH` immer „lokal“. */
export function resolveStage(branch: string, env: Env = process.env): Stage {
  if (!env.APP_BRANCH && !env.WORKERS_CI_BRANCH) return 'lokal';
  if (branch === 'release') return 'produktion';
  if (branch === 'main') return 'integration';
  return 'abnahme';
}
