import { expect, test, type Page } from '@playwright/test';
import words from '../../src/data/words.json' with { type: 'json' };
import { fakeMedia, mediaCalls } from './helpers';

const KEY = 'mimi-mots:v1';
const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const speaker = (page: Page) => btn(page, 'Auf Japanisch anhören');

async function startRound(page: Page) {
  await page.goto('./');
  await btn(page, 'Mots').click();
  await btn(page, 'Japanisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"]')).toBeVisible();
}

const currentWord = async (page: Page) => {
  const id = await page.locator('.word-card').getAttribute('data-word-id');
  return words.find((w) => w.id === id)!;
};

test.describe('B-67 Japanisch', () => {
  test('AT-67.4: Japanisch ist wählbar und wird gemerkt', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Japanisch').click();
    await expect(btn(page, 'Japanisch')).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(btn(page, 'Japanisch')).toHaveAttribute('aria-pressed', 'true');
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
    expect(stored.settings.language).toBe('ja');
  });

  test('AT-67.5: Lernrunde spielt die japanische MP3 und deckt das Wort auf', async ({ page }) => {
    await fakeMedia(page);
    await startRound(page);
    await expect(page.locator('.round__flag')).toHaveAttribute('src', /flag_jp\.svg$/);
    for (let i = 0; i < 5; i++) {
      const word = await currentWord(page);
      await speaker(page).click();
      const foreign = page.locator('.round__foreign');
      await expect(foreign).toHaveText(word.ja);
      await expect(foreign).toHaveAttribute('lang', 'ja');
      const fits = await foreign.evaluate(
        (el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight,
      );
      expect(fits).toBe(true);
      const plays = (await mediaCalls(page)).filter((c) => c.op === 'play');
      expect(plays.at(-1)).toEqual({
        op: 'play',
        src: `/mimi_mots/audio/ja/${word.id}.mp3`,
        time: 0,
      });
      await btn(page, 'Noch üben').click();
      await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', word.id);
    }
    expect((await mediaCalls(page)).filter((c) => c.op === 'speak')).toEqual([]);
  });

  test('AT-67.5: nur japanische Dateien werden vorgeladen', async ({ page }) => {
    await fakeMedia(page);
    const requested: string[] = [];
    page.on('request', (r) => {
      const path = new URL(r.url()).pathname;
      if (path.includes('/audio/')) requested.push(path);
    });
    await startRound(page);
    await expect
      .poll(() => requested.filter((p) => p.includes('/audio/ja/')).length)
      .toBe(words.length);
    expect(requested.filter((p) => !p.includes('/audio/ja/'))).toEqual([]);
  });

  test('AT-67.5: fehlende Datei → Web Speech ja-JP', async ({ page }) => {
    await fakeMedia(page);
    await page.route('**/audio/**', (route) => route.fulfill({ status: 404, body: '' }));
    await startRound(page);
    const word = await currentWord(page);
    await speaker(page).click();
    await expect(page.locator('.round__foreign')).toHaveText(word.ja);
    const speaks = (await mediaCalls(page)).filter((c) => c.op === 'speak');
    expect(speaks).toEqual([{ op: 'speak', text: word.ja, lang: 'ja-JP' }]);
  });
});
