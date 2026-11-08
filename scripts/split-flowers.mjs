// B-109: Zerschneidet das Sprite der Blumen (assets/blumen.png, 3 Blumen × 6 Bilder: Samen,
// eingepflanzt, Keimling, Pflanze, Knospe, Blüte) in einzelne transparente WebP-Bilder unter
// public/flowers/. Der weiße Hintergrund wird per Flutfüllung vom Rand entfernt – Weiß im
// Inneren (Glanzlichter, Punkte) bleibt. Die Wachstumsstufen bekommen dieselbe Leinwand, unten
// mittig ausgerichtet, damit der Bildtausch nicht springt. Die Samen stehen für sich (Kacheln im
// Elternbereich) und bekommen eine eigene quadratische Leinwand, mittig (B-110); gleicher
// Maßstab, damit sie nicht hochskaliert werden. Aufruf: npm run flowers
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const FLOWERS = ['sunflower', 'peony', 'clematis'];
export const STAGES = ['seed', 'planted', 'sprout', 'plant', 'bud', 'bloom'];
const SIZE = 240; // längste Seite in px (Anzeige bis ~120 px, doppelte Dichte)
const WHITE = 236; // ab hier gilt ein Pixel am Rand als Hintergrund
const EDGE = 48; // Breite des weichen Übergangs (Kantenglättung)

/** Hintergrundmaske per Flutfüllung von allen Randpixeln aus. */
function backgroundMask(data, width, height) {
  const bg = new Uint8Array(width * height);
  const light = (i) => Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) >= WHITE;
  const stack = [];
  const push = (x, y) => {
    const i = y * width + x;
    if (!bg[i] && light(i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  return bg;
}

/** RGBA: Hintergrund durchsichtig, Kante weich und ohne weißen Saum. */
function toRgba(data, bg, width, height) {
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
    let a = 1;
    if (bg[i]) a = 0;
    else {
      const x = i % width;
      const y = (i - x) / width;
      const nearBg =
        (x > 0 && bg[i - 1]) ||
        (x < width - 1 && bg[i + 1]) ||
        (y > 0 && bg[i - width]) ||
        (y < height - 1 && bg[i + width]);
      if (nearBg) a = Math.min(1, (255 - Math.min(r, g, b)) / EDGE);
    }
    const un = (c) => (a > 0 ? Math.max(0, Math.min(255, Math.round((c - 255 * (1 - a)) / a))) : 0);
    out[i * 4] = un(r);
    out[i * 4 + 1] = un(g);
    out[i * 4 + 2] = un(b);
    out[i * 4 + 3] = Math.round(a * 255);
  }
  return out;
}

/** Bereiche mit Inhalt entlang einer Achse; Lücken unter `gap` px werden überbrückt. */
function segments(filled, gap = 12) {
  const out = [];
  let start = -1;
  let last = -1;
  filled.forEach((on, i) => {
    if (!on) return;
    if (start < 0) start = i;
    else if (i - last > gap) {
      out.push([start, last + 1]);
      start = i;
    }
    last = i;
  });
  if (start >= 0) out.push([start, last + 1]);
  return out;
}

export async function splitFlowers(src, outDir) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const bg = backgroundMask(data, width, height);
  const rgba = toRgba(data, bg, width, height);
  const alpha = (x, y) => rgba[(y * width + x) * 4 + 3] > 8;

  const rows = segments(
    Array.from({ length: height }, (_, y) => {
      for (let x = 0; x < width; x++) if (alpha(x, y)) return true;
      return false;
    }),
  );
  const cols = segments(
    Array.from({ length: width }, (_, x) => {
      for (let y = 0; y < height; y++) if (alpha(x, y)) return true;
      return false;
    }),
  );
  if (rows.length !== FLOWERS.length || cols.length !== STAGES.length) {
    throw new Error(
      `Raster ${cols.length} × ${rows.length} statt ${STAGES.length} × ${FLOWERS.length}`,
    );
  }

  // Jede Zelle auf ihren Inhalt beschneiden; gemeinsame Leinwand = größte Zelle
  const cells = rows.flatMap(([y0, y1]) =>
    cols.map(([x0, x1]) => {
      let [l, t, r, b] = [x1, y1, x0, y0];
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++)
          if (alpha(x, y))
            [l, t, r, b] = [Math.min(l, x), Math.min(t, y), Math.max(r, x + 1), Math.max(b, y + 1)];
      return { left: l, top: t, width: r - l, height: b - t };
    }),
  );
  // Wachstumsstufen: gemeinsame Leinwand = größte Zelle, unten ausgerichtet;
  // Samen: eigene quadratische Leinwand = größter Samen, mittig (B-110)
  const isSeed = (index) => STAGES[index % STAGES.length] === 'seed';
  const growing = cells.filter((_, i) => !isSeed(i));
  const canvasW = Math.max(...growing.map((c) => c.width));
  const canvasH = Math.max(...growing.map((c) => c.height));
  const seedSide = Math.max(
    ...cells.filter((_, i) => isSeed(i)).flatMap((c) => [c.width, c.height]),
  );
  const scale = SIZE / Math.max(canvasW, canvasH);
  const full = sharp(rgba, { raw: { width, height, channels: 4 } });

  await mkdir(outDir, { recursive: true });
  const written = [];
  for (const [index, cell] of cells.entries()) {
    const flower = FLOWERS[Math.floor(index / STAGES.length)];
    const stage = STAGES[index % STAGES.length];
    const piece = await full.clone().extract(cell).png().toBuffer();
    const seed = isSeed(index);
    const [w, h] = seed ? [seedSide, seedSide] : [canvasW, canvasH];
    const left = Math.round((w - cell.width) / 2);
    const top = seed ? Math.round((h - cell.height) / 2) : h - cell.height;
    const file = join(outDir, `${flower}_${stage}.webp`);
    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: piece, left, top }])
      .png()
      .toBuffer()
      .then((buffer) =>
        sharp(buffer)
          .resize(Math.round(w * scale), Math.round(h * scale))
          .webp({ quality: 88, alphaQuality: 90 })
          .toFile(file),
      );
    written.push(file);
  }
  return written;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = await splitFlowers('assets/blumen.png', 'public/flowers');
  console.log(`${files.length} Bilder in public/flowers/`);
}
