// Avatar: statisches Bild, Posenwechsel nur per Bildtausch (Leitprinzip 4).

export type Companion = 'mimi' | 'mots';
export type Pose = 'ruhig' | 'zeigt' | 'freut' | 'winkt';

export const COMPANIONS: readonly Companion[] = ['mimi', 'mots'];
export const POSES: readonly Pose[] = ['ruhig', 'zeigt', 'freut', 'winkt'];

export const COMPANION_NAMES: Record<Companion, string> = { mimi: 'Mimi', mots: 'Mots' };

const FILE_PREFIX: Record<Companion, string> = { mimi: 'cat', mots: 'pony' };

/** Pose → Dateiname laut anforderungen.md §4. */
const POSE_FILE: Record<Pose, string> = {
  ruhig: 'sitting',
  zeigt: 'pointing',
  freut: 'idle',
  winkt: 'waving',
};

export function avatarUrl(companion: Companion, pose: Pose): string {
  return `${import.meta.env.BASE_URL}avatars/${FILE_PREFIX[companion]}_${POSE_FILE[pose]}.png`;
}

/** Schlafbild eines Begleiters (B-65, Platzhalter bis zur fertigen Grafik). */
export function sleepingAvatarUrl(companion: Companion): string {
  return `${import.meta.env.BASE_URL}avatars/${FILE_PREFIX[companion]}_sleeping.png`;
}

/** Begleiter beim Radschlagen, für den Hochformat-Hinweis (B-72, Platzhalter). */
export function cartwheelAvatarUrl(companion: Companion): string {
  return `${import.meta.env.BASE_URL}avatars/${FILE_PREFIX[companion]}_cartwheel.png`;
}

/** Beide Begleiter schlafend, für die Schlafseite (B-65). */
export function bothSleepingUrl(): string {
  return `${import.meta.env.BASE_URL}avatars/both_sleeping.png`;
}

// Vorgeladene Bilder bleiben referenziert, damit der Browser sie im Speicher hält.
const preloaded = new Map<string, HTMLImageElement>();

/** Lädt alle Posen eines Begleiters vor, damit der Bildtausch ohne Verzögerung passiert. */
export function preloadAvatars(companion: Companion): HTMLImageElement[] {
  return POSES.map((pose) => {
    const url = avatarUrl(companion, pose);
    let img = preloaded.get(url);
    if (!img) {
      img = new Image();
      img.decoding = 'async';
      img.src = url;
      preloaded.set(url, img);
    }
    return img;
  });
}

export interface AvatarHandle {
  readonly el: HTMLElement;
  readonly pose: Pose;
  setPose(pose: Pose): void;
}

/** Erzeugt eine feste Avatar-Box; die Größe kommt aus CSS (`.avatar`), nicht vom Bild. */
export function createAvatar(companion: Companion, pose: Pose): AvatarHandle {
  preloadAvatars(companion);

  const el = document.createElement('div');
  el.className = 'avatar';
  const img = document.createElement('img');
  img.alt = COMPANION_NAMES[companion];
  img.draggable = false;
  el.append(img);

  let current = pose;
  const show = (p: Pose) => {
    current = p;
    img.src = avatarUrl(companion, p);
    el.dataset.pose = p;
  };
  show(pose);

  return {
    el,
    get pose() {
      return current;
    },
    setPose: show,
  };
}
