import { expect, test, type Page } from '@playwright/test';

const KEY = 'mimi-mots:v1';
const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const close = (page: Page) => btn(page, 'Beenden');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: { cancel() {}, speak() {}, getVoices: () => [] },
    });
  });
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, 'Englisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"]')).toBeVisible();
});

async function pressOnClose(page: Page) {
  const box = (await close(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  return box;
}

test.describe('B-25 Abbrechen', () => {
  test('AT-25.1: [×] oben links, ≥ 88 px, unaufdringlich', async ({ page }) => {
    const vp = page.viewportSize()!;
    const box = (await close(page).boundingBox())!;
    expect(box.x).toBeLessThan(vp.width * 0.1);
    // seit B-26 direkt unter der Kopfleiste
    const header = (await page.locator('header.app-header').boundingBox())!;
    // seit B-27 links in der Kopfleiste
    expect(box.y).toBeGreaterThanOrEqual(header.y);
    expect(box.y + box.height).toBeLessThanOrEqual(header.y + header.height);
    expect(box.width).toBeGreaterThanOrEqual(88);
    expect(box.height).toBeGreaterThanOrEqual(88);
    await expect(close(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    expect(await close(page).evaluate((el) => getComputedStyle(el).boxShadow)).toContain(
      'rgb(74, 68, 88) 0px 0px 0px 2px inset',
    );
  });

  test('AT-25.2: kurzer Tipp beendet nicht', async ({ page }) => {
    await close(page).click();
    await close(page).tap();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-view="round"]')).toBeVisible();
  });

  test('AT-25.3: Halten ≥ 600 ms → Abschluss', async ({ page }) => {
    await pressOnClose(page);
    await page.waitForTimeout(700);
    await expect(page.locator('[data-view="end"]')).toBeVisible();
    await page.mouse.up();
  });

  test('AT-25.4: früh loslassen oder wegziehen bricht ab', async ({ page }) => {
    await pressOnClose(page);
    await page.waitForTimeout(400);
    await page.mouse.up();
    await page.waitForTimeout(400);
    await expect(page.locator('[data-view="round"]')).toBeVisible();

    const box = await pressOnClose(page);
    await page.waitForTimeout(300);
    await page.mouse.move(box.x + box.width * 3, box.y + box.height * 3);
    await page.waitForTimeout(500);
    await page.mouse.up();
    await expect(page.locator('[data-view="round"]')).toBeVisible();

    // erneutes Halten zählt neu und volle 600 ms
    await pressOnClose(page);
    await page.waitForTimeout(400);
    await expect(page.locator('[data-view="round"]')).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-view="end"]')).toBeVisible();
    await page.mouse.up();
  });

  test('AT-25.5: sichtbar gedrückt während des Haltens', async ({ page }) => {
    await pressOnClose(page);
    await expect(close(page)).toHaveCSS('background-color', 'rgb(237, 228, 244)');
    await page.mouse.up();
    await expect(close(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('AT-25.6: Lernstand bleibt, unbewertetes Wort zählt nicht', async ({ page }) => {
    const rated: string[] = [];
    for (let i = 0; i < 2; i++) {
      rated.push((await page.locator('.word-card').getAttribute('data-word-id'))!);
      await btn(page, 'Auf Englisch anhören').click();
      await page.getByRole('button', { name: /Wusste ich/ }).click();
    }
    const current = (await page.locator('.word-card').getAttribute('data-word-id'))!;
    await btn(page, 'Auf Englisch anhören').click(); // aufgedeckt, aber nicht bewertet
    await pressOnClose(page);
    await page.waitForTimeout(700);
    await page.mouse.up();
    await expect(page.locator('[data-view="end"]')).toBeVisible();
    const progress = await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)!).progress.en,
      KEY,
    );
    expect(Object.keys(progress).sort()).toEqual([...rated].sort());
    expect(progress[current]).toBeUndefined();
  });
});

test.describe('B-25 Fortschrittsring', () => {
  const ring = (page: Page) =>
    page.locator('.close-button__ring circle').evaluate((c) => {
      const s = getComputedStyle(c);
      return { offset: parseFloat(s.strokeDashoffset), opacity: parseFloat(s.opacity) };
    });

  test('AT-25.7: Ring füllt sich beim Halten, verschwindet beim Loslassen', async ({ page }) => {
    expect((await ring(page)).opacity).toBe(0);
    await pressOnClose(page);
    await page.waitForTimeout(300);
    const half = await ring(page);
    expect(half.opacity).toBe(1);
    expect(half.offset).toBeGreaterThan(15);
    expect(half.offset).toBeLessThan(85);
    await page.mouse.up();
    expect(await ring(page)).toEqual({ offset: 100, opacity: 0 });
    await expect(page.locator('[data-view="round"]')).toBeVisible();
  });

  test('AT-25.7: bei „Bewegung reduzieren“ sofort voll', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await pressOnClose(page);
    await page.waitForTimeout(50);
    expect(await ring(page)).toEqual({ offset: 0, opacity: 1 });
    await page.mouse.up();
  });
});
