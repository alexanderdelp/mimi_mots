// B-104: Oberfläche der API-Testseite. Alles aus den APIs wird als Text gesetzt, nie als HTML.
import {
  AUTOCOMPLETE_SOURCES,
  BCP47,
  LIBRE_DEFAULT_URL,
  TRANSLATION_SOURCES,
  WORD_SOURCES,
  runSource,
  toSsml,
  type Lang,
  type Pronunciation,
  type Settings,
  type Source,
  type SourceResult,
  type Suggestion,
  type WordInfo,
} from './api-test-sources';

const LANGS: { lang: Lang; title: string; label: string }[] = [
  { lang: 'en', title: 'Englisch', label: 'Englisches Wort' },
  { lang: 'fr', title: 'Französisch', label: 'Französisches Wort' },
];
const STATUS_TEXT = {
  ok: 'OK',
  empty: 'leer',
  error: 'Fehler',
  skipped: 'übersprungen',
  unsupported: 'nicht verfügbar',
};
const AUTOCOMPLETE_DELAY_MS = 300;
const KEY_STORE = 'mimi-mots-tools:libretranslate'; // nur für diese Entwicklerseite

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), options);
  node.append(...children);
  return node;
}

function button(text: string, onClick: () => void, className = ''): HTMLButtonElement {
  const node = el('button', { type: 'button', textContent: text, className });
  node.addEventListener('click', onClick);
  return node;
}

// --- Sprachausgabe ---

const voiceSelects = new Map<Lang, HTMLSelectElement>();

function fillVoices(): void {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  for (const [lang, select] of voiceSelects) {
    const current = select.value;
    const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
    select.replaceChildren(
      el('option', { value: '', textContent: `Standard (${BCP47[lang]})` }),
      ...matching.map((v) => el('option', { value: v.name, textContent: `${v.name} (${v.lang})` })),
    );
    select.value = matching.some((v) => v.name === current) ? current : '';
  }
}

