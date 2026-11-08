// B-104: Quellen der API-Testseite – je Quelle der Request und das Auslesen der Antwort.
// Reine Logik ohne DOM, damit Vitest die Parser mit echten Antworten prüfen kann.

export type Lang = 'en' | 'fr';

export interface RequestSpec {
  url: string;
  init?: RequestInit;
}

export interface Settings {
  libreUrl: string;
  libreKey: string;
}

export interface Source<T> {
  id: string;
  name: string;
  langs: readonly Lang[];
  /** null: Quelle nicht nutzbar, Grund in `skipReason`. */
  request(word: string, lang: Lang, settings: Settings): RequestSpec | null;
  skipReason?: string;
  parse(body: unknown, word: string, lang: Lang): T[];
}

export interface Suggestion {
  word: string;
  /** Genus, Bedeutung oder Herkunft – was die Quelle eben liefert. */
  note?: string;
}

export interface Pronunciation {
  kind: 'pron';
  ipa: string | null;
  audio: string | null;
  label?: string;
}

export interface Fact {
  kind: 'fact';
  label: string;
  text: string;
}

export type WordInfo = Pronunciation | Fact;

export type Status = 'ok' | 'empty' | 'error' | 'skipped' | 'unsupported';

export interface SourceResult<T> {
  status: Status;
  items: T[];
  message: string;
  ms: number;
  raw: string;
}

export const BCP47: Record<Lang, string> = { en: 'en-GB', fr: 'fr-FR' };
export const LIBRE_DEFAULT_URL = 'https://libretranslate.com';

const WIKTAPI = 'https://api.wiktapi.dev/v1';
const TIMEOUT_MS = 12_000;
const MAX_ITEMS = 8;
const ALL: readonly Lang[] = ['en', 'fr'];
const GENUS: Record<string, string> = { masculine: 'm', feminine: 'f', neuter: 'n' };

const q = encodeURIComponent;

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const uniqueWords = (items: Suggestion[]) =>
  unique(items, (s) => s.word.toLowerCase()).slice(0, MAX_ITEMS);

// --- Übersetzung ---

interface WiktTranslation {
  word?: string;
  lang_code?: string;
  sense?: string;
  sense_index?: string;
  tags?: string[];
}

interface WiktTranslations {
  translations?: { pos?: string; lang_code?: string; translations?: WiktTranslation[] }[];
}

/** Hauptbedeutung zuerst: Substantive vor Namen, Bedeutung 1 vor Bedeutung 2. */
export function parseWiktapiTranslations(body: unknown, lang: Lang): Suggestion[] {
  const groups = (body as WiktTranslations).translations ?? [];
  const found = groups
    .filter((group) => group.lang_code === 'de')
    .flatMap((group) =>
      (group.translations ?? [])
        .filter((t) => t.lang_code === lang && t.word)
        .map((t) => ({
          t,
          rank: (group.pos === 'name' ? 100 : 0) + (Number(t.sense_index) || 50),
        })),
    )
    .sort((a, b) => a.rank - b.rank)
    .map(({ t }) => {
      const genus = (t.tags ?? []).map((tag) => GENUS[tag]).find(Boolean);
      const note = [genus, t.sense].filter(Boolean).join(' · ');
      return { word: t.word as string, ...(note ? { note } : {}) };
    });
  return uniqueWords(found);
}

interface WikitextPage {
  parse?: { wikitext?: { '*'?: string } };
}

/** Liest die Zeilen `*{{en}}: {{Ü|en|dog}}, …` aus dem Übersetzungsabschnitt von de.wiktionary. */
export function parseDeWiktionary(body: unknown, lang: Lang): Suggestion[] {
  const text = (body as WikitextPage).parse?.wikitext?.['*'] ?? '';
  const found: Suggestion[] = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith(`*{{${lang}}}`)) continue;
    const links = line.matchAll(/\{\{Üt?\|\w+\|([^|}]+)[^}]*\}\}(?:\s*\{\{([mfn])\}\})?/g);
    for (const [, word, genus] of links) {
      found.push({ word: word.trim(), ...(genus ? { note: genus } : {}) });
    }
  }
  return uniqueWords(found);
}

interface MyMemory {
  quotaFinished?: boolean;
  responseStatus?: number | string;
  responseDetails?: string;
  responseData?: { translatedText?: string };
  matches?: { translation?: string; 'created-by'?: string }[];
}

