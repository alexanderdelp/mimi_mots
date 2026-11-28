import { describe, expect, it } from 'vitest';
import { offlineLabel, type OfflineInfo } from '../src/offline';

const ready: OfflineInfo = {
  supported: true,
  registered: true,
  active: true,
  controlled: true,
  installing: false,
  waiting: false,
  files: 236,
  persisted: true,
  error: null,
  installFailed: false,
};

describe('B-120 offlineLabel (AT-120.4)', () => {
  it('bereit mit Zahl der Dateien', () => {
    expect(offlineLabel(ready)).toBe('Bereit · 236 Dateien');
  });

  it('Update lädt, wartet oder ist abgebrochen', () => {
    expect(offlineLabel({ ...ready, installing: true })).toBe('Bereit · 236 Dateien · Update lädt');
    expect(offlineLabel({ ...ready, waiting: true })).toBe('Bereit · 236 Dateien · Update wartet');
    expect(offlineLabel({ ...ready, installFailed: true })).toBe(
      'Bereit · 236 Dateien · Update abgebrochen',
    );
  });

  it('Speicher nicht dauerhaft wird genannt, unbekannt nicht', () => {
    expect(offlineLabel({ ...ready, persisted: false })).toBe(
      'Bereit · 236 Dateien · nicht dauerhaft',
    );
    expect(offlineLabel({ ...ready, persisted: null })).toBe('Bereit · 236 Dateien');
  });

  it('aktiv, aber diese Seite nicht bedient', () => {
    expect(offlineLabel({ ...ready, controlled: false })).toBe('Nicht aktiv · 236 Dateien');
  });

  it('erste Installation lädt, bricht ab oder fehlt', () => {
    const first = { ...ready, active: false, controlled: false, files: 120 };
    expect(offlineLabel({ ...first, installing: true })).toBe('Lädt … · 120 Dateien');
    expect(offlineLabel({ ...first, installFailed: true })).toBe('Abgebrochen · 120 Dateien');
    expect(offlineLabel(first)).toBe('Nicht bereit');
  });

  it('ohne Registrierung: Fehler oder kein Service Worker', () => {
    const none = { ...ready, registered: false, active: false, controlled: false, files: 0 };
    expect(offlineLabel(none)).toBe('Kein Service Worker');
    expect(offlineLabel({ ...none, error: 'Load failed' })).toBe('Fehler: Load failed');
  });

  it('Fehler beim Anmelden stört nicht, wenn schon einer aktiv ist (offline normal)', () => {
    expect(offlineLabel({ ...ready, error: 'Load failed' })).toBe('Bereit · 236 Dateien');
  });

  it('Browser ohne Service Worker', () => {
    expect(offlineLabel({ ...ready, supported: false })).toBe('Nicht möglich (Browser)');
  });
});
