// Kopfleiste mit App-Icon und Titel – auf allen Seiten gleich. Links und rechts gibt es feste
// Plätze, z. B. für [×] und den Timer in der Lernrunde; Icon und Titel bleiben immer mittig.

export interface AppHeaderSlots {
  start?: Node;
  end?: Node;
}

export function createAppHeader(slots: AppHeaderSlots = {}): HTMLElement {
  const el = document.createElement('header');
  el.className = 'app-header';

  const slot = (side: 'start' | 'end', content?: Node) => {
    const div = document.createElement('div');
    div.className = `app-header__slot app-header__slot--${side}`;
    if (content) div.append(content);
    return div;
  };

  const brand = document.createElement('div');
  brand.className = 'app-header__brand';
  const logo = document.createElement('img');
  logo.src = `${import.meta.env.BASE_URL}icons/icon.svg`;
  logo.alt = '';
  logo.className = 'app-header__icon';
  logo.draggable = false;
  const title = document.createElement('h1');
  title.textContent = 'Mimi & Mots';
  brand.append(logo, title);

  el.append(slot('start', slots.start), brand, slot('end', slots.end));
  return el;
}
