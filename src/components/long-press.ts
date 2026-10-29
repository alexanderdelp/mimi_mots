// Gedrückt halten statt Tippen – gegen versehentliches Auslösen (z. B. [×] in der Lernrunde).

export const LONG_PRESS_MS = 600;

/**
 * Ruft `onLongPress` auf, wenn das Element `ms` lang gedrückt bleibt. Loslassen, Abbrechen
 * oder Wegziehen vorher setzt zurück. Während des Drückens trägt das Element `data-pressing`.
 * Gibt eine Aufräumfunktion zurück.
 */
export function onLongPress(el: HTMLElement, onLongPress: () => void, ms = LONG_PRESS_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    delete el.dataset.pressing;
  };

  const start = (event: Event) => {
    event.preventDefault();
    cancel();
    el.dataset.pressing = 'true';
    timer = setTimeout(() => {
      cancel();
      onLongPress();
    }, ms);
  };

  const preventMenu = (event: Event) => event.preventDefault();
  const ends = ['pointerup', 'pointercancel', 'pointerleave'] as const;

  el.addEventListener('pointerdown', start);
  ends.forEach((type) => el.addEventListener(type, cancel));
  el.addEventListener('contextmenu', preventMenu);

  return () => {
    cancel();
    el.removeEventListener('pointerdown', start);
    ends.forEach((type) => el.removeEventListener(type, cancel));
    el.removeEventListener('contextmenu', preventMenu);
  };
}
