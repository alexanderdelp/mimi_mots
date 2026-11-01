// B-99: Elternbereich führt zurück, Uhr beim Begleiter, Name oben rechts, einheitliche Schrift,
// Version kopierbar.
import { expect, test, type Page } from './fixtures';
import {
  adminView,
  btn,
  hold,
  listenRevealedView,
  prepare,
  revealedView,
  sleepView,
  startView,
  welcomeView,
} from './views';

const view = (page: Page, name: string) => page.locator(`[data-view="${name}"]`);

async function leaveAdmin(page: Page) {
  await btn(page, 'Zurück').click();
}

test.describe('B-99 Elternbereich führt zurück', () => {
  test.use({ greeting: true });

  test('AT-99.1: von der Begrüßung zurück zur Begrüßung', async ({ page }) => {
    await prepare(page, { greeting: true });
    await welcomeView(page);
    await hold(page, '.app-header__icon');
    await expect(view(page, 'admin')).toBeVisible();
    await leaveAdmin(page);
    await expect(view(page, 'welcome')).toBeVisible();
  });

  test('AT-99.1: von der Auswahl zurück zur Auswahl', async ({ page }) => {
    await prepare(page, { greeting: true });
    await welcomeView(page);
    await btn(page, 'Weiter').click();
    await expect(view(page, 'start')).toBeVisible();
    await hold(page, '.app-header__icon');
    await leaveAdmin(page);
    await expect(view(page, 'start')).toBeVisible();
  });

  test('AT-99.1: schlafen beide, zurück zur Schlafseite', async ({ page }) => {
    await prepare(page, { sleeping: ['mimi', 'mots'] });
    await sleepView(page);
    await hold(page, '.app-header__icon');
    await leaveAdmin(page);
    await expect(view(page, 'sleep')).toBeVisible();
  });
});

test.describe('B-99 Uhr und Name', () => {
  test(
    'AT-99.2: Uhr links neben der Bewertung, rechts vom Begleiter',
    { tag: '@layout' },
    async ({ page }) => {
      await prepare(page, {});
      await revealedView(page);
      const timer = page.locator('.round__timer');
      await expect(page.locator('header.app-header .round__timer')).toHaveCount(0);
      const [t, known, avatar, cards] = await Promise.all(
        [
          timer,
          btn(page, 'Wusste ich'),
          page.locator('.round__avatar'),
          page.locator('.round__cards'),
        ].map(async (l) => (await l.boundingBox())!),
      );
      const vp = page.viewportSize()!;
      expect(t.x + t.width).toBeLessThanOrEqual(known.x); // links neben „Wusste ich“
      expect(t.x).toBeGreaterThanOrEqual(avatar.x + avatar.width - 1); // rechts vom Begleiter
      expect(t.y).toBeGreaterThanOrEqual(cards.y + cards.height - 1); // unter den Karten
      expect(t.y + t.height).toBeLessThanOrEqual(vp.height);
      await expect(timer).toBeVisible();
    },
  );

  test('AT-99.3: Name überall oben rechts, [×] links', { tag: '@layout' }, async ({ page }) => {
    await prepare(page, {});
    const nameBox = async () => {
      const b = (await page.locator('.app-header__name').boundingBox())!;
      return { right: Math.round(b.x + b.width), top: Math.round(b.y) };
    };
    await startView(page);
    const onStart = await nameBox();
    const vp = page.viewportSize()!;
    expect(onStart.right).toBeGreaterThan(vp.width * 0.85);

    await btn(page, 'Französisch').click();
    await btn(page, 'Los geht’s').click();
    await expect(view(page, 'round')).toBeVisible();
    expect(await nameBox()).toEqual(onStart);
    const close = (await btn(page, 'Beenden').boundingBox())!;
    expect(close.x).toBeLessThan(vp.width * 0.1);

    await hold(page, '.close-button');
    await expect(view(page, 'end')).toBeVisible();
    expect(await nameBox()).toEqual(onStart);
  });

  test('AT-99.3: auch auf der Schlafseite oben rechts', { tag: '@layout' }, async ({ page }) => {
    await prepare(page, { sleeping: ['mimi', 'mots'] });
    await sleepView(page);
    const b = (await page.locator('.app-header__name').boundingBox())!;
    expect(b.x + b.width).toBeGreaterThan(page.viewportSize()!.width * 0.85);
  });
});

test.describe('B-99 einheitliche Schrift', () => {
  const fonts = (page: Page) =>
    page.evaluate(() => {
      const style = (sel: string) => {
        const s = getComputedStyle(document.querySelector(sel)!);
        return { size: Math.round(parseFloat(s.fontSize)), weight: s.fontWeight };
      };
      return {
        de: style('.word-card__de'),
        foreign: style('.round__foreign'),
        word: document.querySelector<HTMLElement>('.word-card')!.dataset.wordId,
      };
    });

  for (const [name, open] of [
    ['Sprechen', revealedView],
    ['Hören', listenRevealedView],
  ] as const) {
    test(`AT-99.4: gleiche Größe und Stärke (${name})`, { tag: '@layout' }, async ({ page }) => {
      await prepare(page, {});
      await open(page);
      // mehrere Wörter, nur kurze Fremdwörter zählen (lange dürfen kleiner werden)
      for (let i = 0; i < 4; i++) {
        const f = await fonts(page);
        expect(f.foreign.weight, f.word).toBe(f.de.weight);
        const text = (await page.locator('.round__foreign').textContent()) ?? '';
        if (text.length <= 8) expect(f.foreign.size, `${f.word}: ${text}`).toBe(f.de.size);
        else expect(f.foreign.size).toBeLessThanOrEqual(f.de.size);
        await btn(page, 'Noch üben').click();
        if (name === 'Sprechen') await btn(page, 'Auf Französisch anhören').click();
        else await btn(page, 'Zeig mir das deutsche Wort').click();
      }
    });
  }
});

test.describe('B-99 Version kopieren', () => {
  test('AT-99.5: Tipp kopiert die Version, kurz „Kopiert“, Text markierbar', async ({ page }) => {
    await page.addInitScript(() => {
      const copied: string[] = [];
      (window as unknown as { __copied: string[] }).__copied = copied;
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: async (t: string) => void copied.push(t) },
      });
    });
    await prepare(page, {});
    await adminView(page);
    await page.getByRole('tab', { name: 'Sonstiges' }).click();
    const version = page.locator('.admin__version');
    const label = (await version.locator('.admin__version-text').textContent())!;
    expect(label).toMatch(/^\d+\.\d+\.\d+ · /);
    await expect(version).toHaveCSS('user-select', 'text');
    const width = (await version.boundingBox())!.width;
    await version.click();
    await expect(version.locator('.admin__version-done')).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied),
    ).toEqual([label]);
    expect((await version.boundingBox())!.width).toBeCloseTo(width, 0);
    await page.clock.runFor(1600);
    await expect(version.locator('.admin__version-text')).toBeVisible();
  });
});
