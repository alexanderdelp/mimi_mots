// B-104: Parser der API-Testseite, mit gekürzten echten Antworten.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TRANSLATION_SOURCES,
  WORD_SOURCES,
  commonsUrl,
  parseDatamuseSug,
  parseDatamuseWord,
  parseDeWiktionary,
  parseDictionaryApi,
  parseFreeDictionary,
  parseLibre,
  parseMyMemory,
  parseOpensearch,
  parseWiktapiDefinitions,
  parseWiktapiPronunciations,
  parseWiktapiTranslations,
  runSource,
  toSsml,
  type Source,
} from '../tools/api-test-sources';

const settings = { libreUrl: 'https://libretranslate.com', libreKey: '' };

describe('Übersetzung', () => {
  it('WiktApi: nur deutsche Einträge, Hauptbedeutung zuerst, Genus', () => {
    const body = {
      translations: [
        {
          pos: 'name',
          lang_code: 'de',
          translations: [
            { word: 'constellation Dog', lang_code: 'en', sense_index: '1', sense: 'Sternbild' },
          ],
        },
        {
          pos: 'noun',
          lang_code: 'de',
          translations: [
            { word: 'scoundrel', lang_code: 'en', sense_index: '2' },
            { word: 'dog', lang_code: 'en', sense_index: '1' },
            { word: 'chien', lang_code: 'fr', sense_index: '1', tags: ['masculine'] },
            { word: 'perro', lang_code: 'es', sense_index: '1' },
          ],
        },
        { pos: 'noun', lang_code: 'sv', translations: [{ word: 'hound', lang_code: 'en' }] },
      ],
    };
    expect(parseWiktapiTranslations(body, 'en').map((s) => s.word)).toEqual([
      'dog',
      'scoundrel',
      'constellation Dog',
    ]);
    expect(parseWiktapiTranslations(body, 'fr')).toEqual([{ word: 'chien', note: 'm' }]);
  });

  it('Wiktionary: liest Ü-Vorlagen der Sprache samt Genus, leere fallen weg', () => {
    const wikitext = [
      '*{{en}}: {{Ü|en|dog}}, {{Ü|en|hound}}',
      '*{{fr}}: {{Ü|fr|chien}} {{m}}',
      '*{{fr}}: {{Ü|fr|canaille}} {{f}}',
      '*{{en}}: {{Ü|en|dog}}',
      '*{{fr}}: {{Ü|fr|}}',
      '*{{es}}: {{Ü|es|perro}}',
    ].join('\n');
    const body = { parse: { wikitext: { '*': wikitext } } };
    expect(parseDeWiktionary(body, 'en')).toEqual([{ word: 'dog' }, { word: 'hound' }]);
    expect(parseDeWiktionary(body, 'fr')).toEqual([
      { word: 'chien', note: 'm' },
      { word: 'canaille', note: 'f' },
    ]);
  });

  it('Wiktionary: fehlende Seite ergibt keine Treffer', () => {
    expect(parseDeWiktionary({ error: { code: 'missingtitle' } }, 'en')).toEqual([]);
  });

  it('MyMemory: Haupttreffer zuerst, Dubletten ohne Rücksicht auf Groß-/Kleinschreibung', () => {
    const body = {
      responseStatus: 200,
      responseData: { translatedText: 'pomme' },
      matches: [
        { translation: 'pomme', 'created-by': 'MateCat' },
        { translation: 'Pomme', 'created-by': 'MateCat' },
        { translation: 'pommier', 'created-by': 'Public_Corpora' },
      ],
    };
    expect(parseMyMemory(body)).toEqual([
      { word: 'pomme' },
      { word: 'pommier', note: 'Public_Corpora' },
    ]);
  });

  it('MyMemory: aufgebrauchtes Kontingent und Fehlerstatus werden gemeldet', () => {
    expect(() => parseMyMemory({ quotaFinished: true })).toThrow('Tageskontingent');
    expect(() => parseMyMemory({ responseStatus: 403, responseDetails: 'gesperrt' })).toThrow(
      'gesperrt',
    );
  });

  it('LibreTranslate: Übersetzung und Alternativen', () => {
    expect(parseLibre({ translatedText: 'dog', alternatives: ['hound', 'dog'] })).toEqual([
      { word: 'dog' },
      { word: 'hound' },
    ]);
  });

  it('LibreTranslate: öffentliche Instanz nur mit Schlüssel, eigene auch ohne', () => {
    const libre = TRANSLATION_SOURCES.find((s) => s.id === 'libretranslate')!;
    expect(libre.request('Hund', 'en', settings)).toBeNull();

    const own = libre.request('Hund', 'fr', { libreUrl: 'http://nas:5000/', libreKey: '' })!;
    expect(own.url).toBe('http://nas:5000/translate');
    expect(JSON.parse(own.init?.body as string)).not.toHaveProperty('api_key');

    const paid = libre.request('Hund', 'fr', { ...settings, libreKey: 'k' })!;
    expect(JSON.parse(paid.init?.body as string)).toMatchObject({
      q: 'Hund',
      source: 'de',
      target: 'fr',
      api_key: 'k',
    });
  });
});

