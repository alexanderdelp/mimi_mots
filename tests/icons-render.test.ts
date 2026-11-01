// @vitest-environment jsdom
// @vitest-environment node
// B-50: npm run icons rendert die PNG-Icons aus den SVG-Quellen.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error – reines ESM-Skript ohne Typen
import { ICONS, renderIcons } from '../scripts/render-icons.mjs';

function pngSize(path: string) {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('render-icons (AT-50.4)', () => {
  it('rendert alle Icons in der richtigen Größe', async () => {
    const out = mkdtempSync(join(tmpdir(), 'mimi-icons-'));
    try {
      const written: string[] = await renderIcons('public/icons', out);
      expect(written).toHaveLength(4);
      for (const [file, [, size]] of Object.entries(ICONS as Record<string, [string, number]>)) {
        expect(pngSize(join(out, file)), file).toEqual({ width: size, height: size });
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 30_000);

  it('die eingecheckten Icons haben die erwarteten Größen', () => {
    for (const [file, [, size]] of Object.entries(ICONS as Record<string, [string, number]>)) {
      expect(pngSize(join('public/icons', file)), file).toEqual({ width: size, height: size });
    }
  });
});
