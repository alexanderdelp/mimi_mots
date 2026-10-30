import { expect, test } from './fixtures';

test.describe('B-02 Design-Tokens & Basis-CSS', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('AT-02.1: #app füllt den Bildschirm, nichts scrollt', async ({ page }) => {
    const viewport = page.viewportSize()!;
    const box = await page.locator('#app').boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });

    // Zu großer Inhalt darf weder die App noch das Dokument scrollbar machen.
    await page.evaluate(() => {
      const huge = '<div style="width:5000px;height:5000px">groß</div>';
      document.querySelector('#app')!.insertAdjacentHTML('beforeend', huge);
      document.body.insertAdjacentHTML('beforeend', huge);
    });
    await page.evaluate(() => window.scrollTo(800, 800));
    const scroll = await page.evaluate(() => ({
      x: window.scrollX,
      y: window.scrollY,
      appTop: document.querySelector('#app')!.scrollTop,
    }));
    expect(scroll.x).toBe(0);
    expect(scroll.y).toBe(0);
    expect(scroll.appTop).toBe(0);
  });

  test('AT-02.2: Doppeltipp zoomt nicht', async ({ page }) => {
    const touchAction = await page.evaluate(() => getComputedStyle(document.body).touchAction);
    expect(touchAction).toBe('manipulation');

    const { width, height } = page.viewportSize()!;
    await page.touchscreen.tap(width / 2, height / 2);
    await page.touchscreen.tap(width / 2, height / 2);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  });

  test('AT-02.3: Farben und Schrift laut Tokens', async ({ page }) => {
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { bg: s.backgroundColor, color: s.color, font: s.fontFamily };
    });
    expect(style.bg).toBe('rgb(248, 244, 251)');
    expect(style.color).toBe('rgb(59, 42, 99)');
    expect(style.font).toMatch(/^ui-rounded,\s*"?Nunito"?,\s*system-ui/);
  });

  // -webkit-touch-callout und overscroll-behavior kennt der Playwright-WebKit unter Windows
  // nicht; beide werden im Unit-Test am CSS geprüft (tests/styles.test.ts).
  test('AT-02.4: Touch-Regeln aktiv', async ({ page }) => {
    const style = await page.evaluate(() => {
      const s = getComputedStyle(document.body) as CSSStyleDeclaration & {
        webkitUserSelect?: string;
      };
      return {
        userSelect: s.userSelect || s.webkitUserSelect,
        overscroll: CSS.supports('overscroll-behavior', 'none')
          ? getComputedStyle(document.documentElement).overscrollBehavior
          : 'none',
      };
    });
    expect(style.userSelect).toBe('none');
    expect(style.overscroll).toBe('none');
  });

  test('AT-02.5: Nunito wird von der eigenen Domain geladen', async ({ page, baseURL }) => {
    const fontRequest = page.waitForRequest(/nunito.*\.woff2/);
    await page.reload();
    const req = await fontRequest;
    expect(new URL(req.url()).origin).toBe(new URL(baseURL!).origin);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('20px Nunito'))).toBe(true);
  });
});
