import { expect, test } from '@playwright/test';

test.describe('B-01 Grundgerüst', () => {
  test('AT-01.1: lädt ohne Konsolenfehler und ohne fehlgeschlagene Requests', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
    });
    page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
    page.on('requestfailed', (req) => problems.push(`requestfailed: ${req.url()}`));
    page.on('response', (res) => {
      if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
    });

    await page.goto('./');
    await expect(page.locator('#app')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('AT-01.2: Titel, Sprache und Viewport ohne Zoom', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle('Mimi & Mots');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('user-scalable=no');
    expect(viewport).toContain('viewport-fit=cover');
  });

  test('AT-01.3: wird unter dem Pages-Pfad /mimi_mots/ ausgeliefert', async ({ page }) => {
    await page.goto('./');
    expect(new URL(page.url()).pathname).toBe('/mimi_mots/');
    const scripts = await page
      .locator('script[type="module"]')
      .evaluateAll((els) => els.map((el) => new URL((el as HTMLScriptElement).src).pathname));
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) expect(src).toMatch(/^\/mimi_mots\//);
  });
});
