import { expect, test, type Page } from './fixtures';
import { fakeMedia, mediaCalls } from './helpers';
import { btn, stored } from './views';

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);
const speaker = (page: Page) => btn(page, 'Auf Französisch anhören');
const MIN = 60_000;

test.beforeEach(async ({ page }) => {
  await fakeMedia(page);
  await page.clock.install();
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, 'Französisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(view(page, 'round')).toBeVisible();
});

async function expire(page: Page) {
  await page.clock.fastForward(5 * MIN + 1000);
  await page.clock.runFor(300);
  await expect(view(page, 'round')).toHaveAttribute('data-expired', 'true');
}

test.describe('B-42 Rundenende', () => {
  test('AT-42.1: Ablauf vor dem Aufdecken', async ({ page }) => {
    const word = await page.locator('.word-card').getAttribute('data-word-id');
    await expire(page);
    await expect(page.locator('.word-card')).toHaveAttribute('data-word-id', word!);
    for (let i = 0; i < 3; i++) await speaker(page).click();
    const plays = (await mediaCalls(page)).filter((c) => c.op === 'play');
    expect(plays).toHaveLength(3);
    for (const p of plays) expect(p).toMatchObject({ time: 0 });
    await btn(page, 'Noch üben').click();
    await expect(view(page, 'end')).toBeVisible();
  });

  test('AT-42.2: Ablauf nach dem Aufdecken', async ({ page }) => {
    await speaker(page).click();
    await expect(btn(page, 'Wusste ich')).toBeVisible();
    await expire(page);
    await expect(btn(page, 'Wusste ich')).toBeVisible();
    await btn(page, 'Wusste ich').click();
    await expect(view(page, 'end')).toBeVisible();
  });

  test('AT-42.3: letzte Bewertung wird gespeichert', async ({ page }) => {
    const word = await page.locator('.word-card').getAttribute('data-word-id');
    await expire(page);
    await speaker(page).click();
    await btn(page, 'Wusste ich').click();
    await expect(view(page, 'end')).toBeVisible();
    const progress = (await stored(page)).progress.fr;
    expect(progress[word!]).toMatchObject({ box: 1, seen: 1 });
  });

  test('AT-42.4: vor Ablauf geht es zum nächsten Wort', async ({ page }) => {
    const word = await page.locator('.word-card').getAttribute('data-word-id');
    await speaker(page).click();
    await btn(page, 'Wusste ich').click();
    await expect(view(page, 'round')).toBeVisible();
    await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', word!);
  });

  test('AT-42.5: [×] beendet auch nach Ablauf', async ({ page }) => {
    await expire(page);
    const box = (await btn(page, 'Beenden').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.clock.runFor(700);
    await page.mouse.up();
    await expect(view(page, 'end')).toBeVisible();
  });
});
