// Vorschau für den visuellen Check von B-03: beide Begleiter, Posen per Tipp umschalten.
// Platzhalter, wird mit B-06/B-11 durch Router und Startansicht ersetzt.
import { COMPANIONS, POSES, createAvatar } from '../components/avatar';

export function renderAvatarPreview(root: HTMLElement): void {
  const avatars = COMPANIONS.map((c) => createAvatar(c, 'ruhig'));

  const stage = document.createElement('div');
  stage.className = 'avatar-preview__stage';
  avatars.forEach((a, i) => {
    a.el.dataset.companion = COMPANIONS[i];
    stage.append(a.el);
  });

  const buttons = document.createElement('div');
  buttons.className = 'avatar-preview__buttons';
  const poseButtons = POSES.map((pose) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = pose;
    btn.dataset.pose = pose;
    btn.setAttribute('aria-pressed', String(pose === 'ruhig'));
    btn.addEventListener('click', () => {
      avatars.forEach((a) => a.setPose(pose));
      poseButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    });
    return btn;
  });
  buttons.append(...poseButtons);

  const view = document.createElement('main');
  view.className = 'avatar-preview';
  view.append(stage, buttons);
  root.replaceChildren(view);
}
