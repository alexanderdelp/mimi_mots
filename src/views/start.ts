// Startansicht (anforderungen.md §3.1): Begleiter, Sprache, Dauer wählen, dann Play.
import { COMPANIONS, COMPANION_NAMES, avatarUrl, type Companion } from '../components/avatar';
import { createChoiceGroup } from '../components/choice-tile';
import type { Language } from '../data/words';
import { isComplete, type Store } from '../state';

const SVG_NS = 'http://www.w3.org/2000/svg';
const base = import.meta.env.BASE_URL;

function img(src: string, className: string): HTMLImageElement {
  const el = document.createElement('img');
  el.src = src;
  el.alt = '';
  el.className = className;
  el.draggable = false;
  return el;
}

function text(value: string, className?: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.textContent = value;
  if (className) el.className = className;
  return el;
}

/** Kleines Uhr-Symbol im Stil des Timers (B-41): Scheibe, lila Sektor für 5 Minuten. */
function clockIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'clock-icon');
  svg.setAttribute('aria-hidden', 'true');
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const [x1, y1] = [50 + 40 * Math.sin(a), 50 - 40 * Math.cos(a)];
    const [x2, y2] = [50 + 45 * Math.sin(a), 50 - 45 * Math.cos(a)];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join('');
  // Sektor für 5 von 60 Minuten (30°), vom 12-Uhr-Punkt im Uhrzeigersinn.
  const end = [50 + 38 * Math.sin(Math.PI / 6), 50 - 38 * Math.cos(Math.PI / 6)];
  svg.innerHTML =
    `<circle class="clock-icon__face" cx="50" cy="50" r="47" />` +
    `<g class="clock-icon__ticks">${ticks}</g>` +
    `<path class="clock-icon__sector" d="M50 50 L50 12 A38 38 0 0 1 ${end[0]} ${end[1]} Z" />` +
    `<circle class="clock-icon__hub" cx="50" cy="50" r="5" />`;
  return svg;
}

function playIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<path d="M36 24 L78 50 L36 76 Z" fill="currentColor" stroke="currentColor" stroke-width="8" stroke-linejoin="round" />';
  return svg;
}

function header(): HTMLElement {
  const el = document.createElement('header');
  el.className = 'app-header';
  const title = document.createElement('h1');
  title.textContent = 'Mimi & Mots';
  el.append(img(`${base}icons/icon.svg`, 'app-header__icon'), title);
  return el;
}

const LANGUAGE_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'Englisch', flag: 'flag_gb.png' },
  { value: 'fr', label: 'Französisch', flag: 'flag_fr.png' },
];

export function renderStart(store: Store): HTMLElement {
  const { settings } = store.getState().data;

  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'play-button';
  play.setAttribute('aria-label', 'Los geht’s');
  play.append(playIcon());
  play.addEventListener('click', () => store.dispatch({ type: 'play' }));
  const updatePlay = () => {
    play.disabled = !isComplete(store.getState().data.settings);
  };

  const companions = createChoiceGroup<Companion>(
    'Wer begleitet dich?',
    COMPANIONS.map((c) => ({
      value: c,
      content: [
        img(avatarUrl(c, 'ruhig'), 'start__avatar'),
        text(COMPANION_NAMES[c], 'start__name'),
      ],
    })),
    settings.companion,
    (companion) => {
      store.dispatch({ type: 'select', settings: { companion } });
      updatePlay();
    },
  );

  const languages = createChoiceGroup<Language>(
    'Welche Sprache?',
    LANGUAGE_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
      content: [img(`${base}flags/${o.flag}`, 'start__flag')],
    })),
    settings.language,
    (language) => {
      store.dispatch({ type: 'select', settings: { language } });
      updatePlay();
    },
  );

  const duration = createChoiceGroup<'5'>(
    'Wie lange?',
    [{ value: '5', content: [clockIcon(), text('5 Min.', 'start__duration')] }],
    settings.durationMin === 5 ? '5' : null,
    () => {
      store.dispatch({ type: 'select', settings: { durationMin: 5 } });
      updatePlay();
    },
  );

  companions.el.classList.add('start__group--companion');
  languages.el.classList.add('start__group--language');
  duration.el.classList.add('start__group--duration');

  const groups = document.createElement('div');
  groups.className = 'start__groups';
  groups.append(companions.el, languages.el, duration.el);

  const footer = document.createElement('div');
  footer.className = 'start__footer';
  footer.append(play);
  updatePlay();

  const view = document.createElement('main');
  view.className = 'view view--start';
  view.dataset.view = 'start';
  view.append(header(), groups, footer);
  return view;
}
