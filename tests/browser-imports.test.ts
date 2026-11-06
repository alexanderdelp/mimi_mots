// B-105: Der Dev-Server lädt jedes Modul einzeln in den Browser. Ein `node:*`-Import stoppt dort
// die App, während er im Produktionsbuild unbemerkt wegfällt (AT-105.3).
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;

function resolveModule(from: string, specifier: string): string | null {
  const base = resolve(dirname(from), specifier);
  return (
    [base, `${base}.ts`, `${base}/index.ts`].find(
      (path) => path.endsWith('.ts') && existsSync(path),
    ) ?? null
  );
}

/** Alle Module, die von `entry` aus erreichbar sind, mit ihren Importen. */
function reachable(entry: string): Map<string, string[]> {
  const seen = new Map<string, string[]>();
  const open = [entry];
  while (open.length > 0) {
    const file = open.pop()!;
    if (seen.has(file)) continue;
    const specifiers = [...readFileSync(file, 'utf8').matchAll(IMPORT)].map((m) => m[1]);
    seen.set(file, specifiers);
    for (const specifier of specifiers) {
      const next = specifier.startsWith('.') ? resolveModule(file, specifier) : null;
      if (next) open.push(next);
    }
  }
  return seen;
}

describe('Code für den Browser (AT-105.3)', () => {
  const modules = reachable(resolve('src/main.ts'));

  it('findet den Code der App', () => {
    const files = [...modules.keys()].map((file) => relative('.', file).split(sep).join('/'));
    expect(files).toContain('src/version.ts');
    expect(files).toContain('src/views/admin.ts');
  });

  it('lädt nichts aus node:*', () => {
    const nodeImports = [...modules].flatMap(([file, specifiers]) =>
      specifiers
        .filter((specifier) => specifier.startsWith('node:'))
        .map((specifier) => `${relative('.', file)}: ${specifier}`),
    );
    expect(nodeImports).toEqual([]);
  });
});
