// Vorschau für den visuellen Check von B-10: Auswahlkacheln in drei Gruppen.
// Platzhalter, wird mit B-11 durch die Startansicht ersetzt.
import { COMPANIONS, COMPANION_NAMES, avatarUrl } from '../components/avatar';
import { createChoiceGroup } from '../components/choice-tile';

function img(src: string, className: string): HTMLImageElement {
  const el = document.createElement('img');
  el.src = src;
  el.alt = '';
  el.className = className;
  el.draggable = false;
  return el;
}

function text(value: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.textContent = value;
  return el;
}

export function renderTilePreview(root: HTMLElement): void {
  const base = import.meta.env.BASE_URL;

  const companions = createChoiceGroup(
    'Wer begleitet dich?',
    COMPANIONS.map((c) => ({
      value: c,
      content: [img(avatarUrl(c, 'ruhig'), 'tile-preview__avatar'), text(COMPANION_NAMES[c])],
    })),
    null,
    () => {},
  );

  const languages = createChoiceGroup(
    'Welche Sprache?',
    [
      {
        value: 'en',
        label: 'Englisch',
        content: [img(`${base}flags/flag_gb.png`, 'tile-preview__flag')],
      },
      {
        value: 'fr',
        label: 'Französisch',
        content: [img(`${base}flags/flag_fr.png`, 'tile-preview__flag')],
      },
    ],
    null,
    () => {},
  );

  const duration = createChoiceGroup(
    'Wie lange?',
    [{ value: '5', content: [text('🕔'), text('5 Min.')] }],
    '5',
    () => {},
  );

  const view = document.createElement('main');
  view.className = 'tile-preview';
  view.append(companions.el, languages.el, duration.el);
  root.replaceChildren(view);
}
