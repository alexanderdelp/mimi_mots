// App-State: aktuelle Ansicht als einfache Zustandsmaschine, plus gespeicherte Daten
// und ob das Gerät gerade im Hochformat ist (Overlay, Timer-Pause ab B-40/B-52).
import { COMPANIONS, type Companion } from './components/avatar';
import { applyRating, createSession, type Rating, type Session } from './scheduler';
import { FLOWERS, type Flower } from './data/flowers';
import {
  canPlant,
  completeRound,
  plant,
  setCurrentFlower,
  setCurrentRounds,
  setCurrentStage,
  type Garden,
  type Harvest,
} from './garden';
import { hasVocabulary, vocabulary } from './data/vocabulary';
import type { Language, Word } from './data/words';
import {
  LANGUAGES,
  MAX_BOX,
  MAX_CHILDREN,
  activeChild,
  childData,
  childDefaults,
  cleanName,
  isRoundMin,
  localDay,
  newChild,
  type AppData,
  type Child,
  type ChildData,
  type Mode,
  type Settings,
} from './storage';
import { isUuid } from './uuid';

export type ViewName =
  | 'welcome'
  | 'start'
  | 'round'
  | 'end'
  | 'sleep'
  | 'admin'
  | 'words'
  | 'seed' // B-112: Samen wählen nach einer abgeschlossenen Lernreise
  | 'garden'; // B-112: Garten des Kinds

export type AppEvent =
  | { type: 'name'; name: string } // Begrüßung: Name des Kinds eingeben (B-97)
  | { type: 'enter' } // Begrüßung → Start (nur mit Namen, B-97)
  // B-90: Kind wählen – auf der Begrüßung (Kachel, dann weiter wie „enter“) und im Elternbereich
  | { type: 'pickChild'; id: string }
  | { type: 'welcome' } // B-90: Start/Schlafseite → Begrüßung (Name in der Kopfleiste, ab 2 Kindern)
  // B-90: Elternbereich, Reiter „Kinder“: anlegen (id und `at` vom Aufrufer), umbenennen, löschen
  | { type: 'addChild'; id: string; name: string; at: string }
  | { type: 'renameChild'; id: string; name: string }
  | { type: 'deleteChild'; id: string }
  | { type: 'play' } // Start → Lernrunde (nur mit vollständiger Auswahl)
  | { type: 'finish' } // Lernrunde → Abschluss (Timer-Ende oder [×])
  | { type: 'home' } // Abschluss bzw. „Meine Wörter“ → Start (bzw. Schlafseite, wenn beide schlafen)
  | { type: 'words' } // Start/Schlafseite → „Meine Wörter“: Lernstand fürs Kind (B-107)
  | { type: 'garden' } // Start/Schlafseite → Garten (B-112, erst mit einer Pflanze)
  | { type: 'plant'; flower: Flower; at: string } // Samenwahl: Samen einpflanzen (B-112)
  | { type: 'admin' } // Begrüßung/Start/Schlafseite → Elternbereich (Halten des Icons, B-69/B-97)
  | { type: 'leave' } // Elternbereich → zurück (Begrüßung oder Start) bzw. Schlafseite
  | { type: 'toggleSleep'; companion: Companion } // Elternbereich: Tier wecken/hinlegen (B-94)
  | { type: 'resetProgress'; language: Language; mode: Mode } // Elternbereich: Lernstand leeren
  | { type: 'toggleLanguage'; language: Language } // Elternbereich: Sprache an/aus (B-73)
  | { type: 'toggleWord'; language: Language; id: string } // Elternbereich: Wort an/aus (B-88)
  // Elternbereich: Wort per Ziehen in eine Stufe legen, null = „Neu“ (B-106); `at` als ISO-Zeitpunkt
  | { type: 'moveWord'; language: Language; mode: Mode; id: string; box: number | null; at: string }
  | { type: 'tutorialDone' } // Lernrunde: Tutorial abgeschlossen (B-74)
  | { type: 'toggleTutorial'; mode: Mode } // Elternbereich: Tutorial des Modus an/aus (B-108)
  | { type: 'toggleFlower'; flower: Flower } // Elternbereich: Samen an/aus (B-109)
  // Elternbereich, Reiter „Samen“ (B-114): aktuelle Blume (null = entfernen), Stufe, Runden
  | { type: 'gardenFlower'; flower: Flower | null; at: string }
  | { type: 'gardenStage'; stage: number }
  | { type: 'gardenRounds'; rounds: number }
  | { type: 'toggleBrake' } // Elternbereich: Bremse für neue Wörter an/aus (B-82)
  | { type: 'roundMin'; minutes: number } // Elternbereich: Dauer einer Runde (B-93)
  | { type: 'day' } // App wieder sichtbar: an einem neuen Tag wachen alle auf (B-65)
  | { type: 'select'; settings: Partial<Settings> } // Auswahl auf der Startansicht
  | { type: 'word'; id: string; session: Session } // nächstes Wort der Lernrunde
  | { type: 'reveal' } // aufdecken (Lautsprecher, in der Hörrunde Auge)
  | { type: 'rate'; rating: Rating; at: string } // Selbsteinschätzung (ISO-Zeitpunkt)
  | { type: 'expire' } // Session-Timer abgelaufen (Runde läuft bis zur nächsten Bewertung weiter)
  | { type: 'orientation'; portrait: boolean };

