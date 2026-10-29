// Rendert die PNG-App-Icons aus den SVG-Quellen (npm run icons).
// Icon austauschen: public/icons/icon.svg bzw. icon-maskable.svg ersetzen, dann npm run icons.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

/** Ziel-PNG → [SVG-Quelle, Kantenlänge in px] */
export const ICONS = {
  'icon-180.png': ['icon.svg', 180], // apple-touch-icon
  'icon-192.png': ['icon.svg', 192],
  'icon-512.png': ['icon.svg', 512],
  'icon-maskable-512.png': ['icon-maskable.svg', 512],
};

export async function renderIcons(srcDir, outDir = srcDir) {
  await mkdir(outDir, { recursive: true });
  const written = [];
  for (const [target, [source, size]] of Object.entries(ICONS)) {
    const out = join(outDir, target);
    await sharp(join(srcDir, source), { density: Math.ceil((72 * size) / 512) * 2 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(out);
    written.push(out);
  }
  return written;
}

// Direkt aufgerufen: public/icons/ neu rendern
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = join(import.meta.dirname, '..', 'public', 'icons');
  for (const file of await renderIcons(dir)) console.log(`geschrieben: ${file}`);
}
