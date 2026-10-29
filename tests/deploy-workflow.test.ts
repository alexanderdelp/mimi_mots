// B-53: Der Deploy-Workflow für GitHub Pages ist vollständig (AT-53.1).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const readme = readFileSync('README.md', 'utf8');

describe('Deploy-Workflow (AT-53.1)', () => {
  it('läuft bei Push auf main und von Hand', () => {
    expect(workflow).toMatch(/on:\s*\n\s+push:\s*\n\s+branches: \[main\]/);
    expect(workflow).toContain('workflow_dispatch:');
  });

  it('hat die nötigen Rechte für Pages', () => {
    expect(workflow).toMatch(/pages: write/);
    expect(workflow).toMatch(/id-token: write/);
  });

  it('prüft, baut und veröffentlicht dist/', () => {
    const steps = ['npm ci', 'npm run lint', 'npm test', 'npm run build'];
    let last = -1;
    for (const step of steps) {
      const i = workflow.indexOf(`run: ${step}`);
      expect(i, step).toBeGreaterThan(last);
      last = i;
    }
    expect(workflow).toMatch(/upload-pages-artifact@v\d+\s*\n\s+with:\s*\n\s+path: dist/);
    expect(workflow).toMatch(/uses: actions\/deploy-pages@v\d+/);
    expect(workflow).toMatch(/name: github-pages/);
  });

  it('erlaubt nur ein Deployment gleichzeitig', () => {
    expect(workflow).toMatch(/concurrency:\s*\n\s+group: pages/);
  });
});

describe('README (AT-53.4)', () => {
  it('beschreibt Einrichtung und Home-Bildschirm', () => {
    expect(readme).toContain('https://alexanderdelp.github.io/mimi_mots/');
    expect(readme).toMatch(/GitHub Actions/);
    expect(readme).toMatch(/Zum Home-Bildschirm/);
  });
});
