import { expect, test, type Page } from '@playwright/test';
import words from '../../src/data/words.json' with { type: 'json' };

type SpeechCall = { op: 'cancel' } | { op: 'speak'; text: string; lang: string };

const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

/** Ersetzt die Sprachausgabe durch eine Attrappe, die alle Aufrufe mitschreibt. */
async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    (window as unknown as { __speech: unknown[] }).__speech = calls;
    class FakeUtterance {
      lang = '';
      voice = null;
      rate = 1;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        cancel: () => calls.push({ op: 'cancel' }),
        speak: (u: FakeUtterance) => calls.push({ op: 'speak', text: u.text, lang: u.lang }),
        getVoices: () => [],
      },
    });
  });
}

const speechCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __speech: SpeechCall[] }).__speech);

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

const flagName = { Englisch: 'Auf Englisch', Französisch: 'Auf Französisch' } as const;
const key = { Englisch: 'en', Französisch: 'fr' } as const;
const lang = { Englisch: 'en-GB', Französisch: 'fr-FR' } as const;

test.describe('B-22 Aufdecken', () => {
  for (const language of ['Englisch', 'Französisch'] as const) {
    test(`AT-22.1: Fremdwort erscheint und passt (${language})`, async ({ page }) => {
      await fakeSpeech(page);
      await startRound(page, language);
      // mehrere Runden, damit auch lange Wörter vorkommen
      for (let i = 0; i < 6; i++) {
        const word = await currentWord(page);
        await btn(page, flagName[language]).click();
        await expect(page.locator('.round__foreign')).toHaveText(word[key[language]]);
        await expectForeignFits(page);
        await btn(page, 'Beenden').click();
        await btn(page, 'Zurück').click();
        await btn(page, 'Los geht’s').click();
      }
    });

    test(`AT-22.2: genau einmal vorgelesen (${language})`, async ({ page }) => {
      await fakeSpeech(page);
      const word = await startRound(page, language);
      await btn(page, flagName[language]).click();
      const speaks = (await speechCalls(page)).filter((c) => c.op === 'speak');
      expect(speaks).toEqual([{ op: 'speak', text: word[key[language]], lang: lang[language] }]);
    });
  }

  test('AT-22.3: erneuter Tipp startet von vorn', async ({ page }) => {
    await fakeSpeech(page);
    const word = await startRound(page, 'Französisch');
    for (let i = 0; i < 3; i++) await btn(page, 'Auf Französisch').click();
    const calls = await speechCalls(page);
    const ops = calls.map((c) => c.op);
    expect(ops).toEqual(['cancel', 'speak', 'cancel', 'speak', 'cancel', 'speak']);
    await expect(page.locator('.round__foreign')).toHaveText(word.fr);
  });

  test('AT-22.4: Aufdecken verschiebt nichts', async ({ page }) => {
    await fakeSpeech(page);
    await startRound(page, 'Englisch');
    const boxes = () =>
      page
        .locator('.close-button, .word-card, .flag-button, .round__foreign')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
    const before = await boxes();
    await btn(page, 'Auf Englisch').click();
    await expect(page.locator('.round__foreign')).not.toHaveText('');
    expect(await boxes()).toEqual(before);
  });

  test('AT-22.5: kein Vorlesen vor dem ersten Tipp', async ({ page }) => {
    await fakeSpeech(page);
    await startRound(page, 'Englisch');
    await page.waitForTimeout(500);
    expect((await speechCalls(page)).filter((c) => c.op === 'speak')).toEqual([]);
  });

  test('AT-22.6: ohne Sprachausgabe trotzdem aufdecken', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { value: undefined });
    });
    const word = await startRound(page, 'Englisch');
    await btn(page, 'Auf Englisch').click();
    await expect(page.locator('.round__foreign')).toHaveText(word.en);
    expect(errors).toEqual([]);
  });
});
