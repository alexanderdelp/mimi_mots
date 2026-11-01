import { expect, test, type Page } from './fixtures';
import words from '../../src/data/words.json' with { type: 'json' };
import { fakeMedia, mediaCalls } from './helpers';
import { btn, hold } from './views';

// B-91: Halten über die Testuhr statt echter Wartezeit
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

async function startRound(page: Page, language: 'Englisch' | 'Französisch' = 'Französisch') {
  await page.goto('./');
  await btn(page, 'Mimi').click();
  await btn(page, language).click();
  await btn(page, 'Los geht’s').click();
  await expect(page.locator('[data-view="round"]')).toBeVisible();
  const id = await page.locator('.word-card').getAttribute('data-word-id');
  return words.find((w) => w.id === id)!;
}

const speaker = (page: Page) => page.getByRole('button', { name: /anhören$/ });

test.describe('B-31 Audio-Modul', () => {
  test('AT-31.1: Lautsprecher spielt die MP3 der Sprache', async ({ page }) => {
    await fakeMedia(page);
    const word = await startRound(page);
    await speaker(page).click();
    const calls = await mediaCalls(page);
    expect(calls.filter((c) => c.op === 'play')).toEqual([
      { op: 'play', src: `/mimi_mots/audio/fr/${word.id}.mp3`, time: 0 },
    ]);
    expect(calls.filter((c) => c.op === 'speak')).toEqual([]);
  });

  test('AT-64.4: Englisch spielt die englische MP3', async ({ page }) => {
    await fakeMedia(page);
    const word = await startRound(page, 'Englisch');
    await speaker(page).click();
    const calls = await mediaCalls(page);
    expect(calls.filter((c) => c.op === 'play')).toEqual([
      { op: 'play', src: `/mimi_mots/audio/en/${word.id}.mp3`, time: 0 },
    ]);
    expect(calls.filter((c) => c.op === 'speak')).toEqual([]);
  });

  test('AT-31.2: jeder weitere Tipp spielt von vorn', async ({ page }) => {
    await fakeMedia(page);
    await startRound(page);
    for (let i = 0; i < 3; i++) await speaker(page).click();
    const plays = (await mediaCalls(page)).filter((c) => c.op === 'play');
    expect(plays).toHaveLength(3);
    for (const p of plays) expect(p).toMatchObject({ time: 0 });
  });

  for (const [language, lang, other] of [
    ['Französisch', 'fr', 'en'],
    ['Englisch', 'en', 'fr'],
  ] as const) {
    test(`AT-31.3/AT-64.5: nur die Dateien der Sprache werden vorgeladen (${language})`, async ({
      page,
    }) => {
      await fakeMedia(page);
      const requested: string[] = [];
      page.on('request', (r) => {
        const path = new URL(r.url()).pathname;
        if (path.includes('/audio/')) requested.push(path);
      });
      await startRound(page, language);
      await expect
        .poll(() => requested.filter((p) => p.includes(`/audio/${lang}/`)).length)
        .toBe(words.length);
      expect(requested.filter((p) => p.includes(`/audio/${other}/`))).toEqual([]);
    });
  }

  test('AT-31.4: fehlende Datei → Web Speech', async ({ page }) => {
    await fakeMedia(page);
    await page.route('**/audio/**', (route) => route.fulfill({ status: 404, body: '' }));
    const word = await startRound(page);
    await page.waitForLoadState('networkidle');
    await speaker(page).click();
    await expect(page.locator('.round__foreign')).toHaveText(word.fr);
    await expect
      .poll(async () => (await mediaCalls(page)).filter((c) => c.op === 'speak'))
      .toEqual([{ op: 'speak', text: word.fr, lang: 'fr-FR' }]);
    expect((await mediaCalls(page)).filter((c) => c.op === 'play')).toEqual([]);
  });

  test('AT-31.5: Abspielen scheitert → Web Speech', async ({ page }) => {
    await fakeMedia(page, { playFails: true });
    const word = await startRound(page, 'Französisch');
    await speaker(page).click();
    await expect
      .poll(async () => (await mediaCalls(page)).filter((c) => c.op === 'speak'))
      .toEqual([{ op: 'speak', text: word.fr, lang: 'fr-FR' }]);
  });

  test('AT-31.6: Bewerten und Beenden stoppen die Wiedergabe', async ({ page }) => {
    await fakeMedia(page);
    await startRound(page);
    await speaker(page).click();
    let before = (await mediaCalls(page)).length;
    await page.getByRole('button', { name: 'Wusste ich' }).click();
    expect((await mediaCalls(page)).slice(before).map((c) => c.op)).toContain('pause');

    await speaker(page).click();
    before = (await mediaCalls(page)).length;
    await hold(page, btn(page, 'Beenden'));
    await expect(page.locator('[data-view="end"]')).toBeVisible();
    expect((await mediaCalls(page)).slice(before).map((c) => c.op)).toContain('pause');
  });
});
