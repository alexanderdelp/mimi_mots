// Startansicht (anforderungen.md §3.1): Begleiter, Sprache, Modus wählen, dann Play.
// Schlafende Begleiter sind ausgegraut (B-65), Modus Sprechen/Hören (B-89). Sprachen erscheinen nur, wenn
// sie eingeschaltet sind und Wörter haben (B-81/B-84) – ausgeschaltete fehlen ganz.
import {
  COMPANIONS,
  COMPANION_NAMES,
  avatarUrl,
  sleepingAvatarUrl,
  type Companion,
} from '../components/avatar';
import { createAppHeader, onIconHold } from '../components/app-header';
import { createChoiceGroup } from '../components/choice-tile';
import { icon } from '../components/icons';
import { LANGUAGE_INFO, flagUrl } from '../data/languages';
import { MODE_INFO } from '../data/modes';
import type { Language } from '../data/words';
import { isComplete, playableLanguages, type Store } from '../state';
import { MODES, type Mode } from '../storage';
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
  const { data } = store.getState();
  const { settings, rest } = data;

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
          asleep
            ? img(sleepingAvatarUrl(c), 'start__avatar start__avatar--sleeping')
            : img(avatarUrl(c, 'ruhig'), 'start__avatar'),
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
    playableLanguages(data).map((language) => ({
      value: language,
      label: LANGUAGE_INFO[language].name,
      content: [img(flagUrl(language), 'start__flag')],
    })),
    settings.language,
    (language) => {
      store.dispatch({ type: 'select', settings: { language } });
      updatePlay();
    },
  );

  const modes = createChoiceGroup<Mode>(
    'Bei was?',
    MODES.map((mode) => ({
      value: mode,
      label: MODE_INFO[mode].name,
      content: [icon(MODE_INFO[mode].icon, 'mode-icon')],
    })),
    settings.mode,
    (mode) => {
      store.dispatch({ type: 'select', settings: { mode } });
      updatePlay();
    },
  );

  companions.el.classList.add('start__group--companion');
  languages.el.classList.add('start__group--language');
  // eine Sprache: eine Spalte, sonst zwei (2 × 2 bei vier Sprachen)
  languages.el.style.setProperty('--language-columns', String(Math.min(2, languages.tiles.size)));
  modes.el.classList.add('start__group--mode');

  const groups = document.createElement('div');
  groups.className = 'start__groups';
  groups.append(companions.el, languages.el, modes.el);

  const footer = document.createElement('div');
  footer.className = 'start__footer';
  footer.append(play);
  updatePlay();

  const view = document.createElement('main');
  view.className = 'view view--start';
  view.dataset.view = 'start';
  const header = createAppHeader({ name: data.name });
  const release = onIconHold(header, () => store.dispatch({ type: 'admin' }));
  view.append(header, groups, footer);
  return { el: view, dispose: release };
}