/** Begleiter, Sprache und Modus sind gewählt. */
export function isComplete(settings: Settings): boolean {
  return settings.companion !== null && settings.language !== null && settings.mode !== null;
}

/** Schlafseite statt Start: kein Begleiter mehr wach (B-65). */
export function allAsleep(data: ChildData): boolean {
  return data.rest.sleeping.length === COMPANIONS.length;
}

/** B-89: Lernstand je Modus – Sprechen wie bisher in `progress`, Hören in `listenProgress`. */
export function progressKey(mode: Mode): 'progress' | 'listenProgress' {
  return mode === 'listen' ? 'listenProgress' : 'progress';
}

/** B-89: Tutorial je Modus. */
export function tutorialKey(mode: Mode): 'tutorialDone' | 'listenTutorialDone' {
  return mode === 'listen' ? 'listenTutorialDone' : 'tutorialDone';
}

/** Tutorial des gewählten Modus schon gesehen. */
export function tutorialSeen(data: ChildData): boolean {
  return data[tutorialKey(data.settings.mode ?? 'speak')];
}

/** Auf der Startseite wählbar: eingeschaltet (B-73) und mit Wortschatz (B-84). */
export function playableLanguages(data: ChildData): Language[] {
  return LANGUAGES.filter((l) => data.enabledLanguages.includes(l) && hasVocabulary(l));
}

/** B-73/B-86: Einschalten nur mit Wörtern; Ausschalten nur, wenn danach noch eine spielbare
 *  Sprache an ist. */
export function canToggleLanguage(data: ChildData, language: Language): boolean {
  if (!data.enabledLanguages.includes(language)) return hasVocabulary(language);
  return playableLanguages(data).some((l) => l !== language);
}

/** B-88: Wörter der Lernrunde – der Wortschatz (B-84) ohne die im Elternbereich ausgeschalteten. */
export function activeWords(data: ChildData, language: Language): Word[] {
  const off = data.disabledWords[language];
  return vocabulary(language).filter((w) => !off.includes(w.id));
}

/** B-88: Einschalten geht immer; Ausschalten nur, wenn danach noch ein Wort der Sprache an ist. */
export function canToggleWord(data: ChildData, language: Language, id: string): boolean {
  if (!vocabulary(language).some((w) => w.id === id)) return false;
  if (data.disabledWords[language].includes(id)) return true;
  return activeWords(data, language).some((w) => w.id !== id);
}

/** B-114: Der Garten ist an, solange mindestens ein Samen freigegeben ist. Sonst taucht er
 *  nirgends auf: kein Garten-Button, keine Samenwahl, kein Wachstum (Pflanzen bleiben erhalten). */
export function gardenOn(data: ChildData): boolean {
  return data.enabledFlowers.length > 0;
}

/** B-112/B-114: Garten-Button nur mit Pflanze und eingeschaltetem Garten. */
export function showGarden(data: ChildData): boolean {
  return gardenOn(data) && data.garden.plants.length > 0;
}

/** Auswahl passend zu Schlaf und aktiven Sprachen (B-65/B-73): Nicht mehr Wählbares
 *  fällt weg, ist nur noch eine Möglichkeit frei, wird sie vorausgewählt. */
