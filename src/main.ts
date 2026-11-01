import './styles/tokens.css';
import './styles/base.css';
// B-92: eine Datei je Ansicht, damit parallele Aufgaben selten dieselbe Datei ändern
import './styles/components.css';
import './styles/portrait.css';
import './styles/welcome.css';
import './styles/start.css';
import './styles/round.css';
import './styles/end.css';
import './styles/sleep.css';
import './styles/admin.css';
import { COMPANION_NAMES, cartwheelAvatarUrl } from './components/avatar';
import { icon } from './components/icons';
import { activeChild, childData, load, persistOnChange } from './storage';
import { createStore, type Store, type ViewName } from './state';
import type { ViewHandle } from './views/view';
import { renderWelcome } from './views/welcome';
import { renderStart } from './views/start';
import { renderRound } from './views/round';
import { renderEnd } from './views/end';
import { renderSleep } from './views/sleep';
import { renderAdmin } from './views/admin';

const VIEWS: Record<ViewName, (store: Store) => ViewHandle> = {
  welcome: renderWelcome,
  start: renderStart,
  round: renderRound,
  end: renderEnd,
  sleep: renderSleep,
  admin: renderAdmin,
};

const PORTRAIT_QUERY = '(orientation: portrait)';

/**
 * Hochformat-Hinweis (B-52/B-72): gewählter Begleiter beim Radschlagen und Dreh-Symbol, ohne
 * Text („iPad drehen“ nur für Screenreader). iOS ignoriert die Ausrichtung im Manifest, deshalb
 * dieser Hinweis statt einer Sperre.
 */
function createPortraitOverlay(store: Store): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'portrait-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-label', 'iPad drehen');
  overlay.hidden = true;

  const avatarSlot = document.createElement('div');
  avatarSlot.className = 'portrait-overlay__avatar';
  // Bild erst setzen, wenn das Overlay erscheint – sonst lädt der Browser es unnötig im Hintergrund
  let shownCompanion: string | null = null;
  const showCompanion = () => {
    const companion = store.getState().data.settings.companion ?? 'mimi';
    if (companion === shownCompanion) return;
    shownCompanion = companion;
    const box = document.createElement('div');
    box.className = 'avatar';
    const img = document.createElement('img');
    img.src = cartwheelAvatarUrl(companion);
    img.alt = COMPANION_NAMES[companion];
    img.draggable = false;
    box.append(img);
    avatarSlot.replaceChildren(box);
  };
  store.subscribe((state) => {
    if (state.portrait) showCompanion();
  });
  if (store.getState().portrait) showCompanion();

  overlay.append(avatarSlot, icon('rotate', 'portrait-overlay__icon'));
  return overlay;
}

function start(app: HTMLElement) {
  const portraitQuery = window.matchMedia(PORTRAIT_QUERY);
  // B-97: gespeichert sind alle Kinder, der Store arbeitet mit dem aktiven
  const stored = load();
  const store = createStore(childData(activeChild(stored)), portraitQuery.matches);

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

  persistOnChange(store, stored);
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
