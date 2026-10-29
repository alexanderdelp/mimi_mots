import { expect, test, type Page } from '@playwright/test';

const KEY = 'mimi-mots:v1';
const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const stored = (page: Page) =>
  page.evaluate((k) => {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  }, KEY);

async function expectSelection(page: Page, selected: string[]) {
  for (const name of ['Mimi', 'Mots', 'Englisch', 'Französisch', '5 Min.']) {
    await expect(btn(page, name), name).toHaveAttribute(
      'aria-pressed',
      String(selected.includes(name)),
    );
  }
}

test.describe('B-12 Auswahl merken', () => {
  test('AT-12.1: Auswahl ist nach Neuladen vorbelegt', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Mots').click();
    await btn(page, 'Englisch').click();
    await page.reload();
    await expectSelection(page, ['Mots', 'Englisch', '5 Min.']);
    await expect(btn(page, 'Los geht’s')).toBeEnabled();
  });

  test('AT-12.2: Erststart – nur Dauer, nichts gespeichert', async ({ page }) => {
    await page.goto('./');
    await expectSelection(page, ['5 Min.']);
    await btn(page, '5 Min.').click(); // bereits gewählt → keine Änderung
    expect(await stored(page)).toBeNull();
    await page.reload();
    await expectSelection(page, ['5 Min.']);
  });

  test('AT-12.3: geänderte Auswahl wird gemerkt', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Mimi').click();
    await btn(page, 'Englisch').click();
    await page.reload();
    await btn(page, 'Mots').click();
    await btn(page, 'Französisch').click();
    await page.reload();
    await expectSelection(page, ['Mots', 'Französisch', '5 Min.']);
    expect((await stored(page)).settings).toEqual({
      companion: 'mots',
      language: 'fr',
      durationMin: 5,
    });
  });

  test('AT-12.4: Auswahl bleibt nach einer Runde erhalten', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Mimi').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Los geht’s').click();
    await btn(page, 'Beenden').click();
    await btn(page, 'Zurück').click();
    await expectSelection(page, ['Mimi', 'Französisch', '5 Min.']);
  });

  test('AT-12.5: Lernstand bleibt beim Speichern erhalten', async ({ page }) => {
    const progress = {
      en: { apfel: { box: 3, seen: 4, lastSeenAt: '2026-10-29T10:00:00.000Z' } },
      fr: { hund: { box: 1, seen: 2, lastSeenAt: '2026-10-28T08:00:00.000Z' } },
    };
    await page.addInitScript(
      ([k, p]) => {
        if (!localStorage.getItem(k)) {
          localStorage.setItem(
            k,
            JSON.stringify({
              version: 1,
              settings: { companion: null, language: null, durationMin: 5 },
              progress: p,
            }),
          );
        }
      },
      [KEY, progress] as const,
    );
    await page.goto('./');
    await btn(page, 'Mimi').click();
    await btn(page, 'Englisch').click();
    expect((await stored(page)).progress).toEqual(progress);
  });

  test('AT-12.6: gesperrter Speicher – Auswahl und Play gehen trotzdem', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Zugriff verweigert', 'SecurityError');
        },
      });
    });
    await page.goto('./');
    await btn(page, 'Mots').click();
    await btn(page, 'Englisch').click();
    await btn(page, 'Los geht’s').click();
    await expect(page.locator('[data-view="round"]')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
