// B-104: API-Testseite. Alle APIs sind Attrappen; die Seite läuft im eigenen Dev-Server, weil sie
// nicht im Build ist (Ausnahme AT-104.1, die genau das am Build prüft).
import type { Route } from '@playwright/test';
import { expect, test, type Page } from './fixtures';
import { TOOLS_URL } from '../../playwright.config';

const PAGE_URL = `${TOOLS_URL}tools/api-test.html`;

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });

const TRANSLATIONS = {
  translations: [
    {
      pos: 'noun',
      lang_code: 'de',
      translations: [
        { word: 'dog', lang_code: 'en', sense_index: '1', sense: 'Haustier' },
        { word: 'chien', lang_code: 'fr', sense_index: '1', tags: ['masculine'] },
      ],
    },
  ],
};

/** Ersetzt alle APIs; `overrides` tauscht einzelne Hosts aus. Merkt sich jede Anfrage. */
async function mockApis(page: Page, overrides: Record<string, (route: Route) => unknown> = {}) {
  const requests: string[] = [];
  const handlers: Record<string, (route: Route) => unknown> = {
    'api.wiktapi.dev': (route) => {
      const url = route.request().url();
      if (url.endsWith('/translations')) return json(route, TRANSLATIONS);
      if (url.endsWith('/pronunciations')) {
        return json(route, {
          pronunciations: [
            {
              lang_code: url.includes('/fr/') ? 'fr' : 'en',
              sounds: [{ ipa: '\\ʃjɛ̃\\', audio: 'Fr-chien.wav', tags: [] }],
            },
          ],
        });
      }
      return json(route, {
        definitions: [
          {
            pos: 'noun',
            lang_code: url.includes('/fr/') ? 'fr' : 'en',
            senses: [{ glosses: ['Haustier-Bedeutung'] }],
          },
        ],
      });
    },
    'de.wiktionary.org': (route) =>
      json(route, {
        parse: { wikitext: { '*': '*{{en}}: {{Ü|en|hound}}\n*{{fr}}: {{Ü|fr|cabot}} {{m}}' } },
      }),
    'en.wiktionary.org': (route) => json(route, ['do', ['doggy'], [], []]),
    'fr.wiktionary.org': (route) => json(route, ['chi', ['chiot'], [], []]),
    'api.mymemory.translated.net': (route) =>
      json(route, {
        responseStatus: 200,
        responseData: { translatedText: 'Rover' },
        matches: [],
      }),
    'api.datamuse.com': (route) =>
      route.request().url().includes('/sug?')
        ? json(route, [{ word: 'dogma' }])
        : json(route, [{ word: 'dog', tags: ['n', 'ipa_pron:dˈɔg'], defs: ['n\tA mammal'] }]),
    'api.dictionaryapi.dev': (route) =>
      json(route, [
        {
          phonetics: [{ text: '/dɒɡ/', audio: 'https://api.dictionaryapi.dev/media/dog.mp3' }],
          meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'Hund-Bedeutung' }] }],
        },
      ]),
    'freedictionaryapi.com': (route) =>
      json(route, {
        entries: [
          {
            language: { code: 'fr' },
            partOfSpeech: 'noun',
            pronunciations: [{ type: 'ipa', text: '/ʃjɛ̃/', tags: [] }],
            senses: [{ definition: 'dog', tags: ['masculine'] }],
          },
        ],
      }),
    'libre.test': (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({
            status: 204,
            headers: {
              'access-control-allow-origin': '*',
              'access-control-allow-headers': 'content-type',
              'access-control-allow-methods': 'POST',
            },
          })
        : json(route, { translatedText: 'hound-libre' }),
    ...overrides,
  };
  await page.route(
    (url) => url.hostname !== 'localhost',
    (route) => {
      const url = new URL(route.request().url());
      requests.push(`${route.request().method()} ${url.href}`);
      const handler = handlers[url.hostname];
      return handler ? handler(route) : route.abort();
    },
  );
  return requests;
}

const panel = (page: Page, lang: string) => page.locator(`section[data-lang="${lang}"]`);
const row = (page: Page, lang: string, source: string) =>
  panel(page, lang).locator(`[data-source="${source}"]`);

async function search(page: Page, word = 'Hund') {
  await page.goto(PAGE_URL);
  await page.getByLabel('Deutsches Wort').fill(word);
  await page.getByRole('button', { name: 'Vorschläge holen' }).click();
}