export function withRestSettings(data: ChildData): ChildData {
  const pick = <T>(all: readonly T[], gone: readonly T[], current: T | null): T | null => {
    const free = all.filter((v) => !gone.includes(v));
    if (free.length === 0) return current; // Schlafseite: Auswahl für nach dem Aufwecken merken
    if (free.length === 1) return free[0];
    return current !== null && free.includes(current) ? current : null;
  };
  const { settings, rest } = data;
  const companion = pick(COMPANIONS, rest.sleeping, settings.companion);
  const playable = playableLanguages(data);
  const off = LANGUAGES.filter((l) => !playable.includes(l));
  // ohne spielbare Sprache keine Auswahl merken – sonst wäre Play aktiv (B-86)
  const language = playable.length > 0 ? pick(LANGUAGES, off, settings.language) : null;
  if (companion === settings.companion && language === settings.language) return data;
  return { ...data, settings: { ...settings, companion, language } };
}

const AWAKE = { sleeping: [], since: null };

/** Eingeschlafen an einem früheren Tag (oder ohne Datum) – dann wachen alle auf. */
function isStale(data: ChildData, today: string): boolean {
  const { sleeping, since } = data.rest;
  return sleeping.length > 0 && (since === null || since < today);
}

/** An einem neuen Tag sind alle wach. */
function wakeIfNewDay(data: ChildData, today: string): ChildData {
  return isStale(data, today) ? { ...data, rest: AWAKE } : data;
}

/** Am Ende einer Runde schläft der Begleiter ein (B-65). */
function consume(data: ChildData, today: string): ChildData {
  const { companion } = data.settings;
  const { sleeping } = wakeIfNewDay(data, today).rest;
  return {
    ...data,
    rest: {
      sleeping: COMPANIONS.filter((c) => sleeping.includes(c) || c === companion),
      since: today,
    },
  };
}

/** B-94: ein Tier im Elternbereich wecken oder hinlegen. Zuerst gilt ein neuer Tag (alle wach),
 *  dann wird umgeschaltet; wer hingelegt wird, schläft bis morgen wie nach einer Runde. */
export function toggleSleep(data: ChildData, companion: Companion, today: string): ChildData {
  const { sleeping } = wakeIfNewDay(data, today).rest;
  const next = sleeping.includes(companion)
    ? sleeping.filter((c) => c !== companion)
    : COMPANIONS.filter((c) => sleeping.includes(c) || c === companion);
  const rest = next.length === 0 ? AWAKE : { sleeping: next, since: today };
  return { ...data, rest };
}

/** Auswahl vollständig, Sprache spielbar und gewählter Begleiter wach. */
function isAvailable(data: ChildData): boolean {
  return (
    isComplete(data.settings) &&
    playableLanguages(data).includes(data.settings.language!) &&
    !data.rest.sleeping.includes(data.settings.companion!)
  );
}

/** Daten eines Kinds beim Öffnen bzw. Wechseln: neuer Tag → alle wach, Auswahl passend. */
function prepare(data: ChildData, today: string): ChildData {
  return withRestSettings(wakeIfNewDay(data, today));
}

/** B-90: alle Kinder mit aktuellem Stand – für das aktive gilt `data`. */
export function childrenOf(state: Pick<AppState, 'children' | 'childId' | 'data'>): Child[] {
  return state.children.map((c) => (c.id === state.childId ? { ...c, ...state.data } : c));
}

const nameKey = (name: string) => name.toLocaleLowerCase('de');

/** B-90: Namen gibt es nur einmal (ohne Groß-/Kleinschreibung); `except`: das Kind selbst. */
export function nameTaken(children: readonly Child[], name: string, except?: string): boolean {
  return children.some(
    (c) => c.id !== except && c.name !== null && nameKey(c.name) === nameKey(name),
  );
}

/** B-90: Grund, warum ein Name (neu oder umbenannt) nicht geht – oder null. */
export function nameProblem(
  children: readonly Child[],
  raw: string,
  except?: string,
): 'empty' | 'taken' | null {
  const name = cleanName(raw);
  if (name === null) return 'empty';
  return nameTaken(children, name, except) ? 'taken' : null;
}