function speak(text: string, lang: Lang): void {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = BCP47[lang];
  const name = voiceSelects.get(lang)?.value;
  const voice = speechSynthesis.getVoices().find((v) => v.name === name);
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

let recording: HTMLAudioElement | null = null;

function play(url: string, onError: () => void): void {
  recording?.pause();
  recording = new Audio(url);
  recording.play().catch(onError);
}

// --- Ergebnisse ---

/** Eine Zeile je Quelle; `body` füllt den Inhalt, sobald die Antwort da ist. */
function renderRow<T>(
  source: Source<T>,
  result: SourceResult<T>,
  body: (items: T[]) => Node[],
): HTMLElement {
  const row = el('div', { className: 'row' });
  row.dataset.source = source.id;
  row.dataset.status = result.status;
  const time = result.ms ? ` · ${result.ms} ms` : '';
  const content = el('div', { className: 'content' }, ...body(result.items));
  if (result.message)
    content.append(el('p', { className: 'message', textContent: result.message }));
  if (result.raw) {
    content.append(
      el(
        'details',
        {},
        el('summary', { textContent: 'Rohantwort' }),
        el('pre', { textContent: result.raw.slice(0, 20_000) }),
      ),
    );
  }
  row.append(
    el(
      'div',
      { className: 'head' },
      el('strong', { textContent: source.name }),
      el('span', { className: 'status', textContent: STATUS_TEXT[result.status] + time }),
    ),
    content,
  );
  return row;
}

function pendingRow(name: string): HTMLElement {
  return el(
    'div',
    { className: 'row' },
    el(
      'div',
      { className: 'head' },
      el('strong', { textContent: name }),
      el('span', { className: 'status', textContent: 'lädt …' }),
    ),
  );
}

/** Fragt alle Quellen zugleich ab. Ein neuer Lauf macht ältere Antworten ungültig. */
function runAll<T>(
  target: HTMLElement,
  sources: readonly Source<T>[],
  word: string,
  lang: Lang,
  settings: Settings,
  body: (items: T[]) => Node[],
): void {
  const run = String(Number(target.dataset.run ?? 0) + 1);
  target.dataset.run = run;
  target.replaceChildren(...sources.map((source) => pendingRow(source.name)));
  sources.forEach(async (source, index) => {
    const result = await runSource(source, word, lang, settings);
    if (target.dataset.run !== run) return;
    target.children[index].replaceWith(renderRow(source, result, body));
  });
}

function chips(items: Suggestion[], onPick: (word: string) => void): Node[] {
  return [
    el(
      'div',
      { className: 'chips' },
      ...items.map((item) => {
        const chip = button(item.word, () => onPick(item.word), 'chip');
        if (item.note) chip.append(el('small', { textContent: item.note }));
        return chip;
      }),
    ),
  ];
}

function pronunciationLine(item: Pronunciation, word: string, lang: Lang): HTMLElement {
  const line = el('div', { className: 'pron' });
  if (item.ipa) line.append(el('code', { textContent: item.ipa }));
  if (item.label) line.append(el('small', { textContent: item.label }));
  const ipa = item.ipa;
  if (ipa) line.append(button('Lautschrift', () => speak(toSsml(word, ipa, lang), lang), 'small'));
  const audio = item.audio;
  if (audio) {
    const play_ = button(
      'Aufnahme',
      () =>
        play(audio, () => {
          play_.textContent = 'Aufnahme nicht abspielbar';
        }),
      'small',
    );
    line.append(play_);
  }
  return line;
}

function wordInfo(items: WordInfo[], word: string, lang: Lang): Node[] {
  return items.map((item) =>
    item.kind === 'pron'
      ? pronunciationLine(item, word, lang)
      : el('p', { className: 'fact' }, el('strong', { textContent: `${item.label}: ` }), item.text),
  );
}

// --- Seite ---

function settings(): Settings {
  const value = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
  return { libreUrl: value('libre-url'), libreKey: value('libre-key') };
}

function languagePanel(lang: Lang, title: string, label: string) {
  const input = el('input', { id: `word-${lang}`, type: 'text', lang, autocomplete: 'off' });
  input.setAttribute('autocapitalize', 'off');
  input.spellcheck = false;
  const voice = el('select', { id: `voice-${lang}` });
  voice.setAttribute('aria-label', `Stimme ${title}`);
  voiceSelects.set(lang, voice);

  const translations = el('div', { className: 'rows' });
  const autocomplete = el('div', { className: 'rows' });
  const details = el('div', { className: 'rows' });
  const pick = (word: string) => {
    input.value = word;
    autocomplete.replaceChildren();
    check();
  };
  const check = () => {
    const word = input.value.trim();
    if (word) {
      runAll(details, WORD_SOURCES, word, lang, settings(), (items) => wordInfo(items, word, lang));
    }
  };

  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const word = input.value.trim();
    if (word.length < 2) {
      autocomplete.replaceChildren();
      return;
    }
    timer = window.setTimeout(() => {
      const sources = AUTOCOMPLETE_SOURCES.filter((source) => source.langs.includes(lang));
      runAll(autocomplete, sources, word, lang, settings(), (items) => chips(items, pick));
    }, AUTOCOMPLETE_DELAY_MS);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') check();
  });

  const panel = el(
    'section',
    {},
    el('h2', { textContent: title }),
    el('h3', { textContent: 'Übersetzungsvorschläge' }),
    translations,
    el('label', { htmlFor: input.id, textContent: label }),
    el(
      'div',
      { className: 'line' },
      input,
      button('Prüfen', check),
      button('Vorlesen', () => {
        const word = input.value.trim();
        if (word) speak(word, lang);
      }),
    ),
    el('div', { className: 'line' }, voice),
    autocomplete,
    el('h3', { textContent: 'Aussprache und Metadaten' }),
    details,
  );
  panel.dataset.lang = lang;
  return {
    panel,
    translate: (word: string) =>
      runAll(translations, TRANSLATION_SOURCES, word, lang, settings(), (items) =>
        chips(items, pick),
      ),
  };
}

const panels = LANGS.map(({ lang, title, label }) => languagePanel(lang, title, label));
document.getElementById('panels')?.append(...panels.map((p) => p.panel));

const libreKey = document.getElementById('libre-key') as HTMLInputElement;
const libreUrl = document.getElementById('libre-url') as HTMLInputElement;
libreUrl.value = LIBRE_DEFAULT_URL;
try {
  libreKey.value = localStorage.getItem(KEY_STORE) ?? '';
  libreKey.addEventListener('change', () => localStorage.setItem(KEY_STORE, libreKey.value));
} catch {
  // ohne Speicher muss der Schlüssel eben neu eingegeben werden
}

document.getElementById('search')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const word = (document.getElementById('word-de') as HTMLInputElement).value.trim();
  if (word) panels.forEach((p) => p.translate(word));
});

fillVoices();
if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener('voiceschanged', fillVoices);
}