describe('Wortvorschläge', () => {
  it('Datamuse und Wiktionary', () => {
    expect(parseDatamuseSug([{ word: 'house', score: 1 }])).toEqual([{ word: 'house' }]);
    expect(parseOpensearch(['chi', ['chien', 'chic'], [], []])).toEqual([
      { word: 'chien' },
      { word: 'chic' },
    ]);
  });
});

describe('Aussprache und Metadaten', () => {
  it('Free Dictionary API: Lautschrift, Aufnahme, Bedeutung', () => {
    const body = [
      {
        phonetics: [
          { text: '/dɑɡ/', audio: '' },
          { text: '/dɒɡ/', audio: 'https://x/dog-uk.mp3' },
          { audio: '' },
        ],
        meanings: [
          { partOfSpeech: 'noun', definitions: [{ definition: 'A mammal' }], synonyms: ['hound'] },
        ],
      },
    ];
    expect(parseDictionaryApi(body)).toEqual([
      { kind: 'pron', ipa: '/dɑɡ/', audio: null },
      { kind: 'pron', ipa: '/dɒɡ/', audio: 'https://x/dog-uk.mp3' },
      { kind: 'fact', label: 'noun', text: 'A mammal' },
      { kind: 'fact', label: 'Synonyme', text: 'hound' },
    ]);
  });

  it('FreeDictionaryAPI.com: filtert die Sprache, liest Genus und Formen', () => {
    const body = {
      entries: [
        { language: { code: 'de' }, partOfSpeech: 'noun', senses: [{ definition: 'falsch' }] },
        {
          language: { code: 'fr' },
          partOfSpeech: 'noun',
          pronunciations: [
            { type: 'ipa', text: '/ʃjɛ̃/', tags: [] },
            { type: 'ipa', text: '/ʃjẽ/', tags: ['Quebec'] },
            { type: 'rhyme', text: '-ɛ̃' },
          ],
          forms: [{ word: 'chiens', tags: ['plural'] }],
          senses: [{ definition: 'dog', tags: ['masculine'] }],
          synonyms: ['clebs'],
        },
      ],
    };
    expect(parseFreeDictionary(body, 'fr')).toEqual([
      { kind: 'pron', ipa: '/ʃjɛ̃/', audio: null, label: undefined },
      { kind: 'pron', ipa: '/ʃjẽ/', audio: null, label: 'Quebec' },
      { kind: 'fact', label: 'noun', text: 'dog' },
      { kind: 'fact', label: 'Genus', text: 'm' },
      { kind: 'fact', label: 'Formen', text: 'chiens' },
      { kind: 'fact', label: 'Synonyme', text: 'clebs' },
    ]);
  });

  it('WiktApi: nur die Sprache, Dubletten raus, Aufnahme über Commons', () => {
    const body = {
      pronunciations: [
        { lang_code: 'af', sounds: [{ ipa: '/dɔχ/', audio: null }] },
        {
          lang_code: 'fr',
          sounds: [
            { ipa: '\\ʃjɛ̃\\', audio: null, tags: [] },
            { ipa: '\\ʃjɛ̃\\', audio: null, tags: [] },
            { ipa: null, audio: null, tags: [] },
            { ipa: '[ʃjɛ̃]', audio: 'LL-Q150 (fra)-x-chien.wav', tags: ['France'] },
          ],
        },
      ],
    };
    expect(parseWiktapiPronunciations(body, 'fr')).toEqual([
      { kind: 'pron', ipa: '\\ʃjɛ̃\\', audio: null, label: undefined },
      {
        kind: 'pron',
        ipa: '[ʃjɛ̃]',
        audio: commonsUrl('LL-Q150 (fra)-x-chien.wav'),
        label: 'France',
      },
    ]);
    expect(commonsUrl('a b.wav')).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/a%20b.wav',
    );
  });

  it('WiktApi: Bedeutungen je Wortart', () => {
    const body = {
      definitions: [
        { pos: 'noun', lang_code: 'en', senses: [{ glosses: ['falsch'] }] },
        {
          pos: 'noun',
          lang_code: 'fr',
          senses: [{ glosses: ['Animal'] }, { glosses: ['Personne'] }],
        },
      ],
    };
    expect(parseWiktapiDefinitions(body, 'fr')).toEqual([
      { kind: 'fact', label: 'noun', text: 'Animal · Personne' },
    ]);
  });

  it('Datamuse: nur der exakte Treffer', () => {
    const body = [
      {
        word: 'dog',
        numSyllables: 1,
        tags: ['n', 'v', 'ipa_pron:dˈɔg', 'pron:D AO1 G ', 'f:32.51'],
        defs: ['n\tA mammal'],
      },
    ];
    expect(parseDatamuseWord(body, 'Dog')).toEqual([
      { kind: 'pron', ipa: 'dˈɔg', audio: null },
      { kind: 'fact', label: 'Wortart', text: 'n, v' },
      { kind: 'fact', label: 'Bedeutung', text: 'A mammal' },
      { kind: 'fact', label: 'Silben', text: '1' },
      { kind: 'fact', label: 'Häufigkeit je Mio.', text: '32.51' },
    ]);
    expect(parseDatamuseWord(body, 'cat')).toEqual([]);
  });
});

