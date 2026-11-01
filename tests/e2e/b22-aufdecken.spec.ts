import { expect, test, type Page } from './fixtures';
import words from '../../src/data/words.json' with { type: 'json' };
import { fakeMedia, mediaCalls } from './helpers';
import { btn } from './views';

/** Seit B-31 Wiedergabe der MP3; Attrappe für Audio und Sprachausgabe. */
const fakeSpeech = (page: Page) => fakeMedia(page);

async function startRound(page: Page, language: 'Englisch' | 'Französisch') {
  await page.goto('./');
  await btn(page, 'Mots').click();
  await btn(page, language).click();
  await btn(page, 'Los geht’s').click();
  return currentWord(page);
}

async function currentWord(page: Page) {
  const id = await page.locator('.word-card').getAttribute('data-word-id');
  return words.find((w) => w.id === id)!;
}

async function expectForeignFits(page: Page) {
  const fit = await page.locator('.round__foreign').evaluate((el) => ({
    fitsX: el.scrollWidth <= el.clientWidth,
    fitsY: el.scrollHeight <= el.clientHeight,
  }));
  expect(fit).toEqual({ fitsX: true, fitsY: true });
}

const flagName = {
  Englisch: 'Auf Englisch anhören',
  Französisch: 'Auf Französisch anhören',
} as const;
const key = { Englisch: 'en', Französisch: 'fr' } as const;

test.describe('B-22 Aufdecken', () => {
  for (const language of ['Englisch', 'Französisch'] as const) {
    test(
      `AT-22.1: Fremdwort erscheint und passt (${language})`,
      { tag: '@layout' },
      async ({ page }) => {
        await fakeSpeech(page);
        await startRound(page, language);
        // mehrere Wörter einer Runde, damit auch lange vorkommen (seit B-65 schläft der
        // Begleiter nach jeder Runde, deshalb nicht mehr eine Runde pro Wort)
        for (let i = 0; i < 6; i++) {
          const word = await currentWord(page);
          await btn(page, flagName[language]).click();
          await expect(page.locator('.round__foreign')).toHaveText(word[key[language]]);
          await expectForeignFits(page);
          await btn(page, 'Noch üben').click();
          await expect(page.locator('.word-card')).not.toHaveAttribute('data-word-id', word.id);
        }
      },
    );
  }

  test('AT-22.5: kein Vorlesen vor dem ersten Tipp', async ({ page }) => {
    await fakeSpeech(page);
    await startRound(page, 'Englisch');
    await page.waitForTimeout(500);
    expect((await mediaCalls(page)).filter((c) => c.op === 'speak' || c.op === 'play')).toEqual([]);
  });

  test('AT-22.6: ohne Sprachausgabe trotzdem aufdecken', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { value: undefined });
    });
    const word = await startRound(page, 'Englisch');
    await btn(page, 'Auf Englisch anhören').click();
    await expect(page.locator('.round__foreign')).toHaveText(word.en);
    expect(errors).toEqual([]);
  });
});
