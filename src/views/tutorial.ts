// Tutorial der Lernrunde (B-74/B-87, Hörrunde B-89, „Weiter“ B-95): Der gewählte Begleiter
// erklärt an einem Probewort, was es hier gibt. Eine Blur-Ebene lenkt den Fokus, das Gemeinte
// wird mit einem gezogenen Stiftkreis markiert. Nur „Weiter“ geht weiter; das Probewort zählt
// nicht. Die Round-View liefert die Ziele und übernimmt nach dem letzten Schritt.
import type { AvatarHandle, Pose } from '../components/avatar';
import { roundButton } from '../components/icons';
import type { Word } from '../data/words';

/** Probewort (B-74). */
const TUTORIAL_WORD = 'apfel';

/** Probewort: Apfel, oder das erste Wort, wenn Apfel fehlt (B-84) oder ausgeschaltet ist (B-88). */
export function tutorialWord(words: readonly Word[]): Word {
  return words.find((w) => w.id === TUTORIAL_WORD) ?? words[0];
}

export type TutorialTarget =
  'card' | 'answer' | 'flag' | 'speaker' | 'reveal' | 'known' | 'practice' | 'timer';

/** Unscharf (B-87): alles außer Kopfleiste und Begleiter, oder nur die Übersetzungskarte (samt
 *  Bewertung), in der Hörrunde (B-89) nur die Bildkarte (samt Bewertung). Die Kopfleiste bleibt
 *  immer scharf. */
type TutorialBlur = 'all' | 'answer' | 'word';

interface TutorialStep {
  text: string;
  pose: Pose;
  /** Eingekreistes Element; null = keins. */
  target: TutorialTarget | null;
  blur?: TutorialBlur;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { text: 'Hallo! Schön, dass du da bist!', pose: 'winkt', target: null, blur: 'all' },
  {
    text: 'Lass uns mal sehen, was du hier machen kannst.',
    pose: 'freut',
    target: null,
    blur: 'all',
  },
  { text: 'Hier ist das Wort zum Übersetzen.', pose: 'zeigt', target: 'card', blur: 'answer' },
  { text: 'Sprich das übersetzte Wort laut aus.', pose: 'zeigt', target: 'flag' },
  { text: 'Tippe hier, um es anzuhören.', pose: 'zeigt', target: 'speaker' },
  { text: 'Hast du es gewusst? Dann tippe hier.', pose: 'ruhig', target: 'known' },
  { text: 'Wusstest du es noch nicht? Dann tippe hier.', pose: 'ruhig', target: 'practice' },
  { text: 'Das Wort kommt dann später wieder.', pose: 'ruhig', target: 'practice' },
  {
    text: 'Nach einiger Zeit werde ich müde und möchte mich hinlegen.',
    pose: 'zeigt',
    target: 'timer',
    blur: 'all',
  },
  { text: 'Los geht’s!', pose: 'winkt', target: null, blur: 'all' },
];

/** B-89: Tutorial der Hörrunde – gleicher Aufbau, eigene Schritte. */
export const LISTEN_TUTORIAL_STEPS: readonly TutorialStep[] = [
  { text: 'Hallo! Jetzt spitzen wir die Ohren.', pose: 'winkt', target: null, blur: 'all' },
  {
    text: 'Lass uns mal sehen, wie das Zuhören geht.',
    pose: 'freut',
    target: null,
    blur: 'all',
  },
  { text: 'Hör gut zu: Hier ist das Wort.', pose: 'zeigt', target: 'answer', blur: 'word' },
  { text: 'Tippe hier, um es noch mal zu hören.', pose: 'zeigt', target: 'speaker', blur: 'word' },
  { text: 'Was bedeutet es? Tippe hier, dann siehst du es.', pose: 'zeigt', target: 'reveal' },
  { text: 'Hast du es gewusst? Dann tippe hier.', pose: 'ruhig', target: 'known' },
  { text: 'Wusstest du es noch nicht? Dann tippe hier.', pose: 'ruhig', target: 'practice' },
  { text: 'Das Wort kommt dann später wieder.', pose: 'ruhig', target: 'practice' },
  {
    text: 'Nach einiger Zeit werde ich müde und möchte mich hinlegen.',
    pose: 'zeigt',
    target: 'timer',
    blur: 'all',
  },
  { text: 'Los geht’s!', pose: 'winkt', target: null, blur: 'all' },
];

