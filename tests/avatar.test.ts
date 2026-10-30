import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  COMPANIONS,
  POSES,
  avatarUrl,
  createAvatar,
  preloadAvatars,
  type Companion,
  type Pose,
} from '../src/components/avatar';

/** Breite/Höhe aus dem IHDR-Chunk einer PNG-Datei. */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const publicPath = (url: string) => `public/${url.replace(import.meta.env.BASE_URL, '')}`;

const expectedFiles: Record<Companion, Record<Pose, string>> = {
  mimi: { ruhig: 'cat_sitting', zeigt: 'cat_pointing', freut: 'cat_idle', winkt: 'cat_waving' },
  mots: {
    ruhig: 'pony_sitting',
    zeigt: 'pony_pointing',
    freut: 'pony_idle',
    winkt: 'pony_waving',
  },
};

describe('avatarUrl', () => {
  const combos = COMPANIONS.flatMap((c) => POSES.map((p) => [c, p] as const));

  it.each(combos)('%s/%s zeigt auf die Datei laut anforderungen.md §4', (companion, pose) => {
    expect(avatarUrl(companion, pose)).toBe(
      `${import.meta.env.BASE_URL}avatars/${expectedFiles[companion][pose]}.png`,
    );
  });

  it.each(combos)('%s/%s existiert als PNG mit 384 × 440 px', (companion, pose) => {
    const path = publicPath(avatarUrl(companion, pose));
    expect(existsSync(path)).toBe(true);
    expect(pngSize(path)).toEqual({ width: 384, height: 440 });
  });

  it('jede Kombination hat eine eigene Datei', () => {
    expect(new Set(combos.map(([c, p]) => avatarUrl(c, p))).size).toBe(8);
  });
});

describe('preloadAvatars', () => {
  it('lädt alle vier Posen eines Begleiters', () => {
    const imgs = preloadAvatars('mots');
    expect(imgs.map((i) => new URL(i.src).pathname)).toEqual(
      POSES.map((p) => avatarUrl('mots', p)),
    );
  });

  it('erzeugt beim erneuten Aufruf keine neuen Bilder', () => {
    const first = preloadAvatars('mimi');
    const second = preloadAvatars('mimi');
    first.forEach((img, i) => expect(second[i]).toBe(img));
  });
});

describe('createAvatar', () => {
  it('zeigt die Startpose in einer festen Box', () => {
    const avatar = createAvatar('mimi', 'ruhig');
    expect(avatar.el.classList.contains('avatar')).toBe(true);
    expect(avatar.el.dataset.pose).toBe('ruhig');
    expect(avatar.el.querySelector('img')!.alt).toBe('Mimi');
  });

  it('tauscht beim Posenwechsel nur die Bildquelle, nicht das Element', () => {
    const avatar = createAvatar('mots', 'zeigt');
    const img = avatar.el.querySelector('img')!;
    avatar.setPose('freut');
    expect(avatar.el.querySelector('img')).toBe(img);
    expect(new URL(img.src).pathname).toBe(avatarUrl('mots', 'freut'));
    expect(avatar.pose).toBe('freut');
    expect(avatar.el.dataset.pose).toBe('freut');
  });

  it('erzeugt keine Animation (kein animate-Aufruf, keine Animationsklasse)', () => {
    const avatar = createAvatar('mimi', 'ruhig');
    avatar.setPose('winkt');
    expect(avatar.el.className).toBe('avatar');
    expect(avatar.el.getAnimations?.() ?? []).toEqual([]);
  });
});

describe('Flaggen und Icons', () => {
  it.each(['flags/flag_gb.svg', 'flags/flag_fr.svg', 'flags/flag_jp.svg', 'flags/flag_it.svg'])(
    '%s ist eine Vektorflagge im Format 3 : 2',
    (file) => {
      const svg = readFileSync(`public/${file}`, 'utf8');
      const width = Number(svg.match(/<svg[^>]*\swidth="(\d+)"/)![1]);
      const height = Number(svg.match(/<svg[^>]*\sheight="(\d+)"/)![1]);
      expect(width / height).toBeCloseTo(3 / 2, 5);
    },
  );

  it.each([
    'icon.svg',
    'icon-180.png',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable.svg',
    'icon-maskable-512.png',
  ])('icons/%s liegt in public/', (file) => {
    expect(existsSync(`public/icons/${file}`)).toBe(true);
  });
});
