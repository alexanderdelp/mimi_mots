import './styles/tokens.css';
import './styles/base.css';
import './styles/views.css';
import { load, persistOnChange } from './storage';
import { createStore, type Store, type ViewName } from './state';
import type { ViewHandle } from './views/view';
import { renderStart } from './views/start';
import { renderRound } from './views/round';
import { renderEnd } from './views/end';

const VIEWS: Record<ViewName, (store: Store) => ViewHandle> = {
  start: renderStart,
  round: renderRound,
  end: renderEnd,
};

const PORTRAIT_QUERY = '(orientation: portrait)';

/** Hochformat-Hinweis; Gestaltung mit Avatar folgt in B-52. */
function createPortraitOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'portrait-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.innerHTML =
    '<span class="portrait-overlay__icon" aria-hidden="true">🔄</span><p>iPad drehen</p>';
  overlay.hidden = true;
  return overlay;
}

function start(app: HTMLElement) {
  const portraitQuery = window.matchMedia(PORTRAIT_QUERY);
  const store = createStore(load(), portraitQuery.matches);

  const viewRoot = document.createElement('div');
  viewRoot.className = 'view-root';
  const overlay = createPortraitOverlay();
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

  showView(store.getState().view);
  showOverlay(store.getState().portrait);
}

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  start(app);
}
