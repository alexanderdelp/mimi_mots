// Zifferblatt im Stil eines „Time Timers“ (anforderungen.md §3.4): weiße Scheibe mit
// Strichmarken, lila Sektor für die Restzeit, der im Uhrzeigersinn zur 12 hin schrumpft.
// Volle Scheibe = gewählte Dauer. Keine Ziffern, nicht interaktiv, kein Blinken.

const SVG_NS = 'http://www.w3.org/2000/svg';
const R = 40; // Radius des Sektors

/** Punkt auf dem Kreis für einen Winkel im Uhrzeigersinn ab 12 Uhr. */
function pointAt(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
}

/**
 * Pfad des Restzeit-Sektors: vom aktuellen Winkel bis 12 Uhr (im Uhrzeigersinn).
 * Leer bei 0, ganze Scheibe bei 1.
 */
export function sectorPath(fraction: number): string {
  const f = Math.min(1, Math.max(0, fraction));
  if (f <= 0) return '';
  if (f >= 0.9995) {
    return `M50 ${50 - R} A${R} ${R} 0 1 1 49.99 ${50 - R} Z`;
  }
  const start = (1 - f) * 360;
  const [sx, sy] = pointAt(start, R);
  const largeArc = f > 0.5 ? 1 : 0;
  return `M50 50 L${sx.toFixed(3)} ${sy.toFixed(3)} A${R} ${R} 0 ${largeArc} 1 50 ${50 - R} Z`;
}

export interface TimerDial {
  readonly el: SVGSVGElement;
  /** Restzeit als Anteil 0..1 der gewählten Dauer. */
  setFraction(fraction: number): void;
}

export function createTimerDial(): TimerDial {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'timer-dial');
  svg.setAttribute('aria-hidden', 'true');
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const [x1, y1] = pointAt(i * 30, 41);
    const [x2, y2] = pointAt(i * 30, 46);
    return `<line x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}" />`;
  }).join('');
  svg.innerHTML =
    '<circle class="timer-dial__face" cx="50" cy="50" r="48" />' +
    '<path class="timer-dial__sector" d="" />' +
    `<g class="timer-dial__ticks">${ticks}</g>` +
    '<circle class="timer-dial__hub" cx="50" cy="50" r="4" />';
  const sector = svg.querySelector('.timer-dial__sector')!;

  const setFraction = (fraction: number) => {
    const f = Math.min(1, Math.max(0, fraction));
    sector.setAttribute('d', sectorPath(f));
    svg.dataset.fraction = f.toFixed(4);
  };
  setFraction(1);

  return { el: svg, setFraction };
}