test.describe('B-104 API-Testseite', () => {
  test('AT-104.1: nur im Dev-Server, nicht im Build', async ({ request }) => {
    const built = await request.get('tools/api-test.html');
    expect(await built.text()).not.toContain('API-Test');
    const dev = await request.get(PAGE_URL);
    expect(await dev.text()).toContain('API-Test');
  });

  test('AT-104.2: Vorschläge je Quelle und Sprache, mit Status, Laufzeit und Genus', async ({
    page,
  }) => {
    await mockApis(page);
    await search(page);

    await expect(row(page, 'en', 'wiktapi').getByRole('button', { name: /dog/ })).toBeVisible();
    await expect(
      row(page, 'en', 'de-wiktionary').getByRole('button', { name: 'hound' }),
    ).toBeVisible();
    await expect(row(page, 'en', 'mymemory').getByRole('button', { name: 'Rover' })).toBeVisible();
    await expect(row(page, 'fr', 'wiktapi').getByRole('button', { name: 'chien' })).toContainText(
      'm',
    );
    await expect(
      row(page, 'fr', 'de-wiktionary').getByRole('button', { name: /cabot/ }),
    ).toBeVisible();
    await expect(row(page, 'en', 'wiktapi').locator('.status')).toHaveText(/^OK · \d+ ms$/);
  });

  test('AT-104.3: Vorschlag übernehmen oder eigenes Wort prüfen', async ({ page }) => {
    await mockApis(page);
    await search(page);

    await row(page, 'en', 'wiktapi').getByRole('button', { name: /dog/ }).click();
    await expect(page.getByLabel('Englisches Wort')).toHaveValue('dog');
    await expect(row(page, 'en', 'free-dictionary')).toContainText('/dɒɡ/');

    await page.getByLabel('Französisches Wort').fill('toutou');
    await panel(page, 'fr').getByRole('button', { name: 'Prüfen' }).click();
    await expect(row(page, 'fr', 'freedictionaryapi-com')).toContainText('/ʃjɛ̃/');
  });

  test('AT-104.4: Wortvorschläge beim Tippen', async ({ page }) => {
    await mockApis(page);
    await page.goto(PAGE_URL);

    await page.getByLabel('Englisches Wort').pressSequentially('do');
    await expect(
      row(page, 'en', 'datamuse-sug').getByRole('button', { name: 'dogma' }),
    ).toBeVisible();
    await expect(
      row(page, 'en', 'wiktionary-search').getByRole('button', { name: 'doggy' }),
    ).toBeVisible();

    await page.getByLabel('Französisches Wort').pressSequentially('chi');
    await expect(
      row(page, 'fr', 'wiktionary-search').getByRole('button', { name: 'chiot' }),
    ).toBeVisible();
    await expect(row(page, 'fr', 'datamuse-sug')).toHaveCount(0);
  });

  test('AT-104.5: Ausfall einer Quelle bleibt in ihrer Zeile', async ({ page }) => {
    await mockApis(page, {
      'api.wiktapi.dev': (route) => route.abort(),
      'de.wiktionary.org': (route) => json(route, { error: { code: 'missingtitle' } }),
      'api.mymemory.translated.net': (route) => json(route, { message: 'kaputt' }, 500),
    });
    await search(page);

    await expect(row(page, 'en', 'wiktapi')).toContainText('Netz oder CORS blockiert');
    await expect(row(page, 'en', 'de-wiktionary')).toContainText('keine Treffer');
    await expect(row(page, 'en', 'mymemory')).toContainText('HTTP 500 kaputt');
    await expect(row(page, 'en', 'wiktapi').locator('.status')).toContainText('Fehler');
  });

  test('AT-104.6: LibreTranslate nur mit Schlüssel oder eigener Instanz', async ({ page }) => {
    const requests = await mockApis(page);
    await search(page);
    await expect(row(page, 'en', 'libretranslate')).toContainText('Schlüssel nötig');
    expect(requests.filter((r) => r.includes('translate') && r.startsWith('POST'))).toEqual([]);

    await page.getByText('LibreTranslate einrichten').click();
    await page.getByLabel('Adresse').fill('https://libre.test');
    await page.getByLabel('API-Schlüssel').fill('test-key');
    let posted = '';
    page.on('request', (request) => {
      if (request.method() === 'POST') posted = request.postData() ?? '';
    });
    await page.getByRole('button', { name: 'Vorschläge holen' }).click();
    await expect(
      row(page, 'en', 'libretranslate').getByRole('button', { name: 'hound-libre' }),
    ).toBeVisible();
    expect(JSON.parse(posted)).toMatchObject({ api_key: 'test-key', source: 'de' });
  });

  test('AT-104.7: Lautschrift und Metadaten je Quelle, fehlende Sprache gekennzeichnet', async ({
    page,
  }) => {
    await mockApis(page);
    await page.goto(PAGE_URL);

    await page.getByLabel('Englisches Wort').fill('dog');
    await panel(page, 'en').getByRole('button', { name: 'Prüfen' }).click();
    await expect(row(page, 'en', 'free-dictionary')).toContainText('Hund-Bedeutung');
    await expect(row(page, 'en', 'wiktapi-def')).toContainText('Haustier-Bedeutung');
    await expect(row(page, 'en', 'datamuse-word')).toContainText('dˈɔg');

    await page.getByLabel('Französisches Wort').fill('chien');
    await panel(page, 'fr').getByRole('button', { name: 'Prüfen' }).click();
    await expect(row(page, 'fr', 'freedictionaryapi-com')).toContainText('Genus: m');
    await expect(row(page, 'fr', 'free-dictionary')).toContainText('kann diese Sprache nicht');
    await expect(row(page, 'fr', 'datamuse-word')).toContainText('kann diese Sprache nicht');
  });

  test('AT-104.8: Vorlesen, Lautschrift als SSML, Aufnahme', async ({ page }) => {
    await page.addInitScript(() => {
      const log: { text: string; lang: string }[] = [];
      Object.assign(window, { spoken: log, played: [] as string[] });
      Object.defineProperty(window, 'speechSynthesis', {
        value: {
          cancel() {},
          getVoices: () => [],
          addEventListener() {},
          speak: (u: { text: string; lang: string }) => log.push({ text: u.text, lang: u.lang }),
        },
      });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: class {
          lang = '';
          constructor(public text: string) {}
        },
      });
      HTMLMediaElement.prototype.play = function () {
        (window as unknown as { played: string[] }).played.push(this.src);
        return Promise.resolve();
      };
    });
    await mockApis(page);
    await page.goto(PAGE_URL);
    const spoken = () => page.evaluate(() => (window as unknown as { spoken: unknown[] }).spoken);

    const fr = panel(page, 'fr');
    await page.getByLabel('Französisches Wort').fill('chien');
    await fr.getByRole('button', { name: 'Vorlesen' }).click();
    expect(await spoken()).toEqual([{ text: 'chien', lang: 'fr-FR' }]);

    await page.getByLabel('Englisches Wort').fill('dog');
    await panel(page, 'en').getByRole('button', { name: 'Vorlesen' }).click();
    expect((await spoken())[1]).toEqual({ text: 'dog', lang: 'en-GB' });

    await fr.getByRole('button', { name: 'Prüfen' }).click();
    const wikt = row(page, 'fr', 'wiktapi-pron');
    await wikt.getByRole('button', { name: 'Lautschrift' }).click();
    expect((await spoken())[2]).toMatchObject({
      text: expect.stringContaining('<phoneme alphabet="ipa" ph="ʃjɛ̃">chien</phoneme>'),
      lang: 'fr-FR',
    });

    await wikt.getByRole('button', { name: 'Aufnahme' }).click();
    const played = await page.evaluate(() => (window as unknown as { played: string[] }).played);
    expect(played).toEqual(['https://commons.wikimedia.org/wiki/Special:FilePath/Fr-chien.wav']);
  });

  test('AT-104.9: Rohantwort aufklappbar, API-Daten nur als Text', async ({ page }) => {
    await mockApis(page, {
      'api.mymemory.translated.net': (route) =>
        json(route, {
          responseStatus: 200,
          responseData: { translatedText: '<img src=x onerror="window.hacked=1">' },
          matches: [],
        }),
    });
    await search(page);

    const mymemory = row(page, 'en', 'mymemory');
    await expect(mymemory.locator('.chip')).toHaveText('<img src=x onerror="window.hacked=1">');
    await expect(mymemory.locator('img')).toHaveCount(0);

    await mymemory.getByText('Rohantwort').click();
    await expect(mymemory.locator('pre')).toContainText('responseStatus');
  });
});
