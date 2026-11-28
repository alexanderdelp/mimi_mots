// B-120: Service Worker anmelden und seinen Zustand für die Zeile „Offline“ im Elternbereich lesen.
// Grund: Auf dem iPad startete die installierte App ohne Internet nicht. Die Zeile zeigt direkt auf
// dem Gerät, ob die App offline bereit ist, statt dass man raten muss.

/** Zustand des Service Workers, so wie ihn die Seite sieht. */
export interface OfflineInfo {
  /** Der Browser kennt Service Worker. */
  supported: boolean;
  /** Es gibt eine Registrierung für diese Seite. */
  registered: boolean;
  /** Ein Service Worker ist aktiv (hat installiert und die Dateien gespeichert). */
  active: boolean;
  /** Diese Seite wird vom Service Worker bedient – nur dann startet sie auch offline. */
  controlled: boolean;
  /** Eine (neue) Version lädt gerade ihre Dateien. */
  installing: boolean;
  /** Eine neue Version ist fertig und wartet auf den nächsten Start. */
  waiting: boolean;
  /** Anzahl der gespeicherten Dateien im Precache. */
  files: number;
  /** Der Speicher ist als dauerhaft markiert (wird bei Platzmangel nicht geräumt); null = unbekannt. */
  persisted: boolean | null;
  /** Fehler beim Anmelden (offline normal, solange schon ein Service Worker aktiv ist). */
  error: string | null;
  /** Die letzte Installation ist abgebrochen (z. B. weil eine Datei nicht geladen werden konnte). */
  installFailed: boolean;
}

let registerError: string | null = null;
let installFailed = false;

/** Text der Zeile „Offline“: kurz, ein Zustand, dazu die Zahl der gespeicherten Dateien. */
export function offlineLabel(info: OfflineInfo): string {
  const files = `${info.files} Dateien`;
  if (!info.supported) return 'Nicht möglich (Browser)';
  if (!info.registered) return info.error ? `Fehler: ${info.error}` : 'Kein Service Worker';
  if (!info.active) {
    if (info.installing) return `Lädt … · ${files}`;
    return info.installFailed ? `Abgebrochen · ${files}` : 'Nicht bereit';
  }
  if (!info.controlled) return `Nicht aktiv · ${files}`;
  const parts = ['Bereit', files];
  if (info.installing) parts.push('Update lädt');
  else if (info.waiting) parts.push('Update wartet');
  else if (info.installFailed) parts.push('Update abgebrochen');
  if (info.persisted === false) parts.push('nicht dauerhaft');
  return parts.join(' · ');
}

/** Merkt sich, wenn eine Installation abbricht (z. B. weil eine Datei nicht geladen werden konnte). */
function watch(worker: ServiceWorker | null) {
  worker?.addEventListener('statechange', () => {
    if (worker.state === 'redundant') installFailed = true;
    if (worker.state === 'installed' || worker.state === 'activated') installFailed = false;
  });
}

/** Meldet den Service Worker an (ersetzt das Skript von vite-plugin-pwa, damit Fehler sichtbar
 *  werden) und bittet um dauerhaften Speicher, damit der Browser die Dateien nicht wegräumt. */
export function registerServiceWorker(url = '/sw.js'): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(url, { scope: '/' })
      .then((reg) => {
        // WebKit mit gesperrten Service Workern liefert hier keine Registrierung
        if (!reg) return;
        watch(reg.installing);
        reg.addEventListener('updatefound', () => watch(reg.installing));
      })
      .catch((error: unknown) => {
        registerError = error instanceof Error ? error.message : String(error);
      });
    navigator.storage?.persist?.().catch(() => undefined);
  });
}

/** Liest den aktuellen Zustand (Registrierung, Kontrolle, Precache, Speicher). */
export async function readOfflineInfo(): Promise<OfflineInfo> {
  const info: OfflineInfo = {
    supported: 'serviceWorker' in navigator,
    registered: false,
    active: false,
    controlled: false,
    installing: false,
    waiting: false,
    files: 0,
    persisted: null,
    error: registerError,
    installFailed,
  };
  if (!info.supported) return info;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    info.registered = !!reg;
    info.active = !!reg?.active;
    info.installing = !!reg?.installing;
    info.waiting = !!reg?.waiting;
    info.controlled = !!navigator.serviceWorker.controller;
    if ('caches' in self) {
      for (const name of await caches.keys()) {
        if (!name.startsWith('workbox-precache')) continue;
        info.files += (await (await caches.open(name)).keys()).length;
      }
    }
    if (navigator.storage?.persisted) info.persisted = await navigator.storage.persisted();
  } catch (error) {
    info.error = error instanceof Error ? error.message : String(error);
  }
  return info;
}
