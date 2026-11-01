import { expect, test } from './fixtures';
import choices from '../../audio-choices.json' with { type: 'json' };
import words from '../../src/data/words.json' with { type: 'json' };

/** B-85/B-103: Datei nur für Wörter mit gewählter Aufnahme (nicht „keins“, nicht unentschieden). */
const hasFile = (lang: string, id: string) =>
  (choices as Record<string, Record<string, unknown>>)[lang]?.[id] != null;

test.describe('B-30b Audio erzeugen', () => {
  test('AT-30b.3: Audiodateien werden unter /mimi_mots/audio/ ausgeliefert', async ({
    request,
  }) => {
    for (const lang of ['en', 'fr', 'ja', 'it']) {
      for (const word of words) {
        if (!hasFile(lang, word.id)) continue;
        const res = await request.get(`audio/${lang}/${word.id}.mp3`);
        expect(res.status(), `${lang}/${word.id}`).toBe(200);
        expect(res.headers()['content-type'], `${lang}/${word.id}`).toMatch(/audio\/mpeg/);
      }
    }
  });

  test('Abhör- und Stimmwahl-Seite sind nicht Teil des Produktionsbuilds', async ({ request }) => {
    expect(await (await request.get('tools/hoerpruefung.html')).text()).not.toContain(
      'Hörprüfung Audio',
    );
    expect(await (await request.get('tools/stimmwahl.html')).text()).not.toContain('Stimmwahl');
    expect((await request.get('/__stimmwahl')).status()).not.toBe(200);
  });
});
