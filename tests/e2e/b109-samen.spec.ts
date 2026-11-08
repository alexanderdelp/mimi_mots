// B-109: Samen im Elternbereich freigeben (Reiter „Sonstiges“) und die zerschnittenen Blumenbilder.
import { readdirSync } from 'node:fs';
import sharp from 'sharp';
import { expect, test, type Page } from './fixtures';
import { btn, hold, prepare, settle, stored } from './views';

const NAMES = ['Sonnenblume', 'Pfingstrose', 'Stern-Clematis'];

async function openOther(page: Page) {
  await page.goto('./');
  await hold(page, '.app-header__icon');
  await page.getByRole('tab', { name: 'Sonstiges' }).click();
  await settle(page);
}

test.describe('B-109 Samen', () => {
  test('AT-109.1: Zeile „Samen“ mit drei Kacheln, anfangs alle markiert', async ({ page }) => {
    await prepare(page, {});
    await openOther(page);
    await expect(page.locator('.admin__title', { hasText: 'Samen' })).toBeVisible();
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

  test('AT-109.2/109.3: an- und ausschalten, gemerkt, der letzte bleibt an', async ({ page }) => {
    await prepare(page, {});
    await openOther(page);
    await btn(page, 'Pfingstrose').click();
    await expect(btn(page, 'Pfingstrose')).toHaveAttribute('aria-pressed', 'false');
    expect((await stored(page)).enabledFlowers).toEqual(['sunflower', 'clematis']);

    await btn(page, 'Sonnenblume').click();
    await expect(btn(page, 'Stern-Clematis')).toHaveAttribute('aria-disabled', 'true');
    await btn(page, 'Stern-Clematis').click({ force: true }); // letzter: bleibt an
    await expect(btn(page, 'Stern-Clematis')).toHaveAttribute('aria-pressed', 'true');
    expect((await stored(page)).enabledFlowers).toEqual(['clematis']);

    await page.reload();
    await hold(page, '.app-header__icon');
    await page.getByRole('tab', { name: 'Sonstiges' }).click();
    await expect(btn(page, 'Sonnenblume')).toHaveAttribute('aria-pressed', 'false');
    await expect(btn(page, 'Pfingstrose')).toHaveAttribute('aria-pressed', 'false');
    await btn(page, 'Pfingstrose').click();
    await expect(btn(page, 'Stern-Clematis')).not.toHaveAttribute('aria-disabled', 'true');
    expect((await stored(page)).enabledFlowers).toEqual(['peony', 'clematis']);
  });

  test('AT-109.4: 18 transparente Bilder gleicher Größe, das Sprite nicht im Build', async () => {
    const files = readdirSync('public/flowers').sort();
    const flowers = ['clematis', 'peony', 'sunflower'];
    const stages = ['bloom', 'bud', 'plant', 'planted', 'seed', 'sprout'];
    expect(files).toEqual(flowers.flatMap((f) => stages.map((s) => `${f}_${s}.webp`)));
    const sizes = new Set<string>();
    for (const file of files) {
      const image = sharp(`public/flowers/${file}`);
      const { width, height, hasAlpha } = await image.metadata();
      expect(hasAlpha, file).toBe(true);
      sizes.add(`${width}x${height}`);
      const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
      expect(alphaAt(0, 0), file).toBe(0); // Ecke durchsichtig
      expect(alphaAt(info.width - 1, 0), file).toBe(0);
    }
    expect(sizes.size).toBe(1);
    expect(readdirSync('public')).not.toContain('blumen.png');
    expect(readdirSync('dist')).not.toContain('blumen.png');
  });
});
