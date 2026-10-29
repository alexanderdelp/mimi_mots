// Verkleinert die Schrift schrittweise, bis der Text in sein Element passt
// (lange Fremdwörter wie „strawberry“ oder „la grenouille“).

export function fitText(el: HTMLElement, maxPx: number, minPx: number, stepPx = 2): number {
  let size = maxPx;
  el.style.fontSize = `${size}px`;
  const overflows = () => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
  while (size > minPx && overflows()) {
    size = Math.max(minPx, size - stepPx);
    el.style.fontSize = `${size}px`;
  }
  return size;
}
