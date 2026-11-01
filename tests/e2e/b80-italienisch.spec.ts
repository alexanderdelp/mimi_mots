import { expect, test, type Page } from './fixtures';
import words from '../../src/data/words.json' with { type: 'json' };
import { enableLanguages, fakeMedia, mediaCalls, vocabularyIds } from './helpers';
import { btn, stored } from './views';

const speaker = (page: Page) => btn(page, 'Auf Italienisch anhören');

async function startRound(page: Page) {
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, 'Italienisch').click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"]')).toBeVisible();
}

const currentWord = async (page: Page) => {
  const id = await page.locator('.word-card').getAttribute('data-word-id');
  return words.find((w) => w.id === id)!;
};

test.describe('B-80 Italienisch', () => {
  test('AT-80.2/AT-81.1: standardmäßig ausgeschaltet – fehlt auf der Startseite', async ({
    page,
  }) => {
    await page.goto('./');
    await expect(btn(page, 'Italienisch')).toHaveCount(0);
  });

  test.describe('eingeschaltet', () => {
    test.beforeEach(async ({ page }) => {
      await enableLanguages(page, ['en', 'fr', 'it']);
    });

    test('AT-80.2: Italienisch ist wählbar und wird gemerkt', async ({ page }) => {
      await page.goto('./');
      await btn(page, 'Italienisch').click();
      await expect(btn(page, 'Italienisch')).toHaveAttribute('aria-pressed', 'true');
      await page.reload();
      await expect(btn(page, 'Italienisch')).toHaveAttribute('aria-pressed', 'true');
      const saved = await stored(page);
      expect(saved.settings.language).toBe('it');
    });

    test('AT-80.3: Lernrunde spielt die italienische MP3 und deckt das Wort auf', async ({
      page,
    }) => {
      await fakeMedia(page);
      await startRound(page);
      await expect(page.locator('.round__flag')).toHaveAttribute('src', /flag_it\.svg$/);
      for (let i = 0; i < 5; i++) {
        const word = await currentWord(page);
        expect(vocabularyIds('it'), 'AT-84.2: nur Wörter mit gewählter Aufnahme').toContain(
          word.id,
        );
        await speaker(page).click();
        const foreign = page.locator('.round__foreign');
        await expect(foreign).toHaveText(word.it);
        await expect(foreign).toHaveAttribute('lang', 'it');
        const plays = (await mediaCalls(page)).filter((c) => c.op === 'play');
        expect(plays.at(-1)).toEqual({
          op: 'play',
          src: `/mimi_mots/audio/it/${word.id}.mp3`,
          time: 0,
        });
        await btn(page, 'Noch üben').click();
        await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', word.id);
      }
      expect((await mediaCalls(page)).filter((c) => c.op === 'speak')).toEqual([]);
    });

    test('AT-84.2: nur Dateien des Wortschatzes werden vorgeladen', async ({ page }) => {
      await fakeMedia(page);
      const requested: string[] = [];
      page.on('request', (r) => {
        const path = new URL(r.url()).pathname;
        if (path.includes('/audio/')) requested.push(path.split('/').pop()!);
      });
      await startRound(page);
      const expected = vocabularyIds('it').map((id) => `${id}.mp3`);
      await expect.poll(() => requested.length).toBe(expected.length);
      expect(requested.sort()).toEqual(expected.sort());
    });

    test('AT-80.3: fehlende Datei → Web Speech it-IT', async ({ page }) => {
      await fakeMedia(page);
      await page.route('**/audio/**', (route) => route.fulfill({ status: 404, body: '' }));
      await startRound(page);
      const word = await currentWord(page);
      await speaker(page).click();
      await expect(page.locator('.round__foreign')).toHaveText(word.it);
      const speaks = (await mediaCalls(page)).filter((c) => c.op === 'speak');
      expect(speaks).toEqual([{ op: 'speak', text: word.it, lang: 'it-IT' }]);
    });
  });
});