/**
 * Von Hand eingekreist (B-87): eine leicht unregelmäßige Schleife mit gut einer Umdrehung, die
 * oben links beginnt und über den Anfang hinausläuft – in Pixeln für eine Box w × h berechnet,
 * damit der Strich überall gleich dick ist und die Zeichen-Animation den ganzen Weg geht.
 */
export function penLoop(w: number, h: number): string {
  const steps = 72;
  const turns = 1.25;
  const start = -2.5; // oben links
  const rx = (w / 2 - 3) / 1.05;
  const ry = (h / 2 - 3) / 1.05;
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const t = start + (i / steps) * turns * 2 * Math.PI;
    // leichtes Wackeln und ein wenig nach innen, damit sich der Strich am Ende nicht deckt
    const wobble = 1 + 0.035 * Math.sin(2.3 * t + 0.5) - 0.05 * (i / steps);
    const x = w / 2 + rx * wobble * Math.cos(t);
    const y = h / 2 + ry * wobble * Math.sin(t);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `M${points.join(' L')}`;
}

/** Abstand des Kreises um das Ziel. */
function markPadding(height: number): [number, number] {
  return [Math.min(44, height * 0.45), Math.min(16, height * 0.18)];
}

export interface TutorialOptions {
  /** Wurzel der Lernrunde: bekommt die data-Attribute, fängt Tipps ab, trägt den Kreis. */
  view: HTMLElement;
  listen: boolean;
  avatar: AvatarHandle;
  targets: Record<TutorialTarget, Element>;
  /** Spielt das Probewort ab. */
  play(): void;
  stop(): void;
  /** Zeigt das Probewort aufgedeckt. */
  reveal(): void;
  /** Nach dem letzten Schritt: erstes echtes Wort, Uhr starten. */
  onDone(): void;
}

export interface Tutorial {
  /** Sprechblase mit Text und „Weiter“-Button; die Round-View setzt sie neben den Begleiter. */
  readonly bubble: HTMLElement;
  /** true, solange das Tutorial läuft. */
  active(): boolean;
  start(): void;
  dispose(): void;
}

