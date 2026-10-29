import { expect, test, type Page } from '@playwright/test';

const views = (page: Page) => page.locator('[data-view]');

async function expectOnlyView(page: Page, name: string) {
  await expect(views(page)).toHaveCount(1);
  await expect(page.locator(`[data-view="${name}"]`)).toBeVisible();
}

test.describe('B-06 Router/State', () => {
  test('AT-06.1: startet auf der Startansicht', async ({ page }) => {
    await page.goto('./');
    await expectOnlyView(page, 'start');
  });

  test('AT-06.2: Ablauf Start → Runde → Abschluss → Start', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await expectOnlyView(page, 'round');
    await page.getByRole('button', { name: 'Beenden' }).click();
    await expectOnlyView(page, 'end');
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expectOnlyView(page, 'start');
  });

  test('AT-06.3: Neuladen startet wieder auf der Startansicht', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await expectOnlyView(page, 'round');
    await page.reload();
    await expectOnlyView(page, 'start');

    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await page.getByRole('button', { name: 'Beenden' }).click();
    await expectOnlyView(page, 'end');
    await page.reload();
    await expectOnlyView(page, 'start');
  });

  test('AT-06.4: Hochformat zeigt Overlay, Ansicht bleibt erhalten', async ({ page }) => {
    const landscape = page.viewportSize()!;
    await page.goto('./');
    const overlay = page.getByRole('alert');
    await expect(overlay).toBeHidden();

    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await expectOnlyView(page, 'round');
    const roundView = await page.locator('[data-view="round"]').elementHandle();

    await page.setViewportSize({ width: landscape.height, height: landscape.width });
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('iPad drehen');
    // Overlay liegt über der Ansicht; die Ansicht ist gesperrt, Tipps erreichen sie nicht.
    await expect(page.locator('.view-root')).toHaveJSProperty('inert', true);
    const box = await page.getByRole('button', { name: 'Beenden' }).boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await page.setViewportSize(landscape);
    await expect(overlay).toBeHidden();
    await expectOnlyView(page, 'round');
    // Dieselbe Ansicht (kein Neuaufbau), Zustand bleibt erhalten.
    expect(await roundView!.evaluate((el) => el.isConnected)).toBe(true);
  });

  test('AT-06.5: Avatar-Vorschau unter ?vorschau=avatar erreichbar', async ({ page }) => {
    await page.goto('./?vorschau=avatar');
    await expect(page.locator('.avatar')).toHaveCount(2);
    await expect(views(page)).toHaveCount(0);
  });
});
