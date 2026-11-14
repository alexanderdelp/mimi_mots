// B-98: Version, Commit und Datum des Builds (AT-98.2, AT-98.4).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  UNKNOWN,
  formatBuildDate,
  resolveBranch,
  resolveCommit,
  resolveStage,
  shortCommit,
} from '../tools/build-info';
import { versionLabel } from '../src/version';

describe('formatBuildDate (AT-98.2)', () => {
  it('schreibt TT.MM.JJJJ zweistellig', () => {
    expect(formatBuildDate(new Date(2026, 10, 1, 12))).toBe('01.11.2026');
    expect(formatBuildDate(new Date(2027, 0, 9, 0, 5))).toBe('09.01.2027');
    expect(formatBuildDate(new Date(2026, 11, 31, 23, 59))).toBe('31.12.2026');
  });
});

describe('resolveCommit (AT-98.2)', () => {
  const env = {};
  it('nimmt den kurzen Commit von Git', () => {
    expect(resolveCommit(() => '8f48636\n', env)).toBe('8f48636');
  });
  it('kürzt auf 7 Zeichen', () => {
    expect(resolveCommit(() => '8f486360123456789abcdef0123456789abcdef0', env)).toBe('8f48636');
  });
  it('ohne Git (Fehler) steht „unbekannt“, ohne zu werfen', () => {
    const noGit = () => {
      throw new Error('spawn git ENOENT');
    };
    expect(resolveCommit(noGit, env)).toBe(UNKNOWN);
    expect(UNKNOWN).toBe('unbekannt');
  });
  it('leere oder unsinnige Ausgabe → „unbekannt“', () => {
    expect(resolveCommit(() => '', env)).toBe(UNKNOWN);
    expect(resolveCommit(() => 'fatal: not a git repository', env)).toBe(UNKNOWN);
  });
  it('echtes Git im Repository liefert 7 Hexzeichen oder „unbekannt“', () => {
    expect(resolveCommit(undefined, {})).toMatch(/^([0-9a-f]{7}|unbekannt)$/);
  });
});

describe('GitHub Action (AT-98.4)', () => {
  it('fällt ohne Git auf GITHUB_SHA zurück', () => {
    const noGit = () => {
      throw new Error('kein git');
    };
    const sha = '8F486360123456789abcdef0123456789abcdef0';
    expect(resolveCommit(noGit, { GITHUB_SHA: sha })).toBe('8f48636');
    expect(shortCommit(undefined)).toBe(UNKNOWN);
  });
  it('Git hat Vorrang vor GITHUB_SHA', () => {
    expect(resolveCommit(() => 'abcdef0', { GITHUB_SHA: '1234567890' })).toBe('abcdef0');
  });
  it('der Workflow holt den Code per actions/checkout (mit .git) vor dem Build', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    const checkout = workflow.indexOf('uses: actions/checkout@');
    expect(checkout).toBeGreaterThan(-1);
    expect(checkout).toBeLessThan(workflow.indexOf('run: npm run build'));
    // kein eigener Pfad / kein „Git entfernen“ – `git rev-parse` im Build funktioniert
    expect(workflow).not.toMatch(/actions\/checkout@v\d+\s*\n\s+with:[^]*?path:/);
  });
});

describe('versionLabel', () => {
  it('trennt mit „ · “', () => {
    expect(versionLabel('0.1.0', '8f48636', '01.11.2026')).toBe('0.1.0 · 8f48636 · 01.11.2026');
  });
  it('außerhalb der Produktion steht der Branch vor dem Commit', () => {
    expect(versionLabel('0.7.0', '8f48636', '14.11.2026', 'main')).toBe(
      '0.7.0 · main · 8f48636 · 14.11.2026',
    );
  });
});

describe('Cloudflare Workers Builds: Branch und Umgebung', () => {
  const noGit = () => {
    throw new Error('kein git');
  };
  it('nimmt den Commit aus WORKERS_CI_COMMIT_SHA, wenn Git fehlt', () => {
    expect(resolveCommit(noGit, { WORKERS_CI_COMMIT_SHA: 'ABCDEF0123456789' })).toBe('abcdef0');
    // dort kam schon der Branch-Name statt eines Hashes an (KonJugi) → nicht übernehmen
    expect(resolveCommit(noGit, { WORKERS_CI_COMMIT_SHA: 'main' })).toBe(UNKNOWN);
  });
  it('Branch: APP_BRANCH vor WORKERS_CI_BRANCH vor Git, sonst „lokal“', () => {
    const git = () => 'feat/x\n';
    expect(resolveBranch(git, { APP_BRANCH: 'release', WORKERS_CI_BRANCH: 'main' })).toBe(
      'release',
    );
    expect(resolveBranch(git, { WORKERS_CI_BRANCH: 'main' })).toBe('main');
    expect(resolveBranch(git, {})).toBe('feat/x');
    expect(resolveBranch(() => 'HEAD', {})).toBe('lokal');
    expect(resolveBranch(noGit, {})).toBe('lokal');
  });
  it('Umgebung: release → Produktion, main → Integration, sonst Abnahme; ohne CI lokal', () => {
    const ci = { WORKERS_CI_BRANCH: 'x' };
    expect(resolveStage('release', ci)).toBe('produktion');
    expect(resolveStage('main', ci)).toBe('integration');
    expect(resolveStage('feat/b-12-timer', ci)).toBe('abnahme');
    expect(resolveStage('release', { APP_BRANCH: 'release' })).toBe('produktion');
    expect(resolveStage('main', {})).toBe('lokal');
  });
});
