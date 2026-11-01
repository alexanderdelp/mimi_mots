import { expect, test, type Page, skipRotationOnPhone } from './fixtures';
import { fakeMedia } from './helpers';
import { btn } from './views';

const overlay = (page: Page) => page.getByRole('alert');

async function toPortrait(page: Page) {
  skipRotationOnPhone();
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: vp.width });
  await expect(overlay(page)).toBeVisible();
  return vp;
}

test.beforeEach(async ({ page }) => {
  await fakeMedia(page);
});

test.describe('B-52 Hochformat-Overlay', () => {
  test('AT-52.1/AT-72.1: Rad schlagender Begleiter und Dreh-Symbol, kein Text, decken alles ab', async ({
    page,
  }) => {
    await page.goto('./');
    await btn(page, 'Mots').click();
    await toPortrait(page);
    await expect(overlay(page).locator('.avatar img')).toHaveAttribute(
      'src',
      /pony_cartwheel\.png$/,
    );
    await expect(overlay(page).locator('svg.portrait-overlay__icon')).toHaveAttribute(
      'data-icon',
      'rotate',
    );
    await expect(overlay(page)).toHaveText('');
    await expect(overlay(page)).toHaveAccessibleName('iPad drehen');
    const vp = page.viewportSize()!;
    expect(await overlay(page).boundingBox()).toEqual({
      x: 0,
      y: 0,
      width: vp.width,
      height: vp.height,
    });
    await expect(overlay(page)).toHaveCSS('background-color', 'rgb(248, 244, 251)');
  });

  test('AT-52.2/AT-72.1: ohne Wahl Mimi, nach Wahl Mots – jeweils beim Radschlagen', async ({
    page,
  }) => {
    await page.goto('./');
    const landscape = await toPortrait(page);
    await expect(overlay(page).locator('.avatar img')).toHaveAttribute(
      'src',
      /cat_cartwheel\.png$/,
    );
    await page.setViewportSize(landscape);
    await expect(overlay(page)).toBeHidden();
    await btn(page, 'Mots').click();
    await toPortrait(page);
    await expect(overlay(page).locator('.avatar img')).toHaveAttribute(
      'src',
      /pony_cartwheel\.png$/,
    );
  });

  test('AT-72.2/AT-77.1: Bilder scharf genug und nicht übergroß', async ({ page }) => {
    await page.goto('./');
    // Radschlag (≤ 440 px hoch angezeigt) und Schlafbild (≤ 220 px breit) in doppelter Auflösung
    for (const [file, side, min] of [
      ['cat_cartwheel.png', 1, 880],
      ['pony_cartwheel.png', 1, 880],
      ['cat_sleeping.png', 0, 440],
      ['pony_sleeping.png', 0, 440],
    ] as const) {
      const size = await page.evaluate(async (src) => {
        const img = new Image();
        img.src = `avatars/${src}`;
        await img.decode();
        return [img.naturalWidth, img.naturalHeight];
      }, file);
      expect(size[side], file).toBeGreaterThanOrEqual(min);
      expect(size[side], file).toBeLessThanOrEqual(min * 1.5);
    }
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