export function parseMyMemory(body: unknown): Suggestion[] {
  const data = body as MyMemory;
  if (data.quotaFinished) throw new Error('Tageskontingent aufgebraucht');
  if (Number(data.responseStatus) !== 200) {
    throw new Error(data.responseDetails || `Status ${data.responseStatus}`);
  }
  const main = data.responseData?.translatedText;
  const matches = (data.matches ?? []).flatMap((m) =>
    m.translation
      ? [{ word: m.translation, ...(m['created-by'] ? { note: m['created-by'] } : {}) }]
      : [],
  );
  return uniqueWords([...(main ? [{ word: main }] : []), ...matches]);
}

interface Libre {
  translatedText?: string;
  alternatives?: string[];
}

export function parseLibre(body: unknown): Suggestion[] {
  const data = body as Libre;
  const words = [data.translatedText, ...(data.alternatives ?? [])].filter(Boolean) as string[];
  return uniqueWords(words.map((word) => ({ word })));
}

function libreRequest(word: string, lang: Lang, settings: Settings): RequestSpec | null {
  const base = settings.libreUrl.trim().replace(/\/+$/, '') || LIBRE_DEFAULT_URL;
  const key = settings.libreKey.trim();
  if (!key && base === LIBRE_DEFAULT_URL) return null; // die öffentliche Instanz verlangt einen Schlüssel
  const payload = { q: word, source: 'de', target: lang, format: 'text', alternatives: 3 };
  return {
    url: `${base}/translate`,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(key ? { ...payload, api_key: key } : payload),
    },
  };
}

export const TRANSLATION_SOURCES: readonly Source<Suggestion>[] = [
  {
    id: 'wiktapi',
    name: 'WiktApi',
    langs: ALL,
    request: (word) => ({ url: `${WIKTAPI}/de/word/${q(word)}/translations` }),
    parse: (body, _word, lang) => parseWiktapiTranslations(body, lang),
  },
  {
    id: 'de-wiktionary',
    name: 'Wiktionary (de)',
    langs: ALL,
    request: (word) => ({
      url: `https://de.wiktionary.org/w/api.php?action=parse&page=${q(word)}&prop=wikitext&format=json&origin=*`,
    }),
    parse: (body, _word, lang) => parseDeWiktionary(body, lang),
  },
  {
    id: 'mymemory',
    name: 'MyMemory',
    langs: ALL,
    request: (word, lang) => ({
      url: `https://api.mymemory.translated.net/get?q=${q(word)}&langpair=de%7C${lang}`,
    }),
    parse: (body) => parseMyMemory(body),
  },
  {
    id: 'libretranslate',
    name: 'LibreTranslate',
    langs: ALL,
    request: libreRequest,
    skipReason: 'Schlüssel nötig (oder eigene Instanz eintragen)',
    parse: (body) => parseLibre(body),
  },
];

// --- Wortvorschläge beim Tippen ---

export function parseDatamuseSug(body: unknown): Suggestion[] {
  return uniqueWords(
    (body as { word?: string }[]).flatMap((s) => (s.word ? [{ word: s.word }] : [])),
  );
}

/** Antwortformat von `opensearch`: [Suchwort, [Titel …], …]. */
export function parseOpensearch(body: unknown): Suggestion[] {
  const titles = (body as [string, string[]])[1] ?? [];
  return uniqueWords(titles.map((word) => ({ word })));
}

export const AUTOCOMPLETE_SOURCES: readonly Source<Suggestion>[] = [
  {
    id: 'datamuse-sug',
    name: 'Datamuse',
    langs: ['en'],
    request: (word) => ({ url: `https://api.datamuse.com/sug?s=${q(word)}&max=${MAX_ITEMS}` }),
    parse: (body) => parseDatamuseSug(body),
  },
  {
    id: 'wiktionary-search',
    name: 'Wiktionary',
    langs: ALL,
    request: (word, lang) => ({
      url: `https://${lang}.wiktionary.org/w/api.php?action=opensearch&search=${q(word)}&limit=${MAX_ITEMS}&namespace=0&format=json&origin=*`,
    }),
    parse: (body) => parseOpensearch(body),
  },
];

// --- Aussprache und Metadaten ---

function fact(label: string, values: (string | undefined)[], limit = 3): Fact[] {
  const text = values.filter(Boolean).slice(0, limit).join(' · ');
  return text ? [{ kind: 'fact', label, text }] : [];
}

const uniquePron = (items: Pronunciation[]) =>
  unique(items, (p) => `${p.ipa}|${p.audio}`).slice(0, MAX_ITEMS);

interface DictionaryApiEntry {
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech?: string;
    definitions?: { definition?: string }[];
    synonyms?: string[];
  }[];
}

