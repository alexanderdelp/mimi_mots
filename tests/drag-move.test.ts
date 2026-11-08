// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAG_THRESHOLD, enableDragMove } from '../src/components/drag-move';

/** Pointer-Event mit Koordinaten (jsdom kennt PointerEvent nicht überall). */
function pointer(type: string, x: number, y: number, button = 0) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button,
  });
  Object.assign(event, { pointerId: 1, isPrimary: true });
  return event;
}

describe('enableDragMove (B-106)', () => {
  let container: HTMLElement;
  let item: HTMLButtonElement;
  let rowA: HTMLElement;
  let rowB: HTMLElement;
  let under: Element | null;
  let onDrop: ReturnType<typeof vi.fn<(item: HTMLElement, target: HTMLElement) => void>>;
  let onClick: ReturnType<typeof vi.fn<() => void>>;
  let stop: () => void;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="c">
        <section class="row" id="a"><button class="item" data-id="x">🐶</button></section>
        <section class="row" id="b"><span id="b-inner"></span></section>
      </div>
      <div class="row" id="outside"></div>`;
    container = document.getElementById('c')!;
    item = container.querySelector('.item')!;
    rowA = document.getElementById('a')!;
    rowB = document.getElementById('b')!;
    under = null;
    document.elementFromPoint = () => under;
    onDrop = vi.fn<(item: HTMLElement, target: HTMLElement) => void>();
    onClick = vi.fn<() => void>();
    item.addEventListener('click', onClick);
    stop = enableDragMove(container, { items: '.item', targets: '.row', onDrop });
  });
  afterEach(() => stop());

  const press = () => item.dispatchEvent(pointer('pointerdown', 10, 10));
  const moveTo = (x: number, target: Element | null) => {
    under = target;
    document.dispatchEvent(pointer('pointermove', x, 10));
  };
  const release = (x: number) => {
    document.dispatchEvent(pointer('pointerup', x, 10));
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  it('Tipp ohne Bewegung bleibt ein Klick, nichts wird gezogen', () => {
    press();
    moveTo(10 + DRAG_THRESHOLD - 1, rowB);
    expect(item.dataset.dragging).toBeUndefined();
    expect(document.querySelector('.drag-ghost')).toBeNull();
    release(10 + DRAG_THRESHOLD - 1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('Ziehen zeigt Kopie und Ziel, Loslassen legt ab und verschluckt den Klick', () => {
    press();
    moveTo(60, document.getElementById('b-inner'));
    expect(item.dataset.dragging).toBe('true');
    expect(document.querySelector('.drag-ghost')?.getAttribute('aria-hidden')).toBe('true');
    expect(rowB.dataset.dropTarget).toBe('true');
    moveTo(70, rowA);
    expect(rowB.dataset.dropTarget).toBeUndefined();
    expect(rowA.dataset.dropTarget).toBe('true');
    moveTo(80, rowB);
    release(80);
    expect(onDrop).toHaveBeenCalledWith(item, rowB);
    expect(onClick).not.toHaveBeenCalled();
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(document.querySelector('[data-drop-target]')).toBeNull();
    expect(item.dataset.dragging).toBeUndefined();
    // der nächste Tipp zählt wieder
    press();
    release(10);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('außerhalb der Ziele oder des Containers: kein Ablegen', () => {
    press();
    moveTo(60, null);
    release(60);
    press();
    moveTo(60, document.getElementById('outside'));
    expect(document.querySelector('[data-drop-target]')).toBeNull();
    release(60);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('Abbruch (pointercancel) räumt auf, ohne abzulegen', () => {
    press();
    moveTo(60, rowB);
    document.dispatchEvent(pointer('pointercancel', 60, 10));
    expect(document.querySelector('.drag-ghost')).toBeNull();
    expect(rowB.dataset.dropTarget).toBeUndefined();
    document.dispatchEvent(pointer('pointerup', 60, 10));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('nur die primäre Taste, und Aufräumen entfernt die Listener', () => {
    item.dispatchEvent(pointer('pointerdown', 10, 10, 2));
    moveTo(60, rowB);
    expect(document.querySelector('.drag-ghost')).toBeNull();
    stop();
    press();
    moveTo(60, rowB);
    expect(document.querySelector('.drag-ghost')).toBeNull();
  });
});
