import './styles/tokens.css';
import './styles/base.css';
import './styles/views.css';
import { createAvatar } from './components/avatar';
import { icon } from './components/icons';
import { load, persistOnChange } from './storage';
import { createStore, type Store, type ViewName } from './state';
import type { ViewHandle } from './views/view';
import { renderStart } from './views/start';
import { renderRound } from './views/round';
import { renderEnd } from './views/end';
import { renderSleep } from './views/sleep';

const VIEWS: Record<ViewName, (store: Store) => ViewHandle> = {
  start: renderStart,
  round: renderRound,
  end: renderEnd,
  sleep: renderSleep,
};

const PORTRAIT_QUERY = '(orientation: portrait)';

/**
 * Hochformat-Hinweis (B-52): gewählter Begleiter (ruhig), Dreh-Symbol und „iPad drehen“.
 * iOS ignoriert die Ausrichtung im Manifest, deshalb dieser Hinweis statt einer Sperre.
 */
function createPortraitOverlay(store: Store): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'portrait-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.hidden = true;

  const avatarSlot = document.createElement('div');
  avatarSlot.className = 'portrait-overlay__avatar';
  // Bild erst setzen, wenn das Overlay erscheint – sonst lädt der Browser es unnötig im Hintergrund
  let shownCompanion: string | null = null;
  const showCompanion = () => {
    const companion = store.getState().data.settings.companion ?? 'mimi';
    if (companion === shownCompanion) return;
    shownCompanion = companion;
    avatarSlot.replaceChildren(createAvatar(companion, 'ruhig').el);
  };
  store.subscribe((state) => {
    if (state.portrait) showCompanion();
  });
  if (store.getState().portrait) showCompanion();

  const text = document.createElement('p');
  text.className = 'portrait-overlay__text';
  text.textContent = 'iPad drehen';

  overlay.append(avatarSlot, icon('rotate', 'portrait-overlay__icon'), text);
  return overlay;
}

function start(app: HTMLElement) {
  const portraitQuery = window.matchMedia(PORTRAIT_QUERY);
  const store = createStore(load(), portraitQuery.matches);

  const viewRoot = document.createElement('div');
  viewRoot.className = 'view-root';
  const overlay = createPortraitOverlay(store);
  app.replaceChildren(viewRoot, overlay);

  let current: ViewHandle | null = null;
  const showView = (name: ViewName) => {
    current?.dispose?.();
    current = VIEWS[name](store);
    viewRoot.replaceChildren(current.el);
  };
  const showOverlay = (portrait: boolean) => {
    overlay.hidden = !portrait;
    viewRoot.inert = portrait;
  };

  persistOnChange(store);
  store.subscribe((state, previous) => {
    if (state.view !== previous.view) showView(state.view);
    if (state.portrait !== previous.portrait) showOverlay(state.portrait);
  });
  portraitQuery.addEventListener('change', (e) =>
    store.dispatch({ type: 'orientation', portrait: e.matches }),
  );
  // Als Home-Bildschirm-App bleibt sie oft im Speicher: beim Zurückholen den Tag prüfen (B-65).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') store.dispatch({ type: 'day' });
  });

  showView(store.getState().view);
  showOverlay(store.getState().portrait);
}

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  start(app);
}