export function parseDictionaryApi(body: unknown): WordInfo[] {
  const entries = body as DictionaryApiEntry[];
  const pron = entries
    .flatMap((e) => e.phonetics ?? [])
    .filter((p) => p.text || p.audio)
    .map((p): Pronunciation => ({
      kind: 'pron',
      ipa: p.text || null,
      audio: p.audio || null,
    }));
  const facts = entries
    .flatMap((e) => e.meanings ?? [])
    .flatMap((m) => [
      ...fact(
        m.partOfSpeech ?? '?',
        (m.definitions ?? []).map((d) => d.definition),
      ),
      ...fact('Synonyme', m.synonyms ?? [], 6),
    ]);
  return [...uniquePron(pron), ...facts];
}

interface FreeDictionary {
  entries?: {
    language?: { code?: string };
    partOfSpeech?: string;
    pronunciations?: { type?: string; text?: string; tags?: string[] }[];
    forms?: { word?: string; tags?: string[] }[];
    senses?: { definition?: string; tags?: string[] }[];
    synonyms?: string[];
  }[];
}

export function parseFreeDictionary(body: unknown, lang: Lang): WordInfo[] {
  const entries = ((body as FreeDictionary).entries ?? []).filter((e) => e.language?.code === lang);
  const pron = entries
    .flatMap((e) => e.pronunciations ?? [])
    .filter((p) => p.type === 'ipa' && p.text)
    .map((p): Pronunciation => ({
      kind: 'pron',
      ipa: p.text as string,
      audio: null,
      label: p.tags?.join(', ') || undefined,
    }));
  const facts = entries.flatMap((e) => {
    const senses = e.senses ?? [];
    const genus = senses.flatMap((s) => s.tags ?? []).find((tag) => GENUS[tag]);
    return [
      ...fact(
        e.partOfSpeech ?? '?',
        senses.map((s) => s.definition),
      ),
      ...(genus ? fact('Genus', [GENUS[genus]]) : []),
      ...fact(
        'Formen',
        (e.forms ?? []).map((f) => f.word),
        6,
      ),
      ...fact('Synonyme', e.synonyms ?? [], 6),
    ];
  });
  return [...uniquePron(pron), ...facts];
}

/** Lädt die Datei über Wikimedia Commons; WiktApi nennt nur den Dateinamen. */
export const commonsUrl = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${q(file)}`;

interface WiktPronunciations {
  pronunciations?: {
    lang_code?: string;
    sounds?: { ipa?: string | null; audio?: string | null; tags?: string[] }[];
  }[];
}

export function parseWiktapiPronunciations(body: unknown, lang: Lang): WordInfo[] {
  const groups = (body as WiktPronunciations).pronunciations ?? [];
  const pron = groups
    .filter((group) => group.lang_code === lang)
    .flatMap((group) => group.sounds ?? [])
    .filter((s) => s.ipa || s.audio)
    .map((s): Pronunciation => ({
      kind: 'pron',
      ipa: s.ipa ?? null,
      audio: s.audio ? commonsUrl(s.audio) : null,
      label: s.tags?.join(', ') || undefined,
    }));
  return uniquePron(pron);
}

interface WiktDefinitions {
  definitions?: {
    pos?: string;
    lang_code?: string;
    senses?: { glosses?: string[] }[];
  }[];
}

export function parseWiktapiDefinitions(body: unknown, lang: Lang): WordInfo[] {
  const groups = (body as WiktDefinitions).definitions ?? [];
  return groups
    .filter((group) => group.lang_code === lang)
    .flatMap((group) =>
      fact(
        group.pos ?? '?',
        (group.senses ?? []).map((s) => s.glosses?.[0]),
      ),
    );
}

interface DatamuseWord {
  word?: string;
  numSyllables?: number;
  tags?: string[];
  defs?: string[];
}

export function parseDatamuseWord(body: unknown, word: string): WordInfo[] {
  const hit = (body as DatamuseWord[]).find((w) => w.word === word.toLowerCase());
  if (!hit) return [];
  const tags = hit.tags ?? [];
  const value = (prefix: string) =>
    tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);
  const ipa = value('ipa_pron:');
  const pos = tags.filter((tag) => ['n', 'v', 'adj', 'adv'].includes(tag)).join(', ');
  return [
    ...(ipa ? [{ kind: 'pron', ipa, audio: null } as Pronunciation] : []),
    ...fact('Wortart', [pos]),
    ...fact(
      'Bedeutung',
      (hit.defs ?? []).map((d) => d.split('\t').pop()),
    ),
    ...fact('Silben', [hit.numSyllables?.toString()]),
    ...fact('Häufigkeit je Mio.', [value('f:')]),
  ];
}

export const WORD_SOURCES: readonly Source<WordInfo>[] = [
  {
    id: 'free-dictionary',
    name: 'Free Dictionary API',
    langs: ['en'],
    request: (word) => ({
      url: `https://api.dictionaryapi.dev/api/v2/entries/en/${q(word)}`,
    }),
    parse: (body) => parseDictionaryApi(body),
  },
  {
    id: 'freedictionaryapi-com',
    name: 'FreeDictionaryAPI.com',
    langs: ALL,
    request: (word, lang) => ({
      url: `https://freedictionaryapi.com/api/v1/entries/${lang}/${q(word)}`,
    }),
    parse: (body, _word, lang) => parseFreeDictionary(body, lang),
  },
  {
    id: 'wiktapi-pron',
    name: 'WiktApi Aussprache',
    langs: ALL,
    request: (word, lang) => ({ url: `${WIKTAPI}/${lang}/word/${q(word)}/pronunciations` }),
    parse: (body, _word, lang) => parseWiktapiPronunciations(body, lang),
  },
  {
    id: 'wiktapi-def',
    name: 'WiktApi Bedeutungen',
    langs: ALL,
    request: (word, lang) => ({ url: `${WIKTAPI}/${lang}/word/${q(word)}/definitions` }),
    parse: (body, _word, lang) => parseWiktapiDefinitions(body, lang),
  },
  {
    id: 'datamuse-word',
    name: 'Datamuse',
    langs: ['en'],
    request: (word) => ({
      url: `https://api.datamuse.com/words?sp=${q(word)}&md=dpsrf&ipa=1&max=1`,
    }),
    parse: (body, word) => parseDatamuseWord(body, word),
  },
];