/** B-90: Ein weiteres Kind geht bis MAX_CHILDREN – und erst, wenn alle einen Namen haben. */
export function canAddChild(children: readonly Child[]): boolean {
  return children.length < MAX_CHILDREN && children.every((c) => c.name !== null);
}

/** B-90: zu einem anderen Kind wechseln; der Stand des bisherigen bleibt in `children`. */
function switchChild(state: AppState, id: string, today: string): AppState {
  if (id === state.childId) return state;
  const children = childrenOf(state);
  const next = children.find((c) => c.id === id);
  if (!next) return state;
  return { ...state, children, childId: id, data: prepare(childData(next), today) };
}

/** Lernrunde: Scheduler-Session, aktuelles Wort (null, bis das erste gewählt ist), ob das
 *  Fremdwort schon aufgedeckt wurde und ob die Zeit abgelaufen ist. */
export interface RoundState {
  session: Session;
  wordId: string | null;
  revealed: boolean;
  expired: boolean;
}

export interface AppState {
  view: ViewName;
  portrait: boolean;
  data: ChildData;
  round: RoundState | null;
  /** B-99: von wo der Elternbereich geöffnet wurde – dorthin geht es zurück. */
  adminFrom?: 'welcome' | 'start' | 'sleep';
  /** B-112: was die gerade abgeschlossene Lernreise im Garten bewirkt hat (bis zurück zum Start). */
  harvest?: Harvest;
  /** B-90: alle Kinder. Für das aktive (`childId`) gilt `data` – sein Eintrag hier ist der Stand
   *  vom Öffnen bzw. letzten Wechsel (`childrenOf` setzt beides zusammen). */
  children: Child[];
  childId: string;
  /** B-90: Kind beim Öffnen des Elternbereichs – wurde gewechselt, geht es zur Begrüßung zurück. */
  adminChild?: string;
}

/** Erlaubte Ansichtswechsel; alles andere wird ignoriert. */
const TRANSITIONS: Record<ViewName, Partial<Record<AppEvent['type'], ViewName>>> = {
  welcome: { enter: 'start', admin: 'admin' },
  start: { play: 'round', admin: 'admin', words: 'words', garden: 'garden', welcome: 'welcome' },
  round: { finish: 'end' },
  end: { home: 'start' },
  sleep: { admin: 'admin', words: 'words', garden: 'garden', welcome: 'welcome' },
  admin: {},
  words: {},
  seed: {},
  garden: {},
};

export function nextView(view: ViewName, event: AppEvent): ViewName {
  return TRANSITIONS[view][event.type] ?? view;
}

/** `today`: lokales Datum (JJJJ-MM-TT) für Einschlafen und Aufwachen (B-65). */
export function reduce(
  state: AppState,
  event: AppEvent,
  today: string = localDay(new Date()),
): AppState {
  let next = step(state, event, today);
  // Wer die Abschlussseite erreicht, hat begleitet – egal ob per Zeitablauf oder [×].
  if (state.view === 'round' && next.view === 'end') {
    const data = consume(next.data, today);
    // B-112: Nur eine abgeschlossene Lernreise (Zeit abgelaufen, letzte Bewertung) zählt für den
    // Garten – ein Abbruch per [×] nie.
    // B-114: ist der Garten aus, zählt nichts
    if (event.type !== 'rate' || !gardenOn(data)) return { ...next, data, harvest: null };
    const { garden, harvest } = completeRound(data.garden, event.at);
    return { ...next, data: { ...data, garden }, harvest };
  }
  // Auf Begrüßung, Start- und Schlafseite: an einem neuen Tag sind alle wieder wach. Von der
  // Schlafseite geht es dann zur Begrüßung wie bei einem neuen Öffnen am Morgen (B-97).
  if (['welcome', 'start', 'sleep'].includes(next.view) && isStale(next.data, today)) {
    const view = state.view === 'sleep' || next.view === 'welcome' ? 'welcome' : 'start';
    next = { ...next, view, data: withRestSettings(wakeIfNewDay(next.data, today)) };
  }
  // B-97: Ohne Namen führt kein Weg zum Start – erst fragt die Begrüßung nach dem Namen.
  if (next.view === 'start' && state.view !== 'start' && next.data.name === null) {
    next = { ...next, view: 'welcome' };
  }
  return next;
}

