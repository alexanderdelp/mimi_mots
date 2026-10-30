import { expect, test } from './fixtures';
import words from '../../src/data/words.json' with { type: 'json' };

test.describe('B-04 Wortliste', () => {
  test('AT-04.1: jedes Emoji ist ein einzelnes, farbiges Bildzeichen', async ({ page }) => {
    await page.goto('./');
    const results = await page.evaluate(
      (emojis) => {
        const segmenter = new Intl.Segmenter('de', { granularity: 'grapheme' });
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 160;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.font = `100px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        return emojis.map((emoji) => {
          const graphemes = [...segmenter.segment(emoji)].length;
          const width = ctx.measureText(emoji).width;
          // Farbemojis werden unabhängig von fillStyle in eigenen Farben gezeichnet;
          // ein leeres Ersatzkästchen (Tofu) oder ein Text-Glyph bliebe schwarz.
          // Gezählt werden deshalb nicht-schwarze statt bunter Pixel, weil manche
          // Emoji (z. B. ⚽ in Noto Color Emoji) nur schwarz-weiß gestaltet sind.
          ctx.clearRect(0, 0, 160, 160);
          ctx.fillStyle = '#000';
          ctx.fillText(emoji, 80, 80);
          const px = ctx.getImageData(0, 0, 160, 160).data;
          let painted = 0;
          for (let i = 0; i < px.length; i += 4) {
            const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
            if (a > 128 && Math.max(r, g, b) > 80) painted++;
          }
          return { emoji, graphemes, width: Math.round(width), painted };
        });
      },
      words.map((w) => w.emoji),
    );

    for (const r of results) {
      expect(r.graphemes, r.emoji).toBe(1);
      expect(r.width, r.emoji).toBeGreaterThan(60);
      expect(r.width, r.emoji).toBeLessThan(170);
      // Echte Emoji liegen bei mehreren Tausend Pixeln, Tofu und Text-Glyphen bei 0.
      expect(r.painted, r.emoji).toBeGreaterThan(500);
    }
  });
});
