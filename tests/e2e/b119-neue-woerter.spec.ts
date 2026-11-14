import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TOOLS_URL } from '../../playwright.config';
import { expect, test } from './fixtures';
import { vocabularyIds } from './helpers';
import { btn, prepare, storeOnce } from './views';

// B-119: 28 neue Wörter (Tiere, Essen, Körper, Himmel, Dinge) in Englisch, Französisch, Japanisch.
const NEW_IDS = [
  'schaf',
  'huhn',
  'schildkroete',
  'giraffe',
  'affe',
  'biene',
  'schnecke',
  'fuchs',
  'pinguin',
  'eule',
  'trauben',
  'wassermelone',
  'tomate',
  'kartoffel',
  'pizza',
  'schokolade',
  'auge',
  'ohr',
  'mund',
  'fuss',
  'regenbogen',
  'wolke',
  'geschenk',
  'teddy',
  'bett',
  'stuhl',
  'schluessel',
  'flugzeug',
];
const LANGS = [
  { code: 'en', name: 'Englisch' },
  { code: 'fr', name: 'Französisch' },
  { code: 'ja', name: 'Japanisch' },
] as const;
const entry = { box: 0, seen: 1, lastSeenAt: '2026-10-29T10:00:00.000Z' };

test.describe('B-119 Neue Wörter', () => {
  for (const { code } of LANGS) {
    test(`AT-119.2: die Stimmwahl listet die neuen Wörter mit Kandidaten (${code})`, async ({
      page,
    }) => {
      await page.goto(`${TOOLS_URL}tools/stimmwahl.html?lang=${code}`);
      const rows = page.locator('#rows tr');
      await expect(rows.first()).toBeVisible();
      for (const id of NEW_IDS) {
        const radios = page.locator(`#rows input[type="radio"][name="${id}"]`);
        // je Stimme und Variante ein Kandidat, dazu „keins“
        expect(await radios.count(), id).toBeGreaterThanOrEqual(3);
      }
      // die Kandidaten-MP3s selbst sind nicht eingecheckt (tools/stimmwahl/), siehe npm run audio
    });
  }

  for (const { code, name } of LANGS) {
    test.describe(`${name}`, () => {
      const chosen = NEW_IDS.filter((id) => vocabularyIds(code).includes(id));

      test(`AT-119.3: neue Wörter mit Aufnahme haben eine MP3 (${code})`, async ({ request }) => {
        test.skip(chosen.length === 0, 'noch keine Aufnahme gewählt');
        for (const id of chosen) {
          const res = await request.get(`audio/${code}/${id}.mp3`);
          expect(res.status(), id).toBe(200);
          expect(res.headers()['content-type'], id).toMatch(/audio\/mpeg/);
        }
      });

      test(`AT-119.3: neue Wörter erscheinen in der Lernrunde (${code})`, async ({ page }) => {
        test.skip(chosen.length === 0, 'noch keine Aufnahme gewählt');
        await prepare(page);
        await storeOnce(page, {
          settings: { companion: 'mimi', language: code, mode: 'speak' },
          progress: { en: {}, fr: {}, ja: {} },
          enabledLanguages: ['en', 'fr', 'ja'],
          disabledWords: { [code]: vocabularyIds(code).filter((id) => !chosen.includes(id)) },
          tutorialDone: true,
          listenTutorialDone: true,
          rest: { sleeping: [], since: '2026-10-30' },
        });
        await page.goto('./');
        await btn(page, 'Los geht’s').click();
        const id = await page.locator('.word-card').getAttribute('data-word-id');
        expect(chosen).toContain(id);
      });

      test(`AT-119.3: neue Wörter erscheinen unter „Meine Wörter“ (${code})`, async ({ page }) => {
        test.skip(chosen.length === 0, 'noch keine Aufnahme gewählt');
        await prepare(page);
        await storeOnce(page, {
          settings: { companion: 'mimi', language: code, mode: 'speak' },
          progress: {
            en: {},
            fr: {},
            ja: {},
            [code]: Object.fromEntries(chosen.map((id) => [id, entry])),
          },
          enabledLanguages: ['en', 'fr', 'ja'],
          tutorialDone: true,
          listenTutorialDone: true,
          rest: { sleeping: [], since: '2026-10-30' },
        });
        await page.goto('./');
        await btn(page, 'Meine Wörter').click();
        const shown = await page
          .locator('.words__word')
          .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.wordId));
        expect(shown.sort()).toEqual([...chosen].sort());
      });
    });
  }

  test('AT-119.4: der Build bleibt unter 5 MB', () => {
    const size = (dir: string): number =>
      readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
        const path = join(dir, e.name);
        return sum + (e.isDirectory() ? size(path) : statSync(path).size);
      }, 0);
    expect(size('dist')).toBeLessThan(5 * 1024 * 1024);
  });
});
