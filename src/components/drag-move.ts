// B-106: Elemente per Ziehen auf ein Ziel legen – mit Maus, Finger oder Stift (Pointer-Events).
// Erst ab DRAG_THRESHOLD px Bewegung gilt es als Ziehen; vorher bleibt es ein Tipp (click).
// Während des Ziehens folgt eine Kopie dem Zeiger, das Element trägt `data-dragging`, das Ziel
// unter dem Zeiger `data-drop-target`. Der Klick nach einem Ziehen wird verschluckt.

export const DRAG_THRESHOLD = 8;

export interface DragMoveOptions {
  /** Ziehbare Elemente innerhalb des Containers. */
  items: string;
  /** Mögliche Ziele innerhalb des Containers. */
  targets: string;
  /** Element wurde auf ein Ziel gelegt (auch auf das eigene – das entscheidet der Aufrufer). */
  onDrop: (item: HTMLElement, target: HTMLElement) => void;
}

interface Drag {
  item: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  ghost: HTMLElement | null;
  target: HTMLElement | null;
}

/** Richtet das Ziehen per Delegation am Container ein; der Inhalt darf neu gerendert werden.
 *  Gibt eine Aufräumfunktion zurück. */
export function enableDragMove(container: HTMLElement, options: DragMoveOptions): () => void {
  let drag: Drag | null = null;
  let swallowClick = false;
  const doc = container.ownerDocument;

  const targetAt = (x: number, y: number): HTMLElement | null => {
    const hit = doc.elementFromPoint?.(x, y);
    const target = hit?.closest<HTMLElement>(options.targets) ?? null;
    return target && container.contains(target) ? target : null;
  };

  const mark = (target: HTMLElement | null) => {
    if (!drag || drag.target === target) return;
    if (drag.target) delete drag.target.dataset.dropTarget;
    if (target) target.dataset.dropTarget = 'true';
    drag.target = target;
  };

  const place = (ghost: HTMLElement, x: number, y: number) => {
    ghost.style.left = `${x - ghost.offsetWidth / 2}px`;
    ghost.style.top = `${y - ghost.offsetHeight / 2}px`;
  };

  const startGhost = (item: HTMLElement): HTMLElement => {
    const ghost = item.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('id');
    ghost.removeAttribute('data-dragging');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.classList.add('drag-ghost');
    const box = item.getBoundingClientRect();
    ghost.style.width = `${box.width}px`;
    ghost.style.height = `${box.height}px`;
    doc.body.append(ghost);
    return ghost;
  };

  const stop = () => {
    if (!drag) return;
    mark(null);
    drag.ghost?.remove();
    delete drag.item.dataset.dragging;
    drag = null;
    doc.removeEventListener('pointermove', move);
    doc.removeEventListener('pointerup', up);
    doc.removeEventListener('pointercancel', cancel);
  };

  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.ghost) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.item.dataset.dragging = 'true';
      drag.ghost = startGhost(drag.item);
    }
    event.preventDefault();
    place(drag.ghost, event.clientX, event.clientY);
    mark(targetAt(event.clientX, event.clientY));
  };

  const up = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.ghost) {
      stop(); // nur getippt: der Klick gehört dem Element
      return;
    }
    const { item } = drag;
    const target = targetAt(event.clientX, event.clientY);
    swallowClick = true;
    stop();
    if (target) options.onDrop(item, target);
  };

  const cancel = (event: PointerEvent) => {
    if (drag && event.pointerId === drag.pointerId) stop();
  };

  const down = (event: PointerEvent) => {
    swallowClick = false;
    if (drag || !event.isPrimary || event.button !== 0) return;
    const item = (event.target as Element | null)?.closest<HTMLElement>(options.items);
    if (!item || !container.contains(item)) return;
    drag = {
      item,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      ghost: null,
      target: null,
    };
    doc.addEventListener('pointermove', move, { passive: false });
    doc.addEventListener('pointerup', up);
    doc.addEventListener('pointercancel', cancel);
  };

  const click = (event: MouseEvent) => {
    if (!swallowClick) return;
    swallowClick = false;
    event.stopPropagation();
    event.preventDefault();
  };
  const key = () => {
    swallowClick = false;
  };

  container.addEventListener('pointerdown', down);
  container.addEventListener('click', click, true);
  container.addEventListener('keydown', key, true);
  return () => {
    stop();
    container.removeEventListener('pointerdown', down);
    container.removeEventListener('click', click, true);
    container.removeEventListener('keydown', key, true);
  };
}
