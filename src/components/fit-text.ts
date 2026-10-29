// Passt die Schrift schrittweise an, bis der Text in sein Element passt
// (lange Fremdwörter wie „strawberry“ oder „la grenouille“).
// Stufe 1: nur verkleinern (bis `breakBelowPx`), Wörter bleiben ganz.
// Stufe 2: passt ein einzelnes Wort auch dann nicht, wird es mit Silbentrennung umbrochen
// (Klasse `fit-text--break`) und erneut ab `maxPx` verkleinert, höchstens bis `minPx`.

export const BREAK_CLASS = 'fit-text--break';

export function fitText(
  el: HTMLElement,
  maxPx: number,
  minPx: number,
  breakBelowPx = minPx,
  stepPx = 2,
): number {
  const overflows = () => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
  const shrink = (floor: number) => {
    let size = maxPx;
    el.style.fontSize = `${size}px`;
    while (size > floor && overflows()) {
      size = Math.max(floor, size - stepPx);
      el.style.fontSize = `${size}px`;
    }
    return size;
  };

  el.classList.remove(BREAK_CLASS);
  const size = shrink(breakBelowPx);
  if (!overflows()) return size;

  el.classList.add(BREAK_CLASS);
  return shrink(minPx);
}
