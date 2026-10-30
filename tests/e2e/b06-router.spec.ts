import { expect, test, type Page } from './fixtures';

/** Hält einen Button gedrückt (Long-Press, z. B. [×] seit B-25). */
async function hold(page: Page, name: string, ms = 700) {
  const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

const views = (page: Page) => page.locator('[data-view]');

/** Wählt Begleiter und Sprache und tippt auf Play (ab B-11 nötig). */
async function play(page: Page) {
  await page.getByRole('button', { name: 'Mimi' }).click();
  await page.getByRole('button', { name: 'Englisch' }).click();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
}

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
    await play(page);
    await expectOnlyView(page, 'round');
    await hold(page, 'Beenden');
    await expectOnlyView(page, 'end');
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expectOnlyView(page, 'start');
  });

  test('AT-06.3: Neuladen startet wieder auf der Startansicht', async ({ page }) => {
    await page.goto('./');
    await play(page);
    await expectOnlyView(page, 'round');
    await page.reload();
    await expectOnlyView(page, 'start');

    await play(page);
    await hold(page, 'Beenden');
    await expectOnlyView(page, 'end');
    await page.reload();
    await expectOnlyView(page, 'start');
  });
});
