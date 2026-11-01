import { expect, test, type Page } from './fixtures';
import words from '../../src/data/words.json' with { type: 'json' };
import { btn, hold, storeOnce } from './views';

const KEY = 'mimi-mots:v1';
const TODAY = new Date(2026, 9, 30, 10, 0);
const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);
const entry = (box: number) => ({ box, seen: 3, lastSeenAt: '2026-10-29T10:00:00.000Z' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: TODAY });
});

async function seed(page: Page, data: { sleeping?: string[]; fr?: object }) {
  await storeOnce(page, {
    version: 1,
    settings: { companion: 'mimi', language: 'fr', mode: 'speak' },
    progress: { en: { apfel: entry(2) }, fr: data.fr ?? {}, ja: {} },
    rest: {
      sleeping: data.sleeping ?? [],
      since: '2026-10-30',
    },
  });
}

const ICON = '.app-header__icon';
const level = (page: Page, name: string) =>
  page.locator(`.admin__level[data-level="${name}"] .admin__word`);

test.describe('B-69 Elternbereich', () => {
  test('AT-69.1: Icon halten auf der Startseite öffnet den Elternbereich, kein Hinweis', async ({
    page,
  }) => {
    await seed(page, {});
    await page.goto('./');
    const look = () =>
      page.locator(ICON).evaluate((e) => {
        const s = getComputedStyle(e);
        return [s.opacity, s.transform, s.filter, s.boxShadow, s.outlineStyle].join('|');
      });
    const before = await look();
    expect(await page.locator(ICON).getAttribute('role')).toBeNull();
    expect(await page.locator(ICON).getAttribute('aria-label')).toBeNull();
    await page.locator(ICON).click();
    await hold(page, ICON, 400);
    await expect(view(page, 'start')).toBeVisible();

    const box = (await page.locator(ICON).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.clock.runFor(300);
    expect(await look()).toBe(before);
    await page.clock.runFor(400);
    await page.mouse.up();
    await expect(view(page, 'admin')).toBeVisible();
  });

  test('AT-69.1: auf der Schlafseite öffnet Halten den Elternbereich statt aufzuwecken', async ({
    page,
  }) => {
    await seed(page, { sleeping: ['mimi', 'mots'] });
    await page.goto('./');
    await hold(page, ICON, 700);
    await expect(view(page, 'admin')).toBeVisible();
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
    expect(stored.rest.sleeping).toEqual(['mimi', 'mots']);
  });

  test('AT-69.2/69.3: Kopfleiste, keine Avatare, aufwecken, zurück', async ({ page }) => {
    await seed(page, { sleeping: ['mimi', 'mots'] });
    await page.goto('./');
    await hold(page, ICON, 700);
    const admin = view(page, 'admin');
    await expect(admin.locator('header.app-header h1')).toHaveText('Mimi & Mots');
    await expect(admin.locator('.avatar, .start__avatar')).toHaveCount(0);
    await btn(page, 'Zurück').click();
    await expect(view(page, 'sleep')).toBeVisible();

    await hold(page, ICON, 700);
    await page.getByRole('tab', { name: 'Sonstiges' }).click(); // B-83
    await btn(page, 'Tiere aufwecken').click();
    await expect(btn(page, 'Tiere aufwecken')).toBeDisabled();
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
    expect(stored.rest).toMatchObject({ sleeping: [] });
    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mots')).toBeEnabled();
  });

  test('AT-69.4: Wörter je Sprache nach Stufe', async ({ page }) => {
    await seed(page, { fr: { apfel: entry(0), hund: entry(4), katze: entry(4), maus: entry(2) } });
    await page.goto('./');
    await hold(page, ICON, 700);
    await expect(btn(page, 'Französisch')).toHaveAttribute('aria-pressed', 'true');
    await expect(level(page, '0')).toHaveCount(1);
    await expect(level(page, '0').first()).toHaveAttribute('aria-label', 'Apfel · la pomme');
    await expect(level(page, '2')).toHaveCount(1);
    await expect(level(page, '4')).toHaveCount(2);
    await expect(level(page, '1')).toHaveCount(0);
    await expect(level(page, 'neu')).toHaveCount(words.length - 4);
    await expect(page.locator('.admin__level[data-level="4"] .admin__title')).toHaveText(
      'Stufe 4 · 2',
    );

    await btn(page, 'Englisch').click();
    await expect(level(page, '2')).toHaveCount(1);
    await expect(level(page, '2').first()).toHaveAttribute('aria-label', 'Apfel · apple');
    await expect(level(page, 'neu')).toHaveCount(words.length - 1);
  });

  test('AT-69.5: Zurücksetzen nur nach Sicherheitsabfrage, nur diese Sprache', async ({ page }) => {
    await seed(page, { fr: { apfel: entry(0), hund: entry(4) } });
    await page.goto('./');
    await hold(page, ICON, 700);
    await btn(page, 'Japanisch').click(); // ohne Lernstand: nichts zurückzusetzen
    await expect(btn(page, 'Lernstand zurücksetzen')).toBeDisabled();
    await btn(page, 'Französisch').click();
    await btn(page, 'Lernstand zurücksetzen').click();
    await expect(page.locator('.admin__question')).toHaveText(
      'Französisch, Sprechen: Wirklich zurücksetzen?', // seit B-89 mit Modus
    );
    await btn(page, 'Abbrechen').click();
    await expect(level(page, '4')).toHaveCount(1);

    await btn(page, 'Lernstand zurücksetzen').click();
    await btn(page, 'Ja, zurücksetzen').click();
    await expect(level(page, 'neu')).toHaveCount(words.length);
    await expect(btn(page, 'Lernstand zurücksetzen')).toBeDisabled();
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
    expect(stored.progress.fr).toEqual({});
    expect(stored.progress.en).toEqual({ apfel: entry(2) });
  });
});
