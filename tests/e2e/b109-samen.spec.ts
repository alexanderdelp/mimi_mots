// B-109: Samen im Elternbereich freigeben (Reiter „Sonstiges“, seit B-114 „Samen“) und die zerschnittenen Blumenbilder.
import { readdirSync } from 'node:fs';
import sharp from 'sharp';
import { expect, test, type Page } from './fixtures';
import { btn, hold, prepare, settle, stored } from './views';

const NAMES = ['Sonnenblume', 'Pfingstrose', 'Stern-Clematis'];

async function openOther(page: Page) {
  await page.goto('./');
  await hold(page, '.app-header__icon');
  await page.getByRole('tab', { name: 'Samen' }).click(); // B-114
  await settle(page);
}

test.describe('B-109 Samen', () => {
  test('AT-109.1: Zeile „Samen“ mit drei Kacheln, anfangs alle markiert', async ({ page }) => {
    await prepare(page, {});
    await openOther(page);
    await expect(page.locator('.admin__title', { hasText: /^Samen$/ })).toBeVisible();
    const sizes = [];
    for (const name of NAMES) {
      const tile = btn(page, name);
      await expect(tile).toHaveAttribute('aria-pressed', 'true');
      await expect(tile.locator('img.admin__seed')).toHaveAttribute(
        'src',
        /flowers\/\w+_seed\.webp$/,
      );
      const loaded = await tile
        .locator('img')
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
      expect(loaded, name).toBe(true);
      const box = (await tile.boundingBox())!;
      sizes.push([Math.round(box.width), Math.round(box.height)]);
    }
    expect(new Set(sizes.map(String)).size).toBe(1); // gleich groß
  });

  test('AT-109.2/114.5: an- und ausschalten, gemerkt, auch der letzte', async ({ page }) => {
    await prepare(page, {});
    await openOther(page);
    await btn(page, 'Pfingstrose').click();
    await expect(btn(page, 'Pfingstrose')).toHaveAttribute('aria-pressed', 'false');
    expect((await stored(page)).enabledFlowers).toEqual(['sunflower', 'clematis']);

    await btn(page, 'Sonnenblume').click();
    expect((await stored(page)).enabledFlowers).toEqual(['clematis']);
    await btn(page, 'Stern-Clematis').click(); // B-114: auch der letzte → Garten aus
    await expect(btn(page, 'Stern-Clematis')).toHaveAttribute('aria-pressed', 'false');
    expect((await stored(page)).enabledFlowers).toEqual([]);

    await page.reload();
    await hold(page, '.app-header__icon');
    await page.getByRole('tab', { name: 'Samen' }).click();
    for (const name of NAMES)
      await expect(btn(page, name)).toHaveAttribute('aria-pressed', 'false');
    await btn(page, 'Pfingstrose').click();
    await btn(page, 'Stern-Clematis').click();
    expect((await stored(page)).enabledFlowers).toEqual(['peony', 'clematis']);
  });

  test('AT-109.4: 18 transparente Bilder gleicher Größe, das Sprite nicht im Build', async () => {
    const files = readdirSync('public/flowers').sort();
    const flowers = ['clematis', 'peony', 'sunflower'];
    const stages = ['bloom', 'bud', 'plant', 'planted', 'seed', 'sprout'];
    expect(files).toEqual(flowers.flatMap((f) => stages.map((s) => `${f}_${s}.webp`)));
    const sizes = new Set<string>();
    const seedSizes = new Set<string>();
    for (const file of files) {
      const image = sharp(`public/flowers/${file}`);
      const { width, height, hasAlpha } = await image.metadata();
      expect(hasAlpha, file).toBe(true);
      // B-110: Samen auf eigener quadratischer Leinwand, die Stufen auf einer gemeinsamen
      (file.endsWith('_seed.webp') ? seedSizes : sizes).add(`${width}x${height}`);
      const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
      expect(alphaAt(0, 0), file).toBe(0); // Ecke durchsichtig
      expect(alphaAt(info.width - 1, 0), file).toBe(0);
    }
    expect(sizes.size).toBe(1);
    expect([...seedSizes]).toHaveLength(1);
    const [seedW, seedH] = [...seedSizes][0].split('x').map(Number);
    expect(seedW).toBe(seedH);
    expect(readdirSync('public')).not.toContain('blumen.png');
    expect(readdirSync('dist')).not.toContain('blumen.png');
  });
});

test.describe('B-110 Samen mittig', () => {
  test('AT-110.1: das Samenbild ist auf der Kachel waagrecht und senkrecht mittig', async () => {
    for (const flower of ['sunflower', 'peony', 'clematis']) {
      const { data, info } = await sharp(`public/flowers/${flower}_seed.webp`)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let [l, t, r, b] = [info.width, info.height, 0, 0];
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++)
          if (data[(y * info.width + x) * 4 + 3] > 8)
            [l, t, r, b] = [Math.min(l, x), Math.min(t, y), Math.max(r, x + 1), Math.max(b, y + 1)];
      // Mitte des sichtbaren Samens höchstens 2 px neben der Bildmitte
      expect(Math.abs((l + r) / 2 - info.width / 2), flower).toBeLessThanOrEqual(2);
      expect(Math.abs((t + b) / 2 - info.height / 2), flower).toBeLessThanOrEqual(2);
    }
  });

  test('AT-110.2: das Bild füllt die Kachel mittig aus', { tag: '@layout' }, async ({ page }) => {
    await openOther(page);
    for (const name of NAMES) {
      const tile = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
      const img = (await page
        .getByRole('button', { name, exact: true })
        .locator('img')
        .boundingBox())!;
      expect(Math.abs(img.x + img.width / 2 - (tile.x + tile.width / 2)), name).toBeLessThan(1.5);
      expect(Math.abs(img.y + img.height / 2 - (tile.y + tile.height / 2)), name).toBeLessThan(1.5);
    }
  });
});
