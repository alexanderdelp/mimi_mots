// B-112: Samen wählen – nach einer abgeschlossenen Lernreise, wenn das Kind noch keinen Samen hat
// oder seine letzte Blume schon blüht. Der Begleiter zeigt auf die freigegebenen Samen (B-109);
// ein Tipp pflanzt den Samen ein, dann zeigt die Seite groß das Bild „eingepflanzt“ und den
// Haus-Button. Vorher gibt es keinen Weg weiter – das Kind wählt immer einen Samen.
import { createAppHeader } from '../components/app-header';
import { createAvatar } from '../components/avatar';
import { roundButton } from '../components/icons';
import { FLOWER_NAMES, flowerUrl, type Flower } from '../data/flowers';
import { canPlant, currentPlant } from '../garden';
import type { Store } from '../state';
import type { ViewHandle } from './view';

export const SEED_TEXT = 'Such dir einen Samen aus!';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function picture(src: string, className: string): HTMLImageElement {
  return Object.assign(el('img', className), { src, alt: '', draggable: false });
}

export function renderSeed(store: Store): ViewHandle {
  const { data } = store.getState();
  const view = el('main', 'view view--seed');
  view.dataset.view = 'seed';
  view.dataset.planted = 'false';

  const avatar = createAvatar(data.settings.companion ?? 'mimi', 'zeigt');
  const stage = el('div', 'seed__stage');

  const planted = () => {
    const plant = currentPlant(store.getState().data.garden)!;
    const image = picture(flowerUrl(plant.flower, 'planted'), 'seed__planted');
    image.alt = FLOWER_NAMES[plant.flower];
    const home = roundButton('Zurück', 'home', 'home-button seed__home');
    home.addEventListener('click', () => store.dispatch({ type: 'home' }));
    stage.replaceChildren(image, home);
    view.dataset.planted = 'true';
  };

  const plantSeed = (flower: Flower) => {
    store.dispatch({ type: 'plant', flower, at: new Date().toISOString() });
    if (!canPlant(store.getState().data.garden)) planted();
  };

  const text = el('p', 'seed__text');
  text.textContent = SEED_TEXT;
  const tiles = el('div', 'seed__tiles');
  for (const flower of data.enabledFlowers) {
    const tile = el('button', 'seed__tile');
    tile.type = 'button';
    tile.dataset.flower = flower;
    tile.setAttribute('aria-label', FLOWER_NAMES[flower]);
    tile.append(picture(flowerUrl(flower, 'seed'), 'seed__image'));
    tile.addEventListener('click', () => plantSeed(flower));
    tiles.append(tile);
  }
  stage.append(text, tiles);

  const body = el('div', 'seed__body');
  body.append(avatar.el, stage);
  view.append(createAppHeader({ name: data.name }), body);
  return { el: view };
}
