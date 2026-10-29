import { expect, test } from '@playwright/test';
import words from '../../src/data/words.json' with { type: 'json' };

test.describe('B-30b Audio erzeugen', () => {
  test('AT-30b.3: Audiodateien werden unter /mimi_mots/audio/ ausgeliefert', async ({
    request,
  }) => {
    for (const lang of ['en', 'fr']) {
      for (const word of words) {
        const res = await request.get(`audio/${lang}/${word.id}.mp3`);
        expect(res.status(), `${lang}/${word.id}`).toBe(200);
        expect(res.headers()['content-type'], `${lang}/${word.id}`).toMatch(/audio\/mpeg/);
      }
    }
  });

  test('Abhörseite ist nicht Teil des Produktionsbuilds', async ({ request }) => {
    const res = await request.get('tools/hoerpruefung.html');
    expect(await res.text()).not.toContain('Hörprüfung Audio');
  });
});
