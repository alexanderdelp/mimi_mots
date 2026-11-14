// Auslieferung über Cloudflare Workers (ersetzt B-53 GitHub Pages ab 0.7.0): CI prüft nur,
// Cloudflare Workers Builds liefert aus (release → Produktion, main → Integration, sonst Abnahme).
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const wrangler = readFileSync('wrangler.jsonc', 'utf8');
const readme = readFileSync('README.md', 'utf8');

describe('CI-Workflow', () => {
  it('läuft bei Push auf main/release und bei PRs', () => {
    expect(ci).toMatch(/push:\s*\n\s+branches: \[main, release\]/);
    expect(ci).toMatch(/pull_request:/);
  });

  it('prüft und baut in dieser Reihenfolge', () => {
    let last = -1;
    for (const step of ['npm ci', 'npm run lint', 'npm test', 'npm run build']) {
      const i = ci.indexOf(`run: ${step}`);
      expect(i, step).toBeGreaterThan(last);
      last = i;
    }
  });

  it('PRs nach release nur aus main', () => {
    expect(ci).toMatch(/github\.base_ref == 'release'/);
    expect(ci).toMatch(/head_ref }}" != "main"/);
  });

  it('GitHub Pages wird nicht mehr gebaut (Installation auf dem iPad bleibt unberührt)', () => {
    expect(existsSync('.github/workflows/deploy.yml')).toBe(false);
    expect(ci).not.toMatch(/deploy-pages|upload-pages-artifact/);
  });
});

describe('wrangler.jsonc', () => {
  it('Worker mimimots liefert dist/ aus, baut selbst, mit Vorschauen', () => {
    expect(wrangler).toMatch(/"name": "mimimots"/);
    expect(wrangler).toMatch(/"directory": "\.\/dist"/);
    expect(wrangler).toMatch(/"command": "npm run build"/);
    expect(wrangler).toMatch(/"previews": \{\}/); // Pflicht für `wrangler preview`
    expect(wrangler).toMatch(/"preview_urls": true/);
  });

  it('eigene Domain mit Vorschauen je Branch', () => {
    expect(wrangler).toMatch(
      /"pattern": "mimimots\.bytekaska\.de", "custom_domain": true, "previews_enabled": true/,
    );
  });
});

describe('Schutz von release', () => {
  it('pre-push-Hook sperrt direkte Pushes nach release', () => {
    const hook = 'scripts/git-hooks/pre-push';
    expect(readFileSync(hook, 'utf8')).toContain('refs/heads/release');
  });
});

describe('README', () => {
  it('nennt die Adressen der Umgebungen und den Home-Bildschirm', () => {
    expect(readme).toContain('https://mimimots.bytekaska.de');
    expect(readme).toContain('https://main.mimimots.bytekaska.de');
    expect(readme).toMatch(/Workers Builds/);
    expect(readme).toMatch(/Zum Home-Bildschirm/);
  });
});
