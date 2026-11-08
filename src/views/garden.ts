// B-112: Garten des Kinds – alle Pflanzen in ihrer Stufe, in der Reihenfolge des Einpflanzens.
// Nur ansehen; keine Texte, keine Zahlen. Zurück über den Haus-Button.
import { createAppHeader } from '../components/app-header';
import { roundButton } from '../components/icons';
import { FLOWER_NAMES, FLOWER_STAGES, flowerUrl } from '../data/flowers';
import type { Store } from '../state';
import type { ViewHandle } from './view';

/** Höhe einer Pflanze: so groß wie möglich, so klein wie nötig, damit alles ohne Scrollen passt. */
const SIZES = [320, 280, 240, 200, 170, 140, 120, 100, 84, 72, 60, 50, 42, 36, 30];

export function renderGarden(store: Store): ViewHandle {
  const { data } = store.getState();
  const view = document.createElement('main');
  view.className = 'view view--garden';
  view.dataset.view = 'garden';

  const home = roundButton('Zurück', 'home', 'home-button garden__home');
  home.addEventListener('click', () => store.dispatch({ type: 'home' }));

  const bed = document.createElement('div');
  bed.className = 'garden__bed';
  bed.setAttribute('role', 'list');
  for (const plant of data.garden.plants) {
    const stage = FLOWER_STAGES[plant.stage];
    const image = Object.assign(document.createElement('img'), {
      className: 'garden__plant',
      src: flowerUrl(plant.flower, stage),
      alt: FLOWER_NAMES[plant.flower],
      draggable: false,
    });
    image.setAttribute('role', 'listitem');
    image.dataset.flower = plant.flower;
    image.dataset.stage = stage;
    bed.append(image);
  }

  /** Pflanzen verkleinern, bis nichts mehr überläuft (viele Pflanzen). */
  const fit = () => {
    for (const size of SIZES) {
      bed.style.setProperty('--plant-h', `${size}px`);
      if (bed.scrollHeight <= bed.clientHeight + 1 && bed.scrollWidth <= bed.clientWidth + 1) {
        return;
      }
    }
  };

  const body = document.createElement('div');
  body.className = 'garden__body';
  body.append(bed);
  view.append(createAppHeader({ start: home, name: data.name }), body);

  // erst im Dokument lässt sich messen; bei Größenwechsel (Drehen, iPhone) neu einpassen
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => fit());
  observer?.observe(bed);
  return { el: view, dispose: () => observer?.disconnect() };
}
