// B-97: Kind-Profil und Begrüßung – erster Bildschirm, Name, Speicherformat v2.
import { CHILD_ID, expect, isPhone, test, type Page } from './fixtures';
import {
  KEY,
  btn,
  childStore,
  hold,
  keepGreeting,
  overflow,
  prepare,
  revealedView,
  storeOnce,
  stored,
  storedAll,
} from './views';

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);
const input = (page: Page) => page.getByRole('textbox', { name: 'Wie heißt du?' });
const avatars = (page: Page) =>
  view(page, 'welcome')
    .locator('.avatar img')
    .evaluateAll((imgs) => imgs.map((i) => new URL((i as HTMLImageElement).src).pathname));

/** Stand bis B-96 (`mimi-mots:v1`) – wird seit B-97 nicht übernommen. */
const LEGACY = JSON.stringify({
  version: 1,
  settings: { companion: 'mots', language: 'fr', mode: 'listen' },
  rest: { sleeping: ['mimi'], since: '2026-10-30' },
  roundMin: 7,
});

test.describe('B-97 Begrüßung ohne Namen', () => {
  test.use({ childName: null, greeting: true });

  test('AT-97.1: Erststart fragt nach dem Namen; leer geht nicht', async ({ page }) => {
    await prepare(page);
    await page.goto('./');
    await expect(view(page, 'welcome')).toBeVisible();
    await expect(page.getByText('Wie heißt du?')).toBeVisible();
    expect(await avatars(page)).toEqual([
      expect.stringMatching(/cat_waving\.png$/),
      expect.stringMatching(/pony_waving\.png$/),
    ]);
    const done = btn(page, 'Fertig');
    await expect(done).toBeDisabled();
    await expect(input(page)).toHaveAttribute('maxlength', '16');
    await input(page).fill('   ');
    await expect(done).toBeDisabled();
    await input(page).press('Enter');
    await expect(page.getByText('Wie heißt du?')).toBeVisible();
    expect(await stored(page)).toBeNull();
  });

  test('AT-97.1: Name bestätigen begrüßt und speichert ihn', async ({ page }) => {
    await prepare(page);
    await page.goto('./');
    await input(page).fill('  Lina ');
    await btn(page, 'Fertig').click();
    await expect(page.getByText('Hallo Lina!')).toBeVisible();
    await expect(input(page)).toHaveCount(0);
    expect((await stored(page)).name).toBe('Lina');
    await btn(page, 'Weiter').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(page.locator('.app-header__name')).toHaveText('Lina');
  });

  test('AT-97.1: Enter bestätigt ebenso; mehr als 16 Zeichen gehen nicht', async ({ page }) => {
    await prepare(page);
    await page.goto('./');
    await input(page).pressSequentially('Maximilian-Josefine');
    await expect(input(page)).toHaveValue('Maximilian-Josef');
    await input(page).press('Enter');
    await expect(page.getByText('Hallo Maximilian-Josef!')).toBeVisible();
  });

  test('AT-97.3: schlafen beide, kommt die Schlafseite; nach dem Wecken die Namensfrage', async ({
    page,
  }) => {
    await prepare(page, { name: null, sleeping: ['mimi', 'mots'] });
    await page.goto('./');
    await expect(view(page, 'sleep')).toBeVisible();
    await expect(page.locator('.app-header__name')).toHaveCount(0);
    await hold(page, '.app-header__icon');
    await page.getByRole('tab', { name: 'Sonstiges' }).click();
    await btn(page, 'Mimi').click(); // aufwecken
    await btn(page, 'Zurück').click();
    await expect(view(page, 'welcome')).toBeVisible();
    await expect(page.getByText('Wie heißt du?')).toBeVisible();
  });

  test('AT-97.6: alte Daten (v1) werden nicht übernommen – Erststart', async ({ page }) => {
    await prepare(page);
    await page.addInitScript((v) => {
      if (!localStorage.getItem('mimi-mots:v1')) localStorage.setItem('mimi-mots:v1', v);
    }, LEGACY);
    await page.goto('./');
    await expect(page.getByText('Wie heißt du?')).toBeVisible();
    // Mimi schlief laut alten Daten – zählt nicht mehr: beide winken
    expect(await avatars(page)).toEqual([
      expect.stringMatching(/cat_waving\.png$/),
      expect.stringMatching(/pony_waving\.png$/),
    ]);
    await input(page).fill('Lina');
    await input(page).press('Enter');
    const all = await storedAll(page);
    expect(all.version).toBe(2);
    expect(all.children).toHaveLength(1);
    const [child] = all.children;
    expect(child.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(all.activeChildId).toBe(child.id);
    expect(Date.parse(child.createdAt)).not.toBeNaN();
    expect(Date.parse(child.updatedAt)).not.toBeNaN();
    expect(child).toMatchObject({
      name: 'Lina',
      settings: { companion: null, language: null, mode: 'speak' },
      rest: { sleeping: [], since: null },
      roundMin: 5,
    });
    // der alte Schlüssel wird weder gelesen noch geändert
    expect(await page.evaluate(() => localStorage.getItem('mimi-mots:v1'))).toBe(LEGACY);
  });
});

test.describe('B-97 Begrüßung mit Namen', () => {
  test.use({ greeting: true });

  test('AT-97.2: „Hallo Lina!“ mit beiden Tieren, Weiter zur Auswahl', async ({ page }) => {
    await prepare(page, { sleeping: ['mots'] });
    await page.goto('./');
    await expect(view(page, 'welcome')).toBeVisible();
    await expect(page.getByText('Hallo Lina!')).toBeVisible();
    await expect(input(page)).toHaveCount(0);
    expect(await avatars(page)).toEqual([
      expect.stringMatching(/cat_waving\.png$/),
      expect.stringMatching(/pony_sleeping\.png$/),
    ]);
    // nur Bildtausch – keine Animation
    const motion = await view(page, 'welcome')
      .locator('.avatar, .avatar img')
      .evaluateAll((els) =>
        els.map((e) => [getComputedStyle(e).animationName, getComputedStyle(e).transitionDuration]),
      );
    for (const [animation, transition] of motion) {
      expect(animation).toBe('none');
      expect(transition).toBe('0s');
    }
    await btn(page, 'Weiter').click();
    await expect(view(page, 'start')).toBeVisible();
    await expect(btn(page, 'Mimi')).toHaveAttribute('aria-pressed', 'true');
  });

  test('AT-97.4: nach der Runde Auswahl, nie die Begrüßung', async ({ page }) => {
    await prepare(page, {});
    await page.goto('./');
    await btn(page, 'Weiter').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Los geht’s').click();
    await hold(page, btn(page, 'Beenden'));
    await btn(page, 'Zurück').click();
    await expect(view(page, 'start')).toBeVisible();
    // zweite Runde mit Mots → beide schlafen → Schlafseite
    await btn(page, 'Los geht’s').click();
    await hold(page, btn(page, 'Beenden'));
    await btn(page, 'Zurück').click();
    await expect(view(page, 'sleep')).toBeVisible();
  });

  test('AT-97.4: Abbruch im Tutorial führt zur Auswahl', async ({ page }) => {
    await prepare(page, { tutorial: true });
    await page.goto('./');
    await btn(page, 'Weiter').click();
    await btn(page, 'Französisch').click();
    await btn(page, 'Los geht’s').click();
    await hold(page, btn(page, 'Beenden'));
    await expect(view(page, 'start')).toBeVisible();
  });

  test('AT-97.3: neuer Tag auf der Schlafseite → Begrüßung', async ({ page }) => {
    await prepare(page, { sleeping: ['mimi', 'mots'] });
    await page.goto('./');
    await expect(view(page, 'sleep')).toBeVisible();
    await page.clock.setSystemTime(new Date(2026, 9, 31, 8, 0));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(view(page, 'welcome')).toBeVisible();
    await expect(page.getByText('Hallo Lina!')).toBeVisible();
    expect(await avatars(page)).toEqual([
      expect.stringMatching(/cat_waving\.png$/),
      expect.stringMatching(/pony_waving\.png$/),
    ]);
  });

  test('AT-97.8: Elternbereich auch von der Begrüßung; zurück zur Begrüßung (B-99)', async ({
    page,
  }) => {
    await prepare(page, {});
    await page.goto('./');
    await expect(view(page, 'welcome')).toBeVisible();
    await hold(page, '.app-header__icon');
    await expect(view(page, 'admin')).toBeVisible();
    await expect(page.locator('.app-header__name')).toHaveCount(0);
    await btn(page, 'Zurück').click();
    await expect(view(page, 'welcome')).toBeVisible();
  });

  test('AT-97.8: Hochformat-Hinweis auch über der Begrüßung', async ({ page }) => {
    test.skip(isPhone(), 'Hochformat-Wechsel per setViewportSize nur aufs iPad');
    await prepare(page, {});
    await page.goto('./');
    await expect(view(page, 'welcome')).toBeVisible();
    await page.setViewportSize({ width: 820, height: 1180 });
    await expect(page.locator('.portrait-overlay')).toBeVisible();
    await page.setViewportSize({ width: 1180, height: 820 });
    await expect(page.locator('.portrait-overlay')).toBeHidden();
    await expect(page.getByText('Hallo Lina!')).toBeVisible();
  });
});

test.describe('B-97 Name in der Kopfleiste', () => {
  const LONG = 'Maximilian-Josef'; // 16 Zeichen, das Höchstmaß

  /** Name ganz im Bild, berührt weder [×], Titel noch Uhr. */
  async function nameFits(page: Page) {
    const name = await page.locator('.app-header__name').boundingBox();
    expect(name).not.toBeNull();
    const others = ['.close-button', '.app-header__brand', '.app-header__slot--start > *'];
    for (const selector of others) {
      for (const other of await page.locator(selector).all()) {
        const box = (await other.boundingBox())!;
        const apart =
          name!.x + name!.width <= box.x + 0.5 ||
          box.x + box.width <= name!.x + 0.5 ||
          name!.y + name!.height <= box.y + 0.5 ||
          box.y + box.height <= name!.y + 0.5;
        expect(apart, selector).toBe(true);
      }
    }
    expect(await overflow(page)).toEqual([]);
  }

  test('AT-97.5: Name auf Auswahl, Runde, Abschluss und Schlafseite', async ({ page }) => {
    await prepare(page, {});
    await revealedView(page);
    await expect(page.locator('.app-header__name')).toHaveText('Lina');
    // seit B-99 rechts in der Kopfleiste, kein Button
    await expect(page.locator('.app-header__slot--end .app-header__name')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Lina' })).toHaveCount(0);
    await hold(page, btn(page, 'Beenden'));
    await expect(view(page, 'end')).toBeVisible();
    await expect(page.locator('.app-header__name')).toHaveText('Lina');
    await btn(page, 'Zurück').click();
    await expect(page.locator('.app-header__name')).toHaveText('Lina');
  });

  test('AT-97.5: Name auf der Schlafseite', async ({ page }) => {
    await prepare(page, { sleeping: ['mimi', 'mots'] });
    await page.goto('./');
    await expect(view(page, 'sleep')).toBeVisible();
    await expect(page.locator('.app-header__name')).toHaveText('Lina');
  });

  for (const where of ['start', 'round', 'end'] as const) {
    test(`AT-97.5: langer Name passt (${where})`, { tag: '@layout' }, async ({ page }) => {
      await prepare(page, { name: LONG });
      if (where === 'start') {
        await page.goto('./');
        await expect(view(page, 'start')).toBeVisible();
      } else {
        await revealedView(page);
        if (where === 'end') {
          await hold(page, btn(page, 'Beenden'));
          await expect(view(page, 'end')).toBeVisible();
        }
      }
      await nameFits(page);
    });
  }
});

test.describe('B-97 Speicher', () => {
  test('AT-97.6: Änderungen landen im aktiven Kind und setzen updatedAt', async ({ page }) => {
    await prepare(page);
    await storeOnce(
      page,
      childStore({ name: 'Lina', settings: { companion: null, language: null, mode: 'speak' } }),
    );
    await keepGreeting(page);
    await page.goto('./');
    await btn(page, 'Weiter').click();
    await btn(page, 'Mots').click();
    const all = await storedAll(page);
    expect(all.activeChildId).toBe(CHILD_ID);
    expect(all.children[0]).toMatchObject({
      id: CHILD_ID,
      name: 'Lina',
      createdAt: '2026-10-29T08:00:00.000Z',
      updatedAt: expect.stringMatching(/^2026-10-30T09:00:/), // Testuhr (TODAY) läuft
      settings: { companion: 'mots' },
    });
    expect(Object.keys(await page.evaluate(() => ({ ...localStorage })))).toEqual([KEY]);
  });
});
