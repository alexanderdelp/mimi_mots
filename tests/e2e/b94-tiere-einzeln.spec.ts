import { expect, minSize, test, type Page } from './fixtures';
import { btn, hold, overflow, prepare, stored } from './views';

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);

async function openOther(page: Page) {
  await hold(page, '.app-header__icon');
  await page.getByRole('tab', { name: 'Sonstiges' }).click();
}

test.describe('B-94 Tiere einzeln wecken und schlafen legen', () => {
  test(
    'AT-94.1/94.5: Kacheln „Mimi“ und „Mots“ statt „Tiere aufwecken“, gleich breit, groß genug',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, { sleeping: ['mimi'] });
      await page.goto('./');
      await openOther(page);
      await expect(btn(page, 'Tiere aufwecken')).toHaveCount(0);
      await expect(view(page, 'admin').locator('.avatar, img[src*="avatars"]')).toHaveCount(0);
      const mimi = btn(page, 'Mimi');
      const mots = btn(page, 'Mots');
      await expect(mimi).toHaveAttribute('aria-pressed', 'true');
      await expect(mots).toHaveAttribute('aria-pressed', 'false');
      const a = (await mimi.boundingBox())!;
      const b = (await mots.boundingBox())!;
      expect(a.width).toBeCloseTo(b.width, 0);
      expect(a.height).toBeCloseTo(b.height, 0);
      expect(a.height).toBeGreaterThanOrEqual(minSize(88));
      expect(a.width).toBeGreaterThanOrEqual(minSize(88));
      expect(await overflow(page)).toEqual([]);
      // nach dem Umschalten gleich breit wie vorher
      await mimi.click();
      await expect(mimi).toHaveAttribute('aria-pressed', 'false');
      expect((await mimi.boundingBox())!.width).toBeCloseTo(a.width, 0);
    },
  );

  test('AT-94.2/94.3: einzeln hinlegen und wecken, gespeichert; beide → Schlafseite', async ({
    page,
  }) => {
    await prepare(page, {});
    await page.goto('./');
    await openOther(page);

    await btn(page, 'Mots').click();
    await expect(btn(page, 'Mots')).toHaveAttribute('aria-pressed', 'true');
    await expect(btn(page, 'Mimi')).toHaveAttribute('aria-pressed', 'false');
    expect((await stored(page)).rest).toEqual({ sleeping: ['mots'], since: '2026-10-30' });

    // ein Tier schläft → Startseite, es ist ausgegraut mit Schlafbild, das andere vorgewählt
    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mots')).toBeDisabled();
    await expect(btn(page, 'Mots').locator('img')).toHaveAttribute('src', /pony_sleeping/);
    await expect(btn(page, 'Mimi')).toHaveAttribute('aria-pressed', 'true');

    // beide schlafen → Schlafseite
    await openOther(page);
    await btn(page, 'Mimi').click();
    expect((await stored(page)).rest).toEqual({
      sleeping: ['mimi', 'mots'],
      since: '2026-10-30',
    });
    await btn(page, 'Zurück').click();
    await expect(view(page, 'sleep')).toBeVisible();

    // wecken: eins nach dem anderen; schläft keins mehr, ist `since` leer
    await openOther(page);
    await btn(page, 'Mots').click();
    expect((await stored(page)).rest).toEqual({ sleeping: ['mimi'], since: '2026-10-30' });
    await btn(page, 'Mimi').click();
    expect((await stored(page)).rest).toEqual({ sleeping: [], since: null });
    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mimi')).toBeEnabled();
    await expect(btn(page, 'Mots')).toBeEnabled();
  });

  test('AT-94.3: hingelegtes Tier wacht am nächsten Tag auf', async ({ page }) => {
    await prepare(page, {});
    await page.goto('./');
    await openOther(page);
    await btn(page, 'Mimi').click();
    await btn(page, 'Mots').click();
    await btn(page, 'Zurück').click();
    await expect(view(page, 'sleep')).toBeVisible();
    await page.clock.setSystemTime(new Date(2026, 9, 31, 8, 0));
    await page.reload();
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mimi')).toBeEnabled();
    await expect(btn(page, 'Mots')).toBeEnabled();
  });
});
