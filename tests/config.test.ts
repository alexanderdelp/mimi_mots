import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import config, { BASE } from '../vite.config';

describe('Vite-Konfiguration', () => {
  it('nutzt den GitHub-Pages-Pfad des Repos als base', () => {
    expect(BASE).toBe('/mimi_mots/');
    expect(config).toMatchObject({ base: BASE });
  });

  it('startet den Dev-Server mit --host, damit das iPad im WLAN zugreifen kann', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.scripts.dev).toMatch(/--host/);
  });

  it('stellt alle in CLAUDE.md genannten npm-Skripte bereit', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    for (const name of ['dev', 'build', 'preview', 'test', 'test:e2e', 'lint']) {
      expect(pkg.scripts[name], name).toBeTruthy();
    }
  });
});
