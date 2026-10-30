import { expect, test, type Page } from './fixtures';

const KEY = 'mimi-mots:v1';

const VALID = JSON.stringify({
  version: 1,
  settings: { companion: 'mimi', language: 'en', durationMin: 5 },
  progress: { en: { apfel: { box: 3, seen: 4, lastSeenAt: '2026-10-29T10:00:00.000Z' } }, fr: {} },
});

/** Sammelt Konsolen- und Seitenfehler. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Legt vor dem ersten Skript der Seite einen Wert in localStorage ab (nur beim ersten Laden). */
async function seed(page: Page, value: string) {
  await page.addInitScript(
    ([key, v]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, v);
        sessionStorage.setItem('seeded', '1');
      }
    },
    [KEY, value],
  );
}

test.describe('B-05 Storage-Modul', () => {
  for (const [name, value] of [
    ['kaputtes JSON', '{"version":1,'],
    ['falscher Typ', '[1,2,3]'],
    ['unbekannte Version', '{"version":99,"settings":{}}'],
    ['ungültige Einträge', '{"version":1,"settings":{"companion":7},"progress":{"fr":{"x":5}}}'],
  ]) {
    test(`AT-05.1: startet ohne Fehler bei ${name}`, async ({ page }) => {
      const errors = collectErrors(page);
      await seed(page, value);
      await page.goto('./');
      await expect(page.locator('[data-view="start"]')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

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
    await expect(page.locator('[data-view="start"]')).toBeVisible();
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
