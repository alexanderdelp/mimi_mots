import { expect, test, type Page } from './fixtures';
import { KEY, childStore, storeOnce } from './views';

const VALID = JSON.stringify(
  childStore({
    name: 'Lina',
    settings: { companion: 'mimi', language: 'en', mode: 'speak' },
    progress: {
      en: { apfel: { box: 3, seen: 4, lastSeenAt: '2026-10-29T10:00:00.000Z' } },
      fr: {},
    },
  }),
);

/** Sammelt Konsolen- und Seitenfehler. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Legt vor dem ersten Skript der Seite einen Wert in localStorage ab (nur beim ersten Laden). */
async function seed(page: Page, value: string) {
  await storeOnce(page, value);
}

test.describe('B-05 Storage-Modul', () => {
  // B-97: kaputte oder alte Daten → Erststart mit Namensfrage (die Fixture lässt sie durch)
  for (const [name, value] of [
    ['kaputtes JSON', '{"version":2,'],
    ['falscher Typ', '[1,2,3]'],
    ['unbekannte Version', '{"version":99,"settings":{}}'],
    ['Version 1 (bis B-96)', '{"version":1,"settings":{"companion":"mimi"}}'],
    ['ohne Kinder', '{"version":2,"children":[]}'],
    ['kaputtes Kind', '{"version":2,"activeChildId":"x","children":[{"id":7,"name":3}]}'],
  ]) {
    test(`AT-05.1/97.7: startet ohne Fehler bei ${name}`, async ({ page }) => {
      const errors = collectErrors(page);
      await seed(page, value);
      await page.goto('./');
      await expect(page.getByText('Wie heißt du?')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('AT-05.1: ungültige Einträge im Kind – startet ohne Fehler mit dem Rest', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await storeOnce(page, { settings: { companion: 7 }, progress: { fr: { x: 5 } } });
    await page.goto('./');
    await expect(page.locator('[data-view="start"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('AT-05.2: startet ohne Fehler, wenn localStorage nicht verfügbar ist', async ({ page }) => {
    const errors = collectErrors(page);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Zugriff verweigert', 'SecurityError');
        },
      });
    });
    await page.goto('./');
    // B-97: ohne Speicher gibt es keinen Namen – die Begrüßung fragt danach
    await expect(page.getByText('Wie heißt du?')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('AT-05.3: gültige Daten bleiben beim Start und nach Neuladen erhalten', async ({ page }) => {
    await seed(page, VALID);
    await page.goto('./');
    await expect(page.locator('[data-view="start"]')).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe(VALID);

    await page.reload();
    await expect(page.locator('[data-view="start"]')).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe(VALID);
  });
});