describe('runSource', () => {
  afterEach(() => vi.unstubAllGlobals());

  const source: Source<string> = {
    id: 'probe',
    name: 'Probe',
    langs: ['en'],
    request: () => ({ url: 'https://example.test/' }),
    parse: (body) => body as string[],
  };
  const respond = (status: number, text: string) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(text, { status })));

  it('liefert Treffer mit Rohantwort', async () => {
    respond(200, '["a"]');
    const result = await runSource(source, 'x', 'en', settings);
    expect(result).toMatchObject({ status: 'ok', items: ['a'], raw: '["a"]', message: '' });
  });

  it('meldet leere Antworten, 404, Fehlerstatus und Nicht-JSON', async () => {
    respond(200, '[]');
    expect((await runSource(source, 'x', 'en', settings)).status).toBe('empty');

    respond(404, '{}');
    expect(await runSource(source, 'x', 'en', settings)).toMatchObject({
      status: 'empty',
      message: 'nicht gefunden',
    });

    respond(400, '{"error":"Schlüssel fehlt"}');
    expect(await runSource(source, 'x', 'en', settings)).toMatchObject({
      status: 'error',
      message: 'HTTP 400 Schlüssel fehlt',
    });

    respond(200, '<html>');
    expect((await runSource(source, 'x', 'en', settings)).message).toBe('keine JSON-Antwort');
  });

  it('wirft nicht bei Netz- oder CORS-Fehlern und meldet Parserfehler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Load failed')));
    expect(await runSource(source, 'x', 'en', settings)).toMatchObject({
      status: 'error',
      message: 'Netz oder CORS blockiert',
    });

    const broken = TRANSLATION_SOURCES.find((s) => s.id === 'mymemory')!;
    respond(200, '{"quotaFinished":true}');
    expect((await runSource(broken, 'x', 'en', settings)).message).toContain('Tageskontingent');
  });

  it('fragt nicht an, wenn die Sprache fehlt oder der Schlüssel', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const datamuse = WORD_SOURCES.find((s) => s.id === 'datamuse-word')!;
    expect((await runSource(datamuse, 'chien', 'fr', settings)).status).toBe('unsupported');
    const libre = TRANSLATION_SOURCES.find((s) => s.id === 'libretranslate')!;
    expect((await runSource(libre, 'Hund', 'en', settings)).status).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('toSsml', () => {
  it('entfernt die Klammern der Lautschrift und maskiert XML', () => {
    expect(toSsml('chien', '\\ʃjɛ̃\\', 'fr')).toContain(
      '<phoneme alphabet="ipa" ph="ʃjɛ̃">chien</phoneme>',
    );
    expect(toSsml('dog', '[dɔɡ]', 'en')).toContain('xml:lang="en-GB"');
    expect(toSsml('a<b', '/x/', 'en')).toContain('>a&#60;b<');
  });
});
