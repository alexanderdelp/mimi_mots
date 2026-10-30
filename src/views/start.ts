// Startansicht (anforderungen.md §3.1): Begleiter, Sprache, Dauer wählen, dann Play.
// Schlafende Begleiter, verbrauchte Dauern und ausgeschaltete Sprachen sind ausgegraut (B-65/B-73).
import {
  COMPANIONS,
  COMPANION_NAMES,
  avatarUrl,
  sleepingAvatarUrl,
  type Companion,
} from '../components/avatar';
import { createAppHeader, onIconHold } from '../components/app-header';
import { createChoiceGroup } from '../components/choice-tile';
import { clockIcon, icon } from '../components/icons';
import { LANGUAGE_INFO, flagUrl } from '../data/languages';
import type { Language } from '../data/words';
import { isComplete, type Store } from '../state';
import { DURATIONS, LANGUAGES, type DurationMin } from '../storage';
import type { ViewHandle } from './view';

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

export function renderStart(store: Store): ViewHandle {
  const { settings, rest, enabledLanguages } = store.getState().data;

  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'round-button play-button';
  play.setAttribute('aria-label', 'Los geht’s');
  play.append(icon('play'));
  play.addEventListener('click', () => store.dispatch({ type: 'play' }));
  const updatePlay = () => {
    play.disabled = !isComplete(store.getState().data.settings);
  };

  const companions = createChoiceGroup<Companion>(
    'Wer soll dich begleiten?',
    COMPANIONS.map((c) => {
      const asleep = rest.sleeping.includes(c);
      return {
        value: c,
        disabled: asleep,
        content: [
          img(asleep ? sleepingAvatarUrl(c) : avatarUrl(c, 'ruhig'), 'start__avatar'),
          text(COMPANION_NAMES[c], 'start__name'),
        ],
      };
    }),
    settings.companion,
    (companion) => {
      store.dispatch({ type: 'select', settings: { companion } });
      updatePlay();
    },
  );

  const languages = createChoiceGroup<Language>(
    'In welcher Sprache?',
    LANGUAGES.map((language) => ({
      value: language,
      label: LANGUAGE_INFO[language].name,
      disabled: !enabledLanguages.includes(language), // im Elternbereich ausgeschaltet (B-73)
      content: [img(flagUrl(language), 'start__flag')],
    })),
    settings.language,
    (language) => {
      store.dispatch({ type: 'select', settings: { language } });
      updatePlay();
    },
  );

  const duration = createChoiceGroup<`${DurationMin}`>(
    'Wie lange?',
    DURATIONS.map((minutes) => ({
      value: `${minutes}` as const,
      label: `${minutes} Minuten`,
      disabled: rest.usedDurations.includes(minutes),
      content: [clockIcon(minutes)],
    })),
    settings.durationMin ? `${settings.durationMin}` : null,
    (value) => {
      store.dispatch({ type: 'select', settings: { durationMin: Number(value) as DurationMin } });
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
  const header = createAppHeader();
  const release = onIconHold(header, () => store.dispatch({ type: 'admin' }));
  view.append(header, groups, footer);
  return { el: view, dispose: release };
}
