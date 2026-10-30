import { expect, test, type Page } from '@playwright/test';
import words from '../../src/data/words.json' with { type: 'json' };

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function startRound(page: Page, language: 'Englisch' | 'Französisch' = 'Englisch') {
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, language).click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"]')).toBeVisible();
  const id = await page.locator('.word-card').getAttribute('data-word-id');
  return words.find((w) => w.id === id)!;
}

test.describe('B-21 Wortkarte', () => {
  test('AT-21.1: Emoji und deutsches Wort gehören zusammen', async ({ page }) => {
    const word = await startRound(page);
    expect(word).toBeDefined();
    await expect(page.locator('.word-card__emoji')).toHaveText(word.emoji);
    await expect(page.locator('.word-card__de')).toHaveText(word.de);
  });

  test('AT-21.2: Emoji groß, deutsches Wort darunter', async ({ page }) => {
    await startRound(page);
    const vh = page.viewportSize()!.height;
    const emoji = (await page.locator('.word-card__emoji').boundingBox())!;
    const german = (await page.locator('.word-card__de').boundingBox())!;
    expect(emoji.height / vh).toBeGreaterThanOrEqual(0.35);
    expect(emoji.height / vh).toBeLessThanOrEqual(0.45);
    expect(german.y).toBeGreaterThanOrEqual(emoji.y + emoji.height - 1);
  });

  for (const [language, key] of [
    ['Englisch', 'en'],
    ['Französisch', 'fr'],
  ] as const) {
    test(`AT-21.3: Fremdwort verborgen (${language})`, async ({ page }) => {
      const word = await startRound(page, language);
      const text = await page.locator('body').innerText();
      // Fremdwort darf nicht vorkommen (außer es ist identisch mit dem deutschen Wort)
      if (word[key].toLowerCase() !== word.de.toLowerCase()) {
        expect(text.toLowerCase()).not.toContain(word[key].toLowerCase());
      }
      await expect(page.locator('.round__foreign')).toHaveText('');
      await expect(page.getByRole('button', { name: /Wusste ich|Noch üben/ })).toHaveCount(0);
    });

    test(`AT-21.4: Flaggen-Button für ${language}`, async ({ page }) => {
      await startRound(page, language);
      // seit B-26: Flagge nur zur Anzeige, daneben der runde Lautsprecher-Button
      const flag = page.locator('.round__flag');
      await expect(flag).toBeVisible();
      await expect(flag).toHaveAttribute('src', key === 'en' ? /flag_gb\.svg$/ : /flag_fr\.svg$/);
      const speaker = btn(page, `Auf ${language} anhören`);
      await expect(speaker).toBeVisible();
      const box = (await speaker.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(96);
      expect(box.height).toBeGreaterThanOrEqual(96);
    });
  }

  test('AT-21.6: Wort bleibt gleich, auch nach Hochformat', async ({ page }) => {
    const word = await startRound(page);
    const vp = page.viewportSize()!;
    await page.setViewportSize({ width: vp.height, height: vp.width });
    await expect(page.getByRole('alert')).toBeVisible();
    await page.setViewportSize(vp);
    await expect(page.getByRole('alert')).toBeHidden();
    await expect(page.locator('.word-card')).toHaveAttribute('data-word-id', word.id);
    await page.waitForTimeout(300);
    await expect(page.locator('.word-card')).toHaveAttribute('data-word-id', word.id);
  });
});
