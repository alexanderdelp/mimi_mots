import { expect, test, type Page } from '@playwright/test';

const AVATARS = ['cat', 'pony'].flatMap((a) =>
  ['sitting', 'pointing', 'idle', 'waving'].map((p) => `avatars/${a}_${p}.png`),
);
const FLAGS = ['flags/flag_gb.png', 'flags/flag_fr.png'];
const ICONS = [
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable.svg',
  'icons/icon-maskable-512.png',
];
const POSES = ['ruhig', 'zeigt', 'freut', 'winkt'];

/** Wartet, bis alle sichtbaren Avatarbilder vollständig geladen sind. */
async function avatarsLoaded(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLImageElement>('.avatar img')].every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
}

async function avatarBoxes(page: Page) {
  return page.locator('.avatar').evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      const img = el.querySelector('img')!.getBoundingClientRect();
      return [box.x, box.y, box.width, box.height, img.x, img.y, img.width, img.height];
    }),
  );
}

test.describe('B-03 Assets einbinden', () => {
  test('AT-03.1: alle Bilder werden unter /mimi_mots/ ausgeliefert', async ({ page, request }) => {
    for (const file of [...AVATARS, ...FLAGS, ...ICONS]) {
      const res = await request.get(file);
      expect(res.status(), file).toBe(200);
    }
    await page.goto('./?vorschau=avatar');
    await avatarsLoaded(page);
    for (const file of AVATARS) {
      const size = await page.evaluate(async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        return [img.naturalWidth, img.naturalHeight];
      }, file);
      expect(size, file).toEqual([384, 440]);
    }
  });

  test('AT-03.2: Posenwechsel verschiebt nichts', async ({ page }) => {
    await page.goto('./?vorschau=avatar');
    await avatarsLoaded(page);
    const initial = await avatarBoxes(page);
    expect(initial).toHaveLength(2);

    for (const pose of POSES) {
      await page.locator(`button[data-pose="${pose}"]`).click();
      await expect(page.locator('.avatar').first()).toHaveAttribute('data-pose', pose);
      await avatarsLoaded(page);
      expect(await avatarBoxes(page), pose).toEqual(initial);
    }
  });

  test('AT-03.3: nach dem Vorladen kein Request beim Posenwechsel', async ({ page }) => {
    await page.goto('./?vorschau=avatar');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() =>
      performance
        .getEntriesByType('resource')
        .some(
          (e) => e.name.includes('waving.png') && (e as PerformanceResourceTiming).responseEnd > 0,
        ),
    );

    const requests: string[] = [];
    page.on('request', (req) => requests.push(req.url()));
    for (const pose of POSES) {
      await page.locator(`button[data-pose="${pose}"]`).click();
      const complete = await page
        .locator('.avatar img')
        .evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).complete));
      expect(complete, pose).toBe(true);
    }
    expect(requests).toEqual([]);
  });

  test('AT-03.4: höchstens 440 px hoch, unten ausgerichtet, nicht verzerrt', async ({ page }) => {
    await page.goto('./?vorschau=avatar');
    await avatarsLoaded(page);
    const styles = await page.locator('.avatar').evaluateAll((els) =>
      els.map((el) => {
        const img = getComputedStyle(el.querySelector('img')!);
        return {
          height: el.getBoundingClientRect().height,
          ratio: el.getBoundingClientRect().width / el.getBoundingClientRect().height,
          fit: img.objectFit,
          position: img.objectPosition,
        };
      }),
    );
    for (const s of styles) {
      expect(s.height).toBeLessThanOrEqual(440);
      expect(s.ratio).toBeCloseTo(384 / 440, 2);
      expect(s.fit).toBe('contain');
      expect(s.position).toMatch(/100%$/);
    }
  });
});
