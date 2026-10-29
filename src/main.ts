import './styles/tokens.css';
import './styles/base.css';
import './styles/views.css';
import { renderAvatarPreview } from './views/avatar-preview';

// Einstieg. Bis zum Router (B-06) zeigt die App die Avatar-Vorschau aus B-03.
const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  renderAvatarPreview(app);
}
