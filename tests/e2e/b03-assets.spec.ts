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

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: { cancel() {}, speak() {}, getVoices: () => [] },
    });
  });
});

/** Startet eine Lernrunde mit dem Begleiter (seit B-24 zeigt sie den Avatar). */
async function startRound(page: Page, companion: 'Mimi' | 'Mots') {
  await page.goto('./');
  await btn(page, companion).click();
  await btn(page, 'Englisch').click();
  await btn(page, 'Los geht’s').click();
  await avatarLoaded(page);
}

/** Wartet, bis das Avatarbild der Lernrunde vollständig geladen ist. */
async function avatarLoaded(page: Page) {
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('.round__avatar .avatar img');
    return !!img && img.complete && img.naturalWidth > 0;
  });
}

async function avatarBox(page: Page) {
  return page.locator('.round__avatar .avatar').evaluate((el) => {
    const box = el.getBoundingClientRect();
    const img = el.querySelector('img')!.getBoundingClientRect();
    return [box.x, box.y, box.width, box.height, img.x, img.y, img.width, img.height];
  });
}

test.describe('B-03 Assets einbinden', () => {
  test('AT-03.1: alle Bilder werden unter /mimi_mots/ ausgeliefert', async ({ page, request }) => {
    for (const file of [...AVATARS, ...FLAGS, ...ICONS]) {
      const res = await request.get(file);
      expect(res.status(), file).toBe(200);
    }
    await page.goto('./');
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

  for (const companion of ['Mimi', 'Mots'] as const) {
    test(`AT-03.2: Posenwechsel verschiebt nichts (${companion})`, async ({ page }) => {
      await startRound(page, companion);
      const zeigt = await avatarBox(page);
      await page.getByRole('button', { name: 'Auf Englisch' }).click();
      await expect(page.locator('.round__avatar .avatar')).toHaveAttribute('data-pose', 'freut');
      await avatarLoaded(page);
      expect(await avatarBox(page)).toEqual(zeigt);
      await page.getByRole('button', { name: /Wusste ich/ }).click();
      await expect(page.locator('.round__avatar .avatar')).toHaveAttribute('data-pose', 'zeigt');
      expect(await avatarBox(page)).toEqual(zeigt);
    });
  }

  test('AT-03.3: nach dem Vorladen kein Request beim Posenwechsel', async ({ page }) => {
    await startRound(page, 'Mots');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() =>
      ['sitting', 'pointing', 'idle', 'waving'].every((p) =>
        performance
          .getEntriesByType('resource')
          .some(
            (e) =>
              e.name.includes(`pony_${p}.png`) && (e as PerformanceResourceTiming).responseEnd > 0,
          ),
      ),
    );

    const requests: string[] = [];
    page.on('request', (req) => requests.push(req.url()));
    await page.getByRole('button', { name: 'Auf Englisch' }).click();
    await expect(page.locator('.round__avatar .avatar')).toHaveAttribute('data-pose', 'freut');
    const complete = await page
      .locator('.round__avatar .avatar img')
      .evaluate((i) => (i as HTMLImageElement).complete);
    expect(complete).toBe(true);
    expect(requests.filter((u) => u.includes('/avatars/'))).toEqual([]);
  });

  test('AT-03.4: höchstens 440 px hoch, unten ausgerichtet, nicht verzerrt', async ({ page }) => {
    await startRound(page, 'Mimi');
    const s = await page.locator('.round__avatar .avatar').evaluate((el) => {
      const img = getComputedStyle(el.querySelector('img')!);
      const r = el.getBoundingClientRect();
      return {
        height: r.height,
        ratio: r.width / r.height,
        fit: img.objectFit,
        position: img.objectPosition,
      };
    });
    expect(s.height).toBeLessThanOrEqual(440);
    expect(s.ratio).toBeCloseTo(384 / 440, 2);
    expect(s.fit).toBe('contain');
    expect(s.position).toMatch(/100%$/);
  });
});
