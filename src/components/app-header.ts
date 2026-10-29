// Kopfleiste mit App-Icon und Titel – auf Startseite und Lernseite gleich.

export function createAppHeader(): HTMLElement {
  const el = document.createElement('header');
  el.className = 'app-header';
  const logo = document.createElement('img');
  logo.src = `${import.meta.env.BASE_URL}icons/icon.svg`;
  logo.alt = '';
  logo.className = 'app-header__icon';
  logo.draggable = false;
  const title = document.createElement('h1');
  title.textContent = 'Mimi & Mots';
  el.append(logo, title);
  return el;
}
