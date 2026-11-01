// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LONG_PRESS_MS, onLongPress } from '../src/components/long-press';

const fire = (el: HTMLElement, type: string) =>
  el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));

describe('onLongPress', () => {
  let el: HTMLButtonElement;
  let callback: ReturnType<typeof vi.fn<() => void>>;
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement('button');
    callback = vi.fn<() => void>();
    stop = onLongPress(el, callback);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it('löst nach 600 ms Halten aus', () => {
    expect(LONG_PRESS_MS).toBe(600);
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(599);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it.each(['pointerup', 'pointercancel', 'pointerleave'])('%s vor Ablauf bricht ab', (type) => {
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(400);
    fire(el, type);
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('erneutes Drücken zählt neu', () => {
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(500);
    fire(el, 'pointerup');
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('ein einfacher Klick löst nicht aus', () => {
    el.click();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('markiert das Element während des Drückens', () => {
    fire(el, 'pointerdown');
    expect(el.dataset.pressing).toBe('true');
    fire(el, 'pointerup');
    expect(el.dataset.pressing).toBeUndefined();
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(600);
    expect(el.dataset.pressing).toBeUndefined();
  });

  it('unterdrückt das Kontextmenü', () => {
    const event = new Event('contextmenu', { cancelable: true });
    el.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('Aufräumfunktion stoppt laufendes Halten und entfernt die Listener', () => {
    fire(el, 'pointerdown');
    stop();
    vi.advanceTimersByTime(1000);
    fire(el, 'pointerdown');
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
  });
});
