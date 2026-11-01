// @vitest-environment jsdom
// B-97: Begrüßung – Namensfrage, „Hallo Lina!“, beide Tiere; Name in der Kopfleiste.
import { describe, expect, it } from 'vitest';
import { createAppHeader } from '../src/components/app-header';
import { createStore } from '../src/state';
import { childDefaults, type ChildData } from '../src/storage';
import { NAME_QUESTION, renderWelcome } from '../src/views/welcome';

const TODAY = () => new Date(2026, 9, 30, 9, 0);
const store = (data: Partial<ChildData> = {}) =>
  createStore({ ...childDefaults(), ...data }, false, TODAY);

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('renderWelcome (B-97)', () => {
  it('AT-97.1: ohne Namen die Frage, Eingabe (max. 16) und ausgegrauter Haken', () => {
    const { el } = renderWelcome(store());
    expect(el.dataset.view).toBe('welcome');
    expect(el.querySelector('.welcome__text')!.textContent).toBe(NAME_QUESTION);
    const input = el.querySelector<HTMLInputElement>('input')!;
    expect(input.maxLength).toBe(16);
    const done = el.querySelector<HTMLButtonElement>('button[aria-label="Fertig"]')!;
    expect(done.disabled).toBe(true);
    type(input, '   ');
    expect(done.disabled).toBe(true);
    type(input, 'Lina');
    expect(done.disabled).toBe(false);
  });

  it('AT-97.1: leere Eingabe absenden tut nichts, Name absenden begrüßt', () => {
    const s = store();
    const { el } = renderWelcome(s);
    const form = el.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(s.getState().data.name).toBeNull();
    type(el.querySelector('input')!, ' Lina ');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(s.getState().data.name).toBe('Lina');
    expect(el.querySelector('.welcome__text')!.textContent).toBe('Hallo Lina!');
    expect(el.querySelector('input')).toBeNull();
    expect(el.querySelector('button[aria-label="Weiter"]')).not.toBeNull();
  });

  it('AT-97.2: mit Namen „Hallo Lina!“, Weiter führt zur Auswahl', () => {
    const s = store({ name: 'Lina' });
    const { el } = renderWelcome(s);
    expect(el.querySelector('.welcome__text')!.textContent).toBe('Hallo Lina!');
    el.querySelector<HTMLButtonElement>('button[aria-label="Weiter"]')!.click();
    expect(s.getState().view).toBe('start');
  });

  it('AT-97.2: wache Tiere winken, schlafende zeigen das Schlafbild', () => {
    const { el } = renderWelcome(
      store({ name: 'Lina', rest: { sleeping: ['mots'], since: '2026-10-30' } }),
    );
    const images = [...el.querySelectorAll<HTMLImageElement>('.avatar img')].map((i) =>
      i.getAttribute('src'),
    );
    expect(images).toEqual([
      expect.stringMatching(/cat_waving\.png$/),
      expect.stringMatching(/pony_sleeping\.png$/),
    ]);
  });

  it('kein Name in der Kopfleiste der Begrüßung', () => {
    const { el } = renderWelcome(store({ name: 'Lina' }));
    expect(el.querySelector('.app-header__name')).toBeNull();
  });
});

describe('Name in der Kopfleiste (AT-97.5)', () => {
  it('AT-99.3: steht rechts in der Kopfleiste, als Text; [×] bleibt links', () => {
    const close = document.createElement('button');
    const header = createAppHeader({ start: close, name: 'Lina' });
    expect(header.querySelector('.app-header__slot--start')!.firstChild).toBe(close);
    const name = header.querySelector('.app-header__slot--end .app-header__name')!;
    expect(name.tagName).toBe('SPAN');
    expect(name.textContent).toBe('Lina');
  });

  it('ohne Namen nichts', () => {
    expect(createAppHeader({ name: null }).querySelector('.app-header__name')).toBeNull();
  });
});
