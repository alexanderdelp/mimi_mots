import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

/** Alle Dateien unter `dir` mit der Endung `ext`. */
function files(dir: string, ext: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path, ext);
    return path.endsWith(ext) ? [path] : [];
  });
}

describe('Ungenutztes CSS (B-102)', () => {
  // Elternbereich gehört B-100
  const sheets = files('src/styles', '.css').filter((path) => !path.endsWith('admin.css'));
  const code = [...files('src', '.ts'), 'index.html'].map(read).join('\n');
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** Kommt die Klasse im Code vor – wörtlich oder zusammengesetzt wie `${base}--${x}`? */
  const used = (name: string) => {
    if (new RegExp(`(?<![\\w-])${escape(name)}(?![\\w-])`).test(code)) return true;
    const modifier = name.lastIndexOf('--');
    return modifier > 0 && code.includes(`${name.slice(0, modifier + 2)}\${`);
  };

  it('AT-102.3: jede Klasse aus src/styles/ (außer admin.css) kommt in src/ oder index.html vor', () => {
    const unused = sheets.flatMap((path) => {
      // Kommentare und Werte (z. B. `.5`) zählen nicht
      const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '');
      const names = new Set([...css.matchAll(/(?<![\w-])\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1]));
      return [...names].filter((name) => !used(name)).map((name) => `${path}: .${name}`);
    });
    expect(unused).toEqual([]);
  });
});
