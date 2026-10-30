import { expect, test } from './fixtures';

test.describe('B-50 Manifest & Icons', () => {
  test('AT-50.1: Meta-Tags und Links für iPad/PWA', async ({ page }) => {
    await page.goto('./');
    const attr = (sel: string, name: string) => page.locator(sel).getAttribute(name);
    expect(await attr('link[rel="manifest"]', 'href')).toBe('/mimi_mots/manifest.webmanifest');
    expect(await attr('link[rel="apple-touch-icon"]', 'href')).toBe(
      '/mimi_mots/icons/icon-180.png',
    );
    expect(await attr('link[rel="apple-touch-icon"]', 'sizes')).toBe('180x180');
    expect(await attr('link[rel="icon"]', 'href')).toBe('/mimi_mots/icons/icon.svg');
    expect(await attr('meta[name="theme-color"]', 'content')).toBe('#6A4C9C');
    expect(await attr('meta[name="apple-mobile-web-app-capable"]', 'content')).toBe('yes');
    expect(await attr('meta[name="apple-mobile-web-app-status-bar-style"]', 'content')).toBe(
      'default',
    );
    expect(await attr('meta[name="apple-mobile-web-app-title"]', 'content')).toBe('Mimi & Mots');
  });

  test('AT-50.2: Manifest', async ({ request }) => {
    const res = await request.get('manifest.webmanifest');
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m).toMatchObject({
      name: 'Mimi & Mots',
      display: 'standalone',
      orientation: 'landscape',
      lang: 'de',
      theme_color: '#6A4C9C',
      background_color: '#F8F4FB',
    });
    const base = new URL(res.url());
    expect(new URL(m.start_url, base).pathname).toBe('/mimi_mots/');
    expect(new URL(m.scope, base).pathname).toBe('/mimi_mots/');
    const icons = m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes} ${i.purpose}`);
    expect(icons).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
  });

  test('AT-50.3: alle Icons ausgeliefert, richtige Größe', async ({ page, request }) => {
    const manifest = await (await request.get('manifest.webmanifest')).json();
    const files: [string, number | null][] = [
      ...manifest.icons.map((i: { src: string; sizes: string }) => [
        i.src,
        Number(i.sizes.split('x')[0]),
      ]),
      ['icons/icon-180.png', 180],
      ['icons/icon.svg', null],
    ];
    await page.goto('./');
    for (const [src, size] of files) {
      const res = await request.get(src);
      expect(res.status(), src).toBe(200);
      if (size) {
        const dims = await page.evaluate(async (url) => {
          const img = new Image();
          img.src = url;
          await img.decode();
          return [img.naturalWidth, img.naturalHeight];
        }, src);
        expect(dims, src).toEqual([size, size]);
      }
    }
  });

  test('AT-50.5: Kopfleiste zeigt das App-Icon', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('header.app-header img')).toHaveAttribute('src', /icons\/icon\.svg$/);
  });
});