function step(state: AppState, event: AppEvent, today: string): AppState {
  if (event.type === 'orientation') {
    return event.portrait === state.portrait ? state : { ...state, portrait: event.portrait };
  }
  if (event.type === 'select') {
    if (state.view !== 'start') return state;
    const { companion } = event.settings;
    if (companion && state.data.rest.sleeping.includes(companion)) return state;
    const { language } = event.settings;
    if (language && !playableLanguages(state.data).includes(language)) return state;
    const settings = { ...state.data.settings, ...event.settings };
    const changed = (Object.keys(settings) as (keyof Settings)[]).some(
      (k) => settings[k] !== state.data.settings[k],
    );
    return changed ? { ...state, data: { ...state.data, settings } } : state;
  }
  if (event.type === 'word') {
    if (state.view !== 'round' || !state.round) return state;
    return {
      ...state,
      round: { ...state.round, session: event.session, wordId: event.id, revealed: false },
    };
  }
  if (event.type === 'reveal') {
    if (state.view !== 'round' || !state.round?.wordId || state.round.revealed) return state;
    return { ...state, round: { ...state.round, revealed: true } };
  }
  if (event.type === 'expire') {
    if (state.view !== 'round' || !state.round || state.round.expired) return state;
    return { ...state, round: { ...state.round, expired: true } };
  }
  if (event.type === 'rate') {
    // Nur für ein aufgedecktes Wort; danach ist es wieder verdeckt, bis das nächste kommt.
    const { language, mode } = state.data.settings;
    if (state.view !== 'round' || !state.round?.wordId || !state.round.revealed || !language) {
      return state;
    }
    const key = progressKey(mode ?? 'speak'); // B-89: Lernstand des Modus
    const progress = {
      ...state.data[key],
      [language]: applyRating(
        state.data[key][language],
        state.round.wordId,
        event.rating,
        new Date(event.at),
      ),
    };
    // Nach Ablauf der Zeit kommt statt des nächsten Worts der Abschluss (§3.4, B-42).
    return {
      ...state,
      view: state.round.expired ? 'end' : state.view,
      data: { ...state.data, [key]: progress },
      round: { ...state.round, revealed: false },
    };
  }
  if (event.type === 'name') {
    const name = cleanName(event.name);
    if (state.view !== 'welcome' || name === null || name === state.data.name) return state;
    if (nameTaken(state.children, name, state.childId)) return state;
    return { ...state, data: { ...state.data, name } };
  }
  if (event.type === 'pickChild') {
    if (state.view === 'admin') return switchChild(state, event.id, today);
    if (state.view !== 'welcome' || !state.children.some((c) => c.id === event.id)) return state;
    const next = switchChild(state, event.id, today);
    if (next.data.name === null) return next; // B-97: erst der Name
    return { ...next, view: allAsleep(next.data) ? 'sleep' : 'start' };
  }
  if (event.type === 'welcome' && state.children.length < 2) return state;
  if (state.view === 'admin' && event.type === 'addChild') {
    const name = cleanName(event.name);
    const children = childrenOf(state);
    if (name === null || nameTaken(children, name) || !canAddChild(children)) return state;
    if (!isUuid(event.id) || children.some((c) => c.id === event.id)) return state;
    const child = { ...newChild(new Date(event.at), { ...childDefaults(), name }), id: event.id };
    return { ...state, children: [...children, child] };
  }
  if (state.view === 'admin' && event.type === 'renameChild') {
    const name = cleanName(event.name);
    const children = childrenOf(state);
    const child = children.find((c) => c.id === event.id);
    if (!child || name === null || name === child.name) return state;
    if (nameTaken(children, name, event.id)) return state;
    if (event.id === state.childId) return { ...state, data: { ...state.data, name } };
    return {
      ...state,
      children: state.children.map((c) => (c.id === event.id ? { ...c, name } : c)),
    };
  }
  if (state.view === 'admin' && event.type === 'deleteChild') {
    // B-90: Das letzte Kind bleibt; gelöscht wird lokal vollständig (ohne Markierung, Neon später)
    if (state.children.length < 2 || !state.children.some((c) => c.id === event.id)) return state;
    const rest = state.children.filter((c) => c.id !== event.id);
    if (event.id !== state.childId) return { ...state, children: rest };
    const next = rest[0];
    return { ...state, children: rest, childId: next.id, data: prepare(childData(next), today) };
  }
  if (event.type === 'enter' && state.data.name === null) return state;
  if (event.type === 'play' && !isAvailable(state.data)) return state;
  // B-87: Abbruch im Tutorial – zurück zur Auswahl, niemand schläft ein, Tutorial bleibt offen
  if (event.type === 'finish' && state.view === 'round' && !tutorialSeen(state.data)) {
    return { ...state, view: 'start', round: null };
  }
  // B-107/B-112: aus „Meine Wörter“ und dem Garten zurück zur Start- bzw. Schlafseite
  if (event.type === 'home' && (state.view === 'words' || state.view === 'garden')) {
    return { ...state, view: allAsleep(state.data) ? 'sleep' : 'start' };
  }
  if (event.type === 'home' && state.view === 'end') {
    // B-112: Nach einer abgeschlossenen Lernreise ohne wachsende Pflanze kommt die Samenwahl
    if (state.harvest === 'choose' && canPlant(state.data.garden)) {
      return { ...state, view: 'seed' };
    }
    const data = withRestSettings(state.data);
    return { ...state, view: allAsleep(data) ? 'sleep' : 'start', data, harvest: null };
  }
  if (event.type === 'plant' && state.view === 'seed') {
    if (!state.data.enabledFlowers.includes(event.flower)) return state;
    const garden = plant(state.data.garden, event.flower, event.at);
    return garden === state.data.garden ? state : { ...state, data: { ...state.data, garden } };
  }
  // Erst nach dem Einpflanzen geht es weiter (die Seite zeigt vorher keinen Haus-Button)
  if (event.type === 'home' && state.view === 'seed') {
    if (canPlant(state.data.garden)) return state;
    const data = withRestSettings(state.data);
    return { ...state, view: allAsleep(data) ? 'sleep' : 'start', data, harvest: null };
  }
  if (event.type === 'garden' && !showGarden(state.data)) return state;
  if (event.type === 'toggleSleep' && state.view === 'admin') {
    // Auswahl erst beim Verlassen anpassen (leave) – so bleibt sie über mehrere Tipps erhalten
    return { ...state, data: toggleSleep(state.data, event.companion, today) };
  }
  if (event.type === 'leave' && state.view === 'admin') {
    const data = withRestSettings(state.data);
    const done = { ...state, data, adminFrom: undefined, adminChild: undefined };
    // B-90: anderes Kind gewählt (mit mehreren Kindern) → zur Begrüßung, dort wählt das Kind
    if (state.children.length > 1 && state.childId !== state.adminChild) {
      return { ...done, view: 'welcome' };
    }
    // B-99: zurück zur Begrüßung, wenn er von dort geöffnet wurde; schlafen beide → Schlafseite
    const back = state.adminFrom === 'welcome' ? 'welcome' : 'start';
    return { ...done, view: allAsleep(data) ? 'sleep' : back };
  }
  if (event.type === 'tutorialDone' && state.view === 'round' && !tutorialSeen(state.data)) {
    const key = tutorialKey(state.data.settings.mode ?? 'speak');
    return { ...state, data: { ...state.data, [key]: true } };
  }
  if (event.type === 'toggleTutorial' && state.view === 'admin') {
    const key = tutorialKey(event.mode); // B-89: je Modus getrennt; B-108: an und wieder aus
    return { ...state, data: { ...state.data, [key]: !state.data[key] } };
  }
  if (event.type === 'toggleFlower' && state.view === 'admin') {
    const { flower } = event; // B-114: auch der letzte lässt sich ausschalten (Garten aus)
    const on = state.data.enabledFlowers;
    const enabledFlowers = FLOWERS.filter((f) => (f === flower ? !on.includes(f) : on.includes(f)));
    return { ...state, data: { ...state.data, enabledFlowers } };
  }
  if (state.view === 'admin' && gardenOn(state.data)) {
    const change = (garden: Garden): AppState =>
      garden === state.data.garden ? state : { ...state, data: { ...state.data, garden } };
    if (event.type === 'gardenFlower') {
      return change(setCurrentFlower(state.data.garden, event.flower, event.at));
    }
    if (event.type === 'gardenStage')
      return change(setCurrentStage(state.data.garden, event.stage));
    if (event.type === 'gardenRounds') {
      return change(setCurrentRounds(state.data.garden, event.rounds));
    }
  }
  if (event.type === 'toggleBrake' && state.view === 'admin') {
    return { ...state, data: { ...state.data, brakeNew: !state.data.brakeNew } };
  }
  if (event.type === 'roundMin' && state.view === 'admin') {
    const { minutes } = event;
    if (!isRoundMin(minutes) || minutes === state.data.roundMin) return state;
    return { ...state, data: { ...state.data, roundMin: minutes } };
  }
  if (event.type === 'toggleLanguage' && state.view === 'admin') {
    if (!canToggleLanguage(state.data, event.language)) return state;
    const on = state.data.enabledLanguages;
    const enabled = on.includes(event.language)
      ? on.filter((l) => l !== event.language)
      : LANGUAGES.filter((l) => on.includes(l) || l === event.language);
    return { ...state, data: { ...state.data, enabledLanguages: enabled } };
  }
  if (event.type === 'toggleWord' && state.view === 'admin') {
    const { language, id } = event;
    if (!canToggleWord(state.data, language, id)) return state;
    const off = state.data.disabledWords[language];
    const next = off.includes(id)
      ? off.filter((w) => w !== id)
      : vocabulary(language)
          .map((w) => w.id)
          .filter((w) => off.includes(w) || w === id);
    const disabledWords = { ...state.data.disabledWords, [language]: next };
    return { ...state, data: { ...state.data, disabledWords } };
  }
  if (event.type === 'moveWord' && state.view === 'admin') {
    const { language, mode, id, box } = event;
    if (!vocabulary(language).some((w) => w.id === id)) return state;
    if (box !== null && (!Number.isInteger(box) || box < 0 || box > MAX_BOX)) return state;
    const key = progressKey(mode);
    const entries = state.data[key][language];
    const current = entries[id];
    if ((current?.box ?? null) === box) return state; // gleiche Zeile: nichts zu tun
    const next = { ...entries };
    if (box === null) delete next[id];
    else next[id] = current ? { ...current, box } : { box, seen: 0, lastSeenAt: event.at };
    const progress = { ...state.data[key], [language]: next };
    return { ...state, data: { ...state.data, [key]: progress } };
  }
  if (event.type === 'resetProgress' && state.view === 'admin') {
    const key = progressKey(event.mode);
    const progress = { ...state.data[key], [event.language]: {} };
    return { ...state, data: { ...state.data, [key]: progress } };
  }
  const view = nextView(state.view, event);
  if (view === state.view) return state;
  // Jede Lernrunde beginnt mit einer neuen Scheduler-Session.
  const round =
    view === 'round'
      ? { session: createSession(), wordId: null, revealed: false, expired: false }
      : state.round;
  if (view === 'admin') {
    const adminFrom = state.view as AppState['adminFrom'];
    return { ...state, view, round, adminFrom, adminChild: state.childId };
  }
  return { ...state, view, round };
}

