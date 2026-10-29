import { expect, test, type Page } from '@playwright/test';
import { fakeMedia } from './helpers';

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const round = (page: Page) => page.locator('[data-view="round"]');
const MIN = 60_000;

test.beforeEach(async ({ page }) => {
  await fakeMedia(page);
  await page.clock.install();
});

async function startRound(page: Page, duration: '5 Minuten' | '10 Minuten' = '5 Minuten') {
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, 'Französisch').click();
  await btn(page, duration).click();
  await btn(page, 'Los geht’s').click();
  await expect(round(page)).toBeVisible();
}

/** Zeitsprung (ohne jeden 250-ms-Takt einzeln abzuarbeiten), danach ein Takt. */
async function advance(page: Page, ms: number) {
  await page.clock.fastForward(ms);
  await page.clock.runFor(300);
}

async function setHidden(page: Page, hidden: boolean) {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (h ? 'hidden' : 'visible'),
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test.describe('B-40 Timer-Logik', () => {
  test('AT-40.1: 5 Minuten ab dem ersten Wort', async ({ page }) => {
    await startRound(page);
    await advance(page, 5 * MIN - 2000);
    await expect(round(page)).toHaveAttribute('data-expired', 'false');
    await advance(page, 2000);
    await expect(round(page)).toHaveAttribute('data-expired', 'true');
  });

  test('AT-40.2: 10 Minuten', async ({ page }) => {
    await startRound(page, '10 Minuten');
    await advance(page, 10 * MIN - 2000);
    await expect(round(page)).toHaveAttribute('data-expired', 'false');
    await advance(page, 2000);
    await expect(round(page)).toHaveAttribute('data-expired', 'true');
  });

  test('AT-40.3: Zeit auf der Startseite zählt nicht', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Mimi').click();
    await btn(page, 'Französisch').click();
    await advance(page, 4 * MIN);
    await btn(page, 'Los geht’s').click();
    await advance(page, 4 * MIN);
    await expect(round(page)).toHaveAttribute('data-expired', 'false');
    await advance(page, 1 * MIN + 500);
    await expect(round(page)).toHaveAttribute('data-expired', 'true');
  });

  test('AT-40.4: Pause im Hintergrund', async ({ page }) => {
    await startRound(page);
    await advance(page, 2 * MIN);
    await setHidden(page, true);
    await advance(page, 30 * MIN);
    await setHidden(page, false);
    await expect(round(page)).toHaveAttribute('data-expired', 'false');
    await advance(page, 3 * MIN - 2000);
    await expect(round(page)).toHaveAttribute('data-expired', 'false');
    await advance(page, 2000);
    await expect(round(page)).toHaveAttribute('data-expired', 'true');
  });

  test('AT-40.5: Pause im Hochformat', async ({ page }) => {
    await startRound(page);
    const landscape = page.viewportSize()!;
    await advance(page, 2 * MIN);
    await page.setViewportSize({ width: landscape.height, height: landscape.width });
    await expect(page.getByRole('alert')).toBeVisible();
    await advance(page, 30 * MIN);
    await page.setViewportSize(landscape);
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(round(page)).toHaveAttribute('data-expired', 'false');
    await advance(page, 3 * MIN + 500);
    await expect(round(page)).toHaveAttribute('data-expired', 'true');
  });

  test('AT-40.6: Ablauf ändert die Runde nicht', async ({ page }) => {
    await startRound(page);
    const word = await page.locator('.word-card').getAttribute('data-word-id');
    const text = await round(page).innerText();
    await advance(page, 5 * MIN + 1000);
    await expect(round(page)).toHaveAttribute('data-expired', 'true');
    await expect(page.locator('.word-card')).toHaveAttribute('data-word-id', word!);
    expect(await round(page).innerText()).toBe(text);
    await expect(page.getByRole('alert')).toBeHidden();
  });
});
