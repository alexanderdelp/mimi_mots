import { expect, test, type Page } from '@playwright/test';

/** Hält einen Button gedrückt (Long-Press, z. B. [×] seit B-25). */
async function hold(page: Page, name: string, ms = 700) {
  const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

const KEY = 'mimi-mots:v1';
const btn = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const stored = (page: Page) =>
  page.evaluate((k) => {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  }, KEY);

async function expectSelection(page: Page, selected: string[]) {
  for (const name of ['Mimi', 'Mots', 'Englisch', 'Französisch', '3 Minuten', '7 Minuten']) {
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
    await expectSelection(page, ['Mots', 'Englisch', '3 Minuten']);
    await expect(btn(page, 'Los geht’s')).toBeEnabled();
  });

  test('AT-12.2: Erststart – nur Dauer, nichts gespeichert', async ({ page }) => {
    await page.goto('./');
    await expectSelection(page, ['3 Minuten']);
    await btn(page, '3 Minuten').click(); // bereits gewählt → keine Änderung
    expect(await stored(page)).toBeNull();
    await page.reload();
    await expectSelection(page, ['3 Minuten']);
  });

  test('AT-12.3: geänderte Auswahl wird gemerkt', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Mimi').click();
    await btn(page, 'Englisch').click();
    await page.reload();
    await btn(page, 'Mots').click();
    await btn(page, 'Französisch').click();
    await page.reload();
    await expectSelection(page, ['Mots', 'Französisch', '3 Minuten']);
    expect((await stored(page)).settings).toEqual({
      companion: 'mots',
      language: 'fr',
      durationMin: 3,
    });
  });

  test('AT-12.4: Auswahl bleibt nach einer Runde erhalten', async ({ page }) => {
    await page.goto('./');
    await btn(page, 'Mimi').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Los geht’s').click();
    await hold(page, 'Beenden');
    await btn(page, 'Zurück').click();
    // Sprache bleibt; Mimi schläft seit B-65, Mots und 7 Minuten sind vorausgewählt
    await expectSelection(page, ['Mots', 'Französisch', '7 Minuten']);
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
              settings: { companion: null, language: null, durationMin: 3 },
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
    // seit B-67 gibt es zusätzlich einen (leeren) japanischen Lernstand
    expect((await stored(page)).progress).toEqual({ ...progress, ja: {} });
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
