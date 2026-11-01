// Eigene, schlichte SVG-Symbole (weiß auf lila Rundbuttons, lila auf den Modus-Kacheln).

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
  // Zurück: Pfeil nach links (Elternbereich → Startseite, B-86)
  back:
    '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M46 22 L18 50 L46 78" /><path d="M20 50 H82" /></g>',
  // Weiter: Pfeil nach rechts (Tutorial, B-95) – Spiegelbild von „Zurück“
  next:
    '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M54 22 L82 50 L54 78" /><path d="M80 50 H18" /></g>',
  // Drehen: iPad hochkant, gebogener Pfeil nach rechts zur Querlage
  rotate:
    '<rect x="14" y="24" width="38" height="60" rx="7" fill="none" stroke="currentColor" stroke-width="6" />' +
    '<circle cx="33" cy="76" r="3" fill="currentColor" />' +
    '<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M48 16 A36 36 0 0 1 86 50" /><path d="M76 46 L86 54 L94 42" /></g>',
  // B-89 Modus Sprechen: Kopf im Profil mit Schallwellen vor dem Mund
  speak:
    '<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M22 88 V72 C10 64 8 50 10 40 C13 22 26 12 41 12 C55 12 63 22 63 34 L69 47 L63 50 V59 C63 65 59 67 53 67 H47 V88" />' +
    '<path d="M76 30 A14 14 0 0 1 76 52" /><path d="M85 21 A27 27 0 0 1 85 61" /></g>',
  // B-89 Modus Hören: Ohr mit Muschel
  listen:
    '<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M30 40 C30 22 42 12 54 12 C70 12 80 24 80 40 C80 54 70 58 66 66 C62 76 58 88 44 88 C36 88 32 82 32 76" />' +
    '<path d="M44 42 C44 32 50 28 56 28 C64 28 68 34 68 40 C68 48 58 50 56 58 C55 63 52 66 48 66" /></g>',
  // B-89 Hörrunde: Auge – „Zeig mir das deutsche Wort“
  eye:
    '<path d="M8 50 C22 28 36 20 50 20 C64 20 78 28 92 50 C78 72 64 80 50 80 C36 80 22 72 8 50 Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round" />' +
    '<circle cx="50" cy="50" r="14" fill="currentColor" />',
  // B-97 Begrüßung: Haken – Namen bestätigen („Fertig“)
  check:
    '<path d="M20 52 L42 74 L82 28" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />',
  // B-93 Rundendauer im Elternbereich: kürzer (−) und länger (+)
  minus:
    '<path d="M22 50 H78" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" />',
  // B-99: Kopieren – das übliche Symbol aus zwei überlappenden Rechtecken
  copy:
    '<g fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round">' +
    '<rect x="34" y="32" width="46" height="54" rx="8" />' +
    '<path d="M24 66 H22 A6 6 0 0 1 16 60 V20 A6 6 0 0 1 22 14 H58 A6 6 0 0 1 64 20 V22" /></g>',
  plus: '<path d="M22 50 H78 M50 22 V78" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" />',
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

/** Runder lila Button nur mit Symbol (wie Play); der Name ist nur für Screenreader. */
export function roundButton(label: string, name: IconName, className: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `round-button ${className}`;
  button.setAttribute('aria-label', label);
  button.append(icon(name));
  return button;
}