// --- Ausführen ---

function errorText(body: unknown): string | undefined {
  const data = body as { error?: unknown; message?: unknown } | null;
  for (const value of [data?.message, data?.error]) {
    if (typeof value === 'string' && value) return value;
  }
  return undefined;
}

/** Fragt eine Quelle ab. Wirft nie: Jeder Ausfall steht im Ergebnis, damit die Seite weiterläuft. */
export async function runSource<T>(
  source: Source<T>,
  word: string,
  lang: Lang,
  settings: Settings,
): Promise<SourceResult<T>> {
  const result = (status: Status, message: string, ms = 0, raw = '', items: T[] = []) => ({
    status,
    items,
    message,
    ms,
    raw,
  });
  if (!source.langs.includes(lang)) return result('unsupported', 'kann diese Sprache nicht');
  const spec = source.request(word, lang, settings);
  if (!spec) return result('skipped', source.skipReason ?? 'nicht nutzbar');

  const start = performance.now();
  const elapsed = () => Math.round(performance.now() - start);
  try {
    const response = await fetch(spec.url, {
      ...spec.init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const raw = await response.text();
    let body: unknown = null;
    try {
      body = JSON.parse(raw);
    } catch {
      // bleibt null; unten als Fehler gemeldet
    }
    if (response.status === 404) return result('empty', 'nicht gefunden', elapsed(), raw);
    if (!response.ok) {
      const detail = errorText(body) ?? '';
      return result('error', `HTTP ${response.status} ${detail}`.trim(), elapsed(), raw);
    }
    if (body === null) return result('error', 'keine JSON-Antwort', elapsed(), raw);
    const items = source.parse(body, word, lang);
    const status = items.length ? 'ok' : 'empty';
    return result(status, items.length ? '' : 'keine Treffer', elapsed(), raw, items);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    const reason = error instanceof TypeError ? 'Netz oder CORS blockiert' : String(error);
    return result('error', timedOut ? 'Zeitüberschreitung' : reason, elapsed());
  }
}

// --- Sprachausgabe ---

/** Web Speech kennt keine Lautschrift. Der einzige Weg ist SSML – ob das Gerät es versteht, zeigt
 *  erst der Versuch: Es kann auch das Wort oder sogar den Quelltext vorlesen. */
export function toSsml(word: string, ipa: string, lang: Lang): string {
  const xml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const phonemes = ipa.replace(/[/\\[\]]/g, '').trim();
  return (
    `<speak version="1.1" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${BCP47[lang]}">` +
    `<phoneme alphabet="ipa" ph="${xml(phonemes)}">${xml(word)}</phoneme></speak>`
  );
}
