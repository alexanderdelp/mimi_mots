// Abschluss (anforderungen.md §3.3): Begleiter winkt groß, freundlicher Satz ohne
// Leistungsbezug, runder Haus-Button zurück zum Start. Keine Zusammenfassung, keine Zahlen.
// B-112: Ist die Pflanze nach dieser Lernreise gewachsen, steht ihre neue Stufe neben dem
// Begleiter (nur Bild).
import { createAppHeader } from '../components/app-header';
import { createAvatar } from '../components/avatar';
import { roundButton } from '../components/icons';
import { FLOWER_NAMES, FLOWER_STAGES, flowerUrl } from '../data/flowers';
import { currentPlant } from '../garden';
import type { Store } from '../state';
import type { ViewHandle } from './view';

export const END_TEXT = 'Bis zum nächsten Mal!';

export function renderEnd(store: Store): ViewHandle {
  const { data, harvest } = store.getState();
  const view = document.createElement('main');
  view.className = 'view view--end';
  view.dataset.view = 'end';

  const avatar = createAvatar(data.settings.companion ?? 'mimi', 'winkt');
  const scene = document.createElement('div');
  scene.className = 'end__scene';
  scene.append(avatar.el);
  const plant = harvest === 'grew' ? currentPlant(data.garden) : null;
  if (plant) {
    const stage = FLOWER_STAGES[plant.stage];
    const image = Object.assign(document.createElement('img'), {
      className: 'end__plant',
      src: flowerUrl(plant.flower, stage),
      alt: FLOWER_NAMES[plant.flower],
      draggable: false,
    });
    image.dataset.stage = stage;
    scene.append(image);
  }

  const text = document.createElement('p');
  text.className = 'end__text';
  text.textContent = END_TEXT;

  const home = roundButton('Zurück', 'home', 'home-button');
  home.addEventListener('click', () => store.dispatch({ type: 'home' }));

  const body = document.createElement('div');
  body.className = 'end__body';
  body.append(scene, text, home);

  view.append(createAppHeader({ name: data.name }), body);
  return { el: view };
}
