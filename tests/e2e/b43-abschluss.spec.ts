import { expect, test, type Page } from '@playwright/test';
import { fakeMedia } from './helpers';

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);

test.beforeEach(async ({ page }) => {
  await fakeMedia(page);
  await page.clock.install();
});

async function startRound(page: Page, companion: 'Mimi' | 'Mots' = 'Mimi') {
  await page.goto('./');
  await btn(page, companion).click();
  await btn(page, 'Französisch').click();
  await btn(page, '3 Minuten').click();
  await btn(page, 'Los geht’s').click();
  await expect(view(page, 'round')).toBeVisible();
}

/** Beendet die Runde per Gedrückthalten von [×]. */
async function closeRound(page: Page) {
  const box = (await btn(page, 'Beenden').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.clock.runFor(700);
  await page.mouse.up();
  await expect(view(page, 'end')).toBeVisible();
}

async function avatarLoaded(page: Page) {
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('[data-view="end"] .avatar img');
    return !!img && img.complete && img.naturalWidth > 0;
  });
}

test.describe('B-43 Abschlussansicht', () => {
  for (const [companion, file] of [
    ['Mimi', 'cat_waving'],
    ['Mots', 'pony_waving'],
  ] as const) {
    test(`AT-43.1: ${companion} winkt groß`, async ({ page }) => {
      await startRound(page, companion);
      await closeRound(page);
      await expect(view(page, 'end').locator('header.app-header h1')).toHaveText('Mimi & Mots');
      const avatar = view(page, 'end').locator('.avatar');
      await expect(avatar).toHaveAttribute('data-pose', 'winkt');
      await expect(avatar.locator('img')).toHaveAttribute('src', new RegExp(`${file}\\.png$`));
      const box = (await avatar.boundingBox())!;
      const vh = page.viewportSize()!.height;
      expect(box.height).toBeLessThanOrEqual(440);
      expect(box.height).toBeGreaterThanOrEqual(vh * 0.4);
    });
  }

  test('AT-43.3: Haus-Button führt zum Start mit gemerkter Auswahl', async ({ page }) => {
    await startRound(page, 'Mots');
    await closeRound(page);
    const home = btn(page, 'Zurück');
    expect(await home.innerText()).toBe('');
    await expect(home.locator('svg')).toHaveAttribute('data-icon', 'home');
    await expect(home).toHaveCSS('background-color', 'rgb(106, 76, 156)');
    const box = (await home.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(96);
    expect(box.height).toBe(box.width);
    await home.click();
    await expect(view(page, 'start')).toBeVisible();
    // Sprache bleibt; Mots schläft seit B-65, Mimi und 7 Minuten sind vorausgewählt
    for (const name of ['Mimi', 'Französisch', '7 Minuten']) {
      await expect(btn(page, name)).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('AT-43.4: gleicher Abschluss nach Zeitablauf', async ({ page }) => {
    await startRound(page);
    await page.clock.fastForward(3 * 60_000 + 1000);
    await page.clock.runFor(300);
    await btn(page, 'Auf Französisch anhören').click();
    await btn(page, 'Noch üben').click();
    await expect(view(page, 'end')).toBeVisible();
    await expect(view(page, 'end').locator('.end__text')).toHaveText('Bis zum nächsten Mal!');
    await expect(view(page, 'end').locator('.avatar')).toHaveAttribute('data-pose', 'winkt');
    await expect(btn(page, 'Zurück')).toBeVisible();
  });

  test('AT-43.5: passt auf den Bildschirm, Screenshot', async ({ page }) => {
    await startRound(page);
    await closeRound(page);
    await avatarLoaded(page);
    const vp = page.viewportSize()!;
    const parts = await view(page, 'end')
      .locator('header.app-header, .avatar, .end__text, .home-button')
      .evaluateAll((els) =>
        els.map((e) => ({ n: e.className, ...e.getBoundingClientRect().toJSON() })),
      );
    for (const p of parts) {
      expect(p.left, p.n).toBeGreaterThanOrEqual(0);
      expect(p.top, p.n).toBeGreaterThanOrEqual(0);
      expect(p.right, p.n).toBeLessThanOrEqual(vp.width);
      expect(p.bottom, p.n).toBeLessThanOrEqual(vp.height);
    }
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const [a, b] = [parts[i], parts[j]];
        const overlap =
          a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlap, `${a.n} / ${b.n}`).toBe(false);
      }
    }
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('abschluss.png');
  });
});
