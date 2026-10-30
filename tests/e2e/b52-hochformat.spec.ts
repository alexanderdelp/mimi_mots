import { expect, test, type Page } from '@playwright/test';
import { fakeMedia } from './helpers';

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const overlay = (page: Page) => page.getByRole('alert');

async function toPortrait(page: Page) {
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await expect(overlay(page)).toBeVisible();
  return vp;
}

test.beforeEach(async ({ page }) => {
  await fakeMedia(page);
});

test.describe('B-52 Hochformat-Overlay', () => {
  test('AT-52.1: Begleiter, Dreh-Symbol und Text decken alles ab', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Mots').click();
    await toPortrait(page);
    await expect(overlay(page).locator('.avatar')).toHaveAttribute('data-pose', 'ruhig');
    await expect(overlay(page).locator('svg.portrait-overlay__icon')).toHaveAttribute(
      'data-icon',
      'rotate',
    );
    await expect(overlay(page)).toHaveText('iPad drehen');
    const vp = page.viewportSize()!;
    expect(await overlay(page).boundingBox()).toEqual({
      x: 0,
      y: 0,
      width: vp.width,
      height: vp.height,
    });
    await expect(overlay(page)).toHaveCSS('background-color', 'rgb(248, 244, 251)');
  });

  test('AT-52.2: ohne Wahl Mimi, nach Wahl Mots', async ({ page }) => {
    await page.goto('./');
    const landscape = await toPortrait(page);
    await expect(overlay(page).locator('.avatar img')).toHaveAttribute('src', /cat_sitting\.png$/);
    await page.setViewportSize(landscape);
    await expect(overlay(page)).toBeHidden();
    await btn(page, 'Mots').click();
    await toPortrait(page);
    await expect(overlay(page).locator('.avatar img')).toHaveAttribute('src', /pony_sitting\.png$/);
  });

  test('AT-52.3: Ansicht bleibt erhalten, gleiches Wort', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Mimi').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Los geht’s').click();
    const word = await page.locator('.word-card').getAttribute('data-word-id');
    const landscape = await toPortrait(page);
    await expect(page.locator('.view-root')).toHaveJSProperty('inert', true);
    await page.setViewportSize(landscape);
    await expect(overlay(page)).toBeHidden();
    await expect(page.locator('[data-view="round"]')).toBeVisible();
    await expect(page.locator('.word-card')).toHaveAttribute('data-word-id', word!);
    await expect(page.locator('.view-root')).toHaveJSProperty('inert', false);
  });

  test('AT-52.6: statisch, keine Animation', async ({ page }) => {
    await page.goto('./');
    await toPortrait(page);
    const animations = await overlay(page).evaluate(
      (el) => [el, ...el.querySelectorAll('*')].flatMap((n) => n.getAnimations()).length,
    );
    expect(animations).toBe(0);
  });
});