export function createTutorial(options: TutorialOptions): Tutorial {
  const { view, listen, avatar, targets } = options;
  let tutorialStep = -1;
  const steps = listen ? LISTEN_TUTORIAL_STEPS : TUTORIAL_STEPS;
  /** Die Uhr erscheint erst, wenn sie erklärt wird (B-87). */
  const timerStep = steps.findIndex((step) => step.target === 'timer');

  // Sprechblase mit Text und „Weiter“-Button (B-95): nur er schaltet die Schritte weiter
  const bubble = document.createElement('div');
  bubble.className = 'tutorial-bubble';
  bubble.hidden = true;
  const bubbleText = document.createElement('p');
  bubbleText.className = 'tutorial-bubble__text';
  bubbleText.setAttribute('role', 'status');
  const next = roundButton('Weiter', 'next', 'tutorial-next');
  bubble.append(bubbleText, next);

  // Der Kreis liegt in einer eigenen Ebene über der Ansicht (auch um Bilder wie die Flagge)
  // und bleibt immer ganz im Bild.
  const mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mark.setAttribute('class', 'tutorial-mark');
  mark.setAttribute('aria-hidden', 'true');
  const markPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  markPath.setAttribute('pathLength', '100');
  mark.append(markPath);
  let marked: TutorialTarget | null = null;
  const placeMark = () => {
    if (!marked) return;
    const box = targets[marked].getBoundingClientRect();
    const frame = view.getBoundingClientRect();
    const [padX, padY] = markPadding(box.height);
    const left = Math.max(2, box.left - frame.left - padX);
    const top = Math.max(2, box.top - frame.top - padY);
    const right = Math.min(frame.width - 2, box.right - frame.left + padX);
    const bottom = Math.min(frame.height - 2, box.bottom - frame.top + padY);
    const [w, h] = [Math.max(right - left, 1), Math.max(bottom - top, 1)];
    Object.assign(mark.style, { left: `${left}px`, top: `${top}px` });
    mark.setAttribute('width', String(w));
    mark.setAttribute('height', String(h));
    mark.setAttribute('viewBox', `0 0 ${w} ${h}`);
    markPath.setAttribute('d', penLoop(w, h));
  };
  window.addEventListener('resize', placeMark);
  const showTutorialStep = () => {
    const step = steps[tutorialStep];
    const previous = steps[tutorialStep - 1];
    view.dataset.tutorial = String(tutorialStep + 1);
    view.dataset.tutorialBlur = step.blur ?? 'none';
    view.dataset.tutorialTimer = String(tutorialStep >= timerStep);
    bubbleText.textContent = step.text;
    bubble.hidden = false;
    // nach dem Lautsprecher (Hörrunde: dem Auge) ist das Probewort aufgedeckt, damit die
    // Bewertung Sinn ergibt
    if (previous?.target === (listen ? 'reveal' : 'speaker')) options.reveal();
    // Hörrunde: beim Zeigen auf das Wort wird es einmal abgespielt
    if (listen && step.target === 'answer' && previous?.target !== 'answer') options.play();
    if (avatar.pose !== step.pose) avatar.setPose(step.pose);
    for (const [name, node] of Object.entries(targets)) {
      node.classList.toggle('tutorial-target', name === step.target);
    }
    if (!step.target) {
      marked = null;
      return mark.remove();
    }
    // gleiches Ziel wie zuvor: Kreis bleibt stehen; neues Ziel: wird neu gezogen
    if (marked !== step.target) {
      marked = step.target;
      view.append(mark);
      placeMark();
      mark.classList.remove('tutorial-mark--draw');
      void mark.getBoundingClientRect();
      mark.classList.add('tutorial-mark--draw');
    }
  };
  const nextTutorialStep = () => {
    tutorialStep++;
    if (tutorialStep < steps.length) return showTutorialStep();
    finishTutorial();
  };
  // Jeder Tipp wird vor den Buttons abgefangen, damit sie im Tutorial nichts tun (B-95). Nur
  // „Weiter“ geht weiter; der Lautsprecher spielt in seinem Schritt das Probewort ab.
  const onTutorialTap = (event: Event) => {
    if (tutorialStep < 0) return;
    event.stopPropagation();
    event.preventDefault();
    const tapped = event.target as Node;
    if (next.contains(tapped)) {
      options.stop();
      nextTutorialStep();
    } else if (steps[tutorialStep].target === 'speaker' && targets.speaker.contains(tapped)) {
      options.play();
    }
  };
  view.addEventListener('click', onTutorialTap, true);
  const finishTutorial = () => {
    tutorialStep = -1;
    view.removeEventListener('click', onTutorialTap, true);
    delete view.dataset.tutorial;
    delete view.dataset.tutorialBlur;
    delete view.dataset.tutorialTimer;
    bubble.hidden = true;
    marked = null;
    mark.remove();
    window.removeEventListener('resize', placeMark);
    Object.values(targets).forEach((node) => node.classList.remove('tutorial-target'));
    avatar.setPose('zeigt');
    options.onDone();
  };

  return {
    bubble,
    active: () => tutorialStep >= 0,
    start() {
      tutorialStep = 0;
      showTutorialStep();
    },
    dispose() {
      window.removeEventListener('resize', placeMark);
    },
  };
}
