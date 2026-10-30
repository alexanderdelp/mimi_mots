import { expect, test } from './fixtures';
import words from '../../src/data/words.json' with { type: 'json' };

test.describe('B-30b Audio erzeugen', () => {
  test('AT-30b.3: Audiodateien werden unter /mimi_mots/audio/ ausgeliefert', async ({
    request,
  }) => {
    for (const lang of ['en', 'fr', 'ja']) {
      for (const word of words) {
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
