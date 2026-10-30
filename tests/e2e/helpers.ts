// Gemeinsame Hilfen für E2E-Tests.
import type { Page } from '@playwright/test';

/** Schaltet Japanisch für den Test frei (seit B-73 standardmäßig aus), ohne sonst etwas zu speichern. */
export async function enableJapanese(page: Page) {
  await page.addInitScript(() => {
    const key = 'mimi-mots:v1';
    if (localStorage.getItem(key)) return;
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        settings: { companion: null, language: null, durationMin: 3 },
        progress: { en: {}, fr: {}, ja: {} },
        enabledLanguages: ['en', 'fr', 'ja'],
      }),
    );
  });
}

export type MediaCall =
  | { op: 'play'; src: string; time: number }
  | { op: 'pause' }
  | { op: 'speak'; text: string; lang: string }
  | { op: 'cancel' };

/**
 * Ersetzt Audio-Wiedergabe (HTMLMediaElement.play/pause) und Sprachausgabe durch Attrappen,
 * die jeden Aufruf in window.__media mitschreiben. `playFails`: play() schlägt fehl
 * (wie bei vom Browser blockierter Wiedergabe).
 */
export async function fakeMedia(page: Page, options: { playFails?: boolean } = {}) {
  await page.addInitScript((playFails) => {
    const calls: unknown[] = [];
    (window as unknown as { __media: unknown[] }).__media = calls;
    HTMLMediaElement.prototype.play = function () {
      calls.push({ op: 'play', src: new URL(this.src).pathname, time: this.currentTime });
      return playFails
        ? Promise.reject(new DOMException('blockiert', 'NotAllowedError'))
        : Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      calls.push({ op: 'pause' });
    };
    class FakeUtterance {
      lang = '';
      voice = null;
      rate = 1;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        cancel: () => calls.push({ op: 'cancel' }),
        speak: (u: FakeUtterance) => calls.push({ op: 'speak', text: u.text, lang: u.lang }),
        getVoices: () => [],
      },
    });
  }, options.playFails ?? false);
}

export const mediaCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __media: MediaCall[] }).__media);