const single = (child: Child) => ({ activeChildId: child.id, children: [child] });

export type Listener = (state: AppState, previous: AppState) => void;

export interface Store {
  getState(): AppState;
  dispatch(event: AppEvent): void;
  subscribe(listener: Listener): () => void;
}

/** `stored`: alle Kinder (B-90) oder nur die Daten eines Kinds (dann ein Kind mit neuer id, für
 *  Tests). `now` liefert die aktuelle Zeit (in Tests ersetzbar). */
export function createStore(
  stored: AppData | ChildData,
  portrait = false,
  now: () => Date = () => new Date(),
): Store {
  const app: Pick<AppData, 'activeChildId' | 'children'> =
    'children' in stored ? stored : single(newChild(now(), stored));
  const data = prepare(childData(activeChild(app)), localDay(now()));
  // B-97: beim Öffnen zuerst die Begrüßung – außer beide Tiere schlafen.
  // B-90: mit mehreren Kindern immer die Begrüßung, dort wählt das Kind
  let state: AppState = {
    view: app.children.length === 1 && allAsleep(data) ? 'sleep' : 'welcome',
    portrait,
    data,
    round: null,
    children: app.children,
    childId: activeChild(app).id,
  };
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    dispatch(event) {
      const previous = state;
      state = reduce(state, event, localDay(now()));
      if (state !== previous) listeners.forEach((l) => l(state, previous));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
