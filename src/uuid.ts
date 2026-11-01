// B-97: ids für Kinder als UUID (Version 4), damit sie später als Primärschlüssel in Supabase
// passen. `crypto.randomUUID` gibt es nur in sicheren Kontexten (https, localhost) – über den
// Dev-Server im WLAN (http://192.168…) fehlt es, `crypto.getRandomValues` aber nicht.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/** 16 Zufallsbytes → UUID v4 (Version- und Variant-Bits gesetzt). */
export function uuidFromBytes(bytes: Uint8Array): string {
  const b = Array.from(bytes.slice(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.map((v) => v.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Neue UUID: `randomUUID`, sonst `getRandomValues`, sonst (sehr alte Umgebungen) `Math.random`. */
export function newId(c: Partial<Crypto> | undefined = globalThis.crypto): string {
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return uuidFromBytes(bytes);
}
