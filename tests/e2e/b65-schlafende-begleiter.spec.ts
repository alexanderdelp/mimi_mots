import { expect, test, type Page } from './fixtures';
import { fakeMedia } from './helpers';
import { btn, hold, storeOnce } from './views';

const KEY = 'mimi-mots:v1';
const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);

/** Feste lokale Uhrzeit: 30.10.2026, 10 Uhr. */
const TODAY = new Date(2026, 9, 30, 10, 0);

test.beforeEach(async ({ page }) => {
  await fakeMedia(page);
  await page.clock.install({ time: TODAY });
});

/** Speichert einen Stand, bevor die App lädt. */
async function seed(page: Page, sleeping: string[], since = '2026-10-30') {
  await storeOnce(page, {
    version: 1,
    settings: { companion: 'mots', language: 'fr', mode: 'listen' },
    progress: { en: {}, fr: {} },
    rest: { sleeping, since },
  });
}

async function startRound(page: Page, companion: 'Mimi' | 'Mots', mode: 'Sprechen' | 'Hören') {
  await btn(page, companion).click();
  await btn(page, 'Französisch').click();
  await btn(page, mode).click();
  await btn(page, 'Los geht’s').click();
  await expect(view(page, 'round')).toBeVisible();
}

async function closeRound(page: Page) {
  await hold(page, '.close-button', 700);
  await expect(view(page, 'end')).toBeVisible();
}

async function expectAsleep(page: Page, name: 'Mimi' | 'Mots', file: string) {
  const tile = btn(page, name);
  await expect(tile).toBeDisabled();
  await expect(tile.locator('img')).toHaveAttribute('src', new RegExp(`${file}_sleeping\\.png$`));
}

