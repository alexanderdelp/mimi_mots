// Eigene, schlichte SVG-Symbole (weiß auf lila Rundbuttons) und das Uhr-Symbol der Dauer.

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  play: '<path d="M36 24 L78 50 L36 76 Z" fill="currentColor" stroke="currentColor" stroke-width="8" stroke-linejoin="round" />',
  // Daumen hoch: Ärmel links, Hand mit nach oben zeigendem Daumen
  thumbsUp:
    '<rect x="14" y="44" width="16" height="40" rx="4" fill="currentColor" />' +
    '<path d="M38 46 L52 22 C55 16 65 17 64 26 L61 40 H79 C85 40 89 46 87 52 L81 78 C79 83 76 86 70 86 H38 Z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />',
  // Wiederholen: zwei Pfeile im Kreislauf
  repeat:
    '<g fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M22 46 V42 A12 12 0 0 1 34 30 H74" /><path d="M64 19 L76 30 L64 41" />' +
    '<path d="M78 54 V58 A12 12 0 0 1 66 70 H26" /><path d="M36 59 L24 70 L36 81" /></g>',
  // Lautsprecher mit zwei Schallwellen
  speaker:
    '<path d="M16 38 H32 L52 20 V80 L32 62 H16 Z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />' +
    '<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round">' +
    '<path d="M64 36 A18 18 0 0 1 64 64" /><path d="M73 25 A32 32 0 0 1 73 75" /></g>',
  // Haus: Dach und Körper mit Tür
  home: '<path d="M50 16 L86 48 H76 V84 H58 V62 H42 V84 H24 V48 H14 Z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round" />',
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, className?: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.dataset.icon = name;
  if (className) svg.setAttribute('class', className);
  svg.innerHTML = ICONS[name];
  return svg;
}

/** Endpunkt auf dem Kreis für einen Winkel im Uhrzeigersinn ab 12 Uhr. */
function pointAt(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
}

/** Uhr-Symbol im Stil des Timers (B-41): Scheibe, Strichmarken, lila Sektor für `minutes` von 60. */
export function clockIcon(minutes: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'clock-icon');
  svg.setAttribute('aria-hidden', 'true');
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const [x1, y1] = pointAt(i * 30, 40);
    const [x2, y2] = pointAt(i * 30, 45);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join('');
  const angle = (minutes / 60) * 360;
  const [ex, ey] = pointAt(angle, 38);
  const largeArc = angle > 180 ? 1 : 0;
  svg.dataset.angle = String(angle);
  svg.innerHTML =
    `<circle class="clock-icon__face" cx="50" cy="50" r="47" />` +
    `<g class="clock-icon__ticks">${ticks}</g>` +
    `<path class="clock-icon__sector" d="M50 50 L50 12 A38 38 0 ${largeArc} 1 ${ex} ${ey} Z" />` +
    `<circle class="clock-icon__hub" cx="50" cy="50" r="5" />`;
  return svg;
}

/** Runder lila Button nur mit Symbol (wie Play); der Name ist nur für Screenreader. */
export function roundButton(label: string, name: IconName, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `round-button ${className}`;
  button.setAttribute('aria-label', label);
  button.append(icon(name));
  return button;
}
