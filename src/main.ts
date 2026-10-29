import './styles/tokens.css';
import './styles/base.css';
import './styles/views.css';
import { load } from './storage';
import { renderAvatarPreview } from './views/avatar-preview';

// Gespeicherter Stand; wird ab B-06 an den App-State übergeben.
export const data = load();

// Einstieg. Bis zum Router (B-06) zeigt die App die Avatar-Vorschau aus B-03.
const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  renderAvatarPreview(app);
}