test.describe('B-65 Schlafende Begleiter', () => {
  test('AT-65.1/AT-89.3: nach Zeitablauf schläft der Begleiter, beide Modi bleiben', async ({
    page,
  }) => {
    await page.goto('./');
    await startRound(page, 'Mimi', 'Sprechen');
    await page.clock.fastForward(5 * 60_000 + 1000);
    await page.clock.runFor(300);
    await btn(page, 'Auf Französisch anhören').click();
    await btn(page, 'Noch üben').click();
    await expect(view(page, 'end').locator('.avatar')).toHaveAttribute('data-pose', 'winkt');
    await expect(view(page, 'end').locator('.avatar img')).toHaveAttribute('src', /cat_waving/);
    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
    await expectAsleep(page, 'Mimi', 'cat');
    await expect(btn(page, 'Mots')).toBeEnabled();
    await expect(btn(page, 'Mots').locator('img')).toHaveAttribute('src', /pony_sitting/);
    for (const name of ['Sprechen', 'Hören']) await expect(btn(page, name)).toBeEnabled();
  });

  test('AT-65.2/65.3: nach [×] ebenso, Rest vorausgewählt, Play aktiv', async ({ page }) => {
    await page.goto('./');
    await startRound(page, 'Mots', 'Hören');
    await closeRound(page);
    await btn(page, 'Zurück').click();
    await expectAsleep(page, 'Mots', 'pony');
    await expect(btn(page, 'Hören')).toBeEnabled();
    for (const name of ['Mimi', 'Französisch', 'Hören']) {
      await expect(btn(page, name)).toHaveAttribute('aria-pressed', 'true');
    }
    await expect(btn(page, 'Los geht’s')).toBeEnabled();
  });

  test('AT-65.4: verbraucht schon auf der Abschlussseite, bleibt nach Neuladen', async ({
    page,
  }) => {
    await page.goto('./');
    await startRound(page, 'Mimi', 'Hören');
    await closeRound(page);
    await page.reload();
    await expect(view(page, 'start')).toBeVisible();
    await expectAsleep(page, 'Mimi', 'cat');
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY);
    expect(stored.rest).toEqual({ sleeping: ['mimi'], since: '2026-10-30' });
  });

  test('AT-65.5: nach dem zweiten Begleiter kommt die Schlafseite', async ({ page }) => {
    await page.goto('./');
    await startRound(page, 'Mimi', 'Sprechen');
    await closeRound(page);
    await btn(page, 'Zurück').click();
    await btn(page, 'Los geht’s').click(); // Mots ist vorausgewählt, Sprechen bleibt
    await closeRound(page);
    await expect(view(page, 'end').locator('.avatar img')).toHaveAttribute('src', /pony_waving/);
    await btn(page, 'Zurück').click();
    const sleep = view(page, 'sleep');
    await expect(sleep).toBeVisible();
    await expect(sleep.locator('header.app-header h1')).toHaveText('Mimi & Mots');
    await expect(sleep.locator('.sleep__picture')).toHaveAttribute('src', /both_sleeping\.png$/);
    await expect(sleep.locator('.sleep__text')).toHaveText('Gute Nacht und bis morgen!');
    await expect(sleep.getByRole('button')).toHaveCount(0);
  });

  test('AT-65.6: schlafen beide, startet die App mit der Schlafseite', async ({ page }) => {
    await seed(page, ['mimi', 'mots']);
    await page.goto('./');
    await expect(view(page, 'sleep')).toBeVisible();
    await expect(view(page, 'start')).toHaveCount(0);
  });

  test('AT-65.7 (seit B-69): Aufwecken über den Elternbereich', async ({ page }) => {
    await seed(page, ['mimi', 'mots']);
    await page.goto('./');
    await hold(page, '[data-view="sleep"] .app-header__icon', 700);
    await expect(view(page, 'admin')).toBeVisible();
    await page.getByRole('tab', { name: 'Sonstiges' }).click(); // B-83
    await btn(page, 'Tiere aufwecken').click();
    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
    for (const name of ['Mimi', 'Mots', 'Sprechen', 'Hören']) {
      await expect(btn(page, name)).toBeEnabled();
    }
    for (const name of ['Mots', 'Französisch', 'Hören']) {
      await expect(btn(page, name)).toHaveAttribute('aria-pressed', 'true');
    }
    await expect(btn(page, 'Mimi').locator('img')).toHaveAttribute('src', /cat_sitting/);
  });

  test('AT-65.9: App-Start an einem späteren Tag: alle wach', async ({ page }) => {
    await seed(page, ['mimi', 'mots'], '2026-10-29');
    await page.goto('./');
    await expect(view(page, 'start')).toBeVisible();
    for (const name of ['Mimi', 'Mots', 'Sprechen', 'Hören']) {
      await expect(btn(page, name)).toBeEnabled();
    }
  });

  test('AT-65.9: App bleibt offen, nach Mitternacht zurückgeholt → alle wach', async ({ page }) => {
    await seed(page, ['mimi', 'mots']);
    await page.goto('./');
    await expect(view(page, 'sleep')).toBeVisible();
    const comeBack = () =>
      page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.clock.setSystemTime(new Date(2026, 9, 30, 23, 59));
    await comeBack();
    await expect(view(page, 'sleep')).toBeVisible();
    await page.clock.setSystemTime(new Date(2026, 9, 31, 0, 1));
    await comeBack();
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mimi')).toBeEnabled();
  });

  test(
    'AT-77.2: Schlafbild so breit wie die Kachel und unten ausgerichtet',
    { tag: '@layout' },
    async ({ page }) => {
      await seed(page, ['mimi']);
      await page.goto('./');
      await page.waitForFunction(() =>
        [...document.querySelectorAll<HTMLImageElement>('.start__avatar')].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );
      const [tile, img] = await btn(page, 'Mimi').evaluate((t) => {
        const i = t.querySelector('img')!;
        return [t.getBoundingClientRect().width, i.getBoundingClientRect().width];
      });
      expect(img).toBeGreaterThan(tile * 0.8);
      await expect(btn(page, 'Mimi').locator('img')).toHaveCSS('object-position', '50% 100%');
    },
  );
});
