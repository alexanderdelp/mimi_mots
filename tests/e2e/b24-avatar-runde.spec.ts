import { expect, test, type Page } from './fixtures';
import { btn } from './views';

const avatar = (page: Page) => page.locator('.round__avatar .avatar');
const avatarSrc = (page: Page) => avatar(page).locator('img').getAttribute('src');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: { cancel() {}, speak() {}, getVoices: () => [] },
    });
  });
});

async function startRound(page: Page, companion: 'Mimi' | 'Mots' = 'Mimi') {
  await page.goto('./');
  await btn(page, companion).click();
  await btn(page, 'Französisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(avatar(page)).toBeVisible();
}

test.describe('B-24 Avatar in der Runde', () => {
  test(
    'AT-24.1: Begleiter links neben der Karte, Pose „zeigt“',
    { tag: '@layout' },
    async ({ page }) => {
      await startRound(page);
      await expect(avatar(page)).toHaveAttribute('data-pose', 'zeigt');
      expect(await avatarSrc(page)).toMatch(/cat_pointing\.png$/);
      const a = (await avatar(page).boundingBox())!;
      const card = (await page.locator('.word-card').boundingBox())!;
      expect(a.x + a.width).toBeLessThanOrEqual(card.x);
    },
  );

  test('AT-24.2: nach dem Aufdecken „freut“, bleibt dabei', async ({ page }) => {
    await startRound(page);
    const flag = btn(page, 'Auf Französisch anhören');
    await flag.click();
    await expect(avatar(page)).toHaveAttribute('data-pose', 'freut');
    expect(await avatarSrc(page)).toMatch(/cat_idle\.png$/);
    await flag.click();
    await flag.click();
    await expect(avatar(page)).toHaveAttribute('data-pose', 'freut');
  });

  test('AT-24.3: nächstes Wort → wieder „zeigt“', async ({ page }) => {
    await startRound(page);
    for (const rating of [/Wusste ich/, /Noch üben/]) {
      await btn(page, 'Auf Französisch anhören').click();
      await expect(avatar(page)).toHaveAttribute('data-pose', 'freut');
      await page.getByRole('button', { name: rating }).click();
      await expect(avatar(page)).toHaveAttribute('data-pose', 'zeigt');
      expect(await avatarSrc(page)).toMatch(/cat_pointing\.png$/);
    }
  });

  test('AT-24.4: Mots zeigt Pony-Bilder', async ({ page }) => {
    await startRound(page, 'Mots');
    expect(await avatarSrc(page)).toMatch(/pony_pointing\.png$/);
    await btn(page, 'Auf Französisch anhören').click();
    await expect(avatar(page).locator('img')).toHaveAttribute('src', /pony_idle\.png$/);
  });

  test(
    'AT-24.5: alle Posen geladen, ≤ 440 px, im Bild, nicht animiert',
    { tag: '@layout' },
    async ({ page }) => {
      await startRound(page);
      await page.waitForFunction(() =>
        ['sitting', 'pointing', 'idle', 'waving'].every((p) =>
          performance.getEntriesByType('resource').some((e) => e.name.includes(`cat_${p}.png`)),
        ),
      );
      const vp = page.viewportSize()!;
      const box = (await avatar(page).boundingBox())!;
      expect(box.height).toBeLessThanOrEqual(440);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
      await btn(page, 'Auf Französisch anhören').click();
      const animations = await avatar(page).evaluate((el) => [
        ...el.getAnimations(),
        ...el.querySelector('img')!.getAnimations(),
      ]);
      expect(animations).toHaveLength(0);
      const transition = await avatar(page)
        .locator('img')
        .evaluate((i) => getComputedStyle(i).transitionDuration);
      expect(transition).toMatch(/^0s/);
    },
  );
});
