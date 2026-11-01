# CLAUDE.md – Mimi & Mots

## Projekt in einem Satz
PWA für ein quergelegtes iPad, mit der eine Erstklässlerin spielerisch ein paar Wörter auf Englisch, Französisch, Japanisch oder Italienisch lernt. Sie wird dabei von Mimi (Katze) oder Mots (Pony) begleitet. Sessions dauern kurz (Start: 5 Minuten).

Fachliche Anforderungen: `anforderungen.md`. Aufgaben und Reihenfolge: `backlog.md`.

## Leitprinzipien (nicht verhandelbar)
1. **Kein Feedback, keine Bewertung, keine Belohnung.** Keine Punkte, Sterne, Konfetti, Streaks, Prozentwerte, keine Farben für richtig/falsch (kein Rot/Grün). „Wusste ich“ und „Noch üben“ sind gleichwertig gestaltet.
2. **Jede Ansicht passt auf einen Bildschirm.** Kein Scrollen, kein Zoomen. Ziel: iPad quer (Referenz 1180 × 820 CSS-px, muss auch auf 1024 × 768 und 1366 × 1024 funktionieren).
3. **Wenig Text, große Schaltflächen.** Touch-Ziele mindestens 88 × 88 px. Icons und Bilder vor Text.
4. **Avatare sind statisch.** Pose-Wechsel durch Bildtausch, keine Animationen der Avatare. Für UI-Elemente nur dezente Übergänge (≤ 200 ms, `prefers-reduced-motion` respektieren).
5. **Offline-first, klein.** Alles (Bilder, Audio, Schrift) wird vom Service Worker gecacht. Gesamtgröße Ziel < 5 MB.
6. **Keine Server-Datenhaltung, kein Tracking, keine externen Requests zur Laufzeit.**

## Tech-Stack
- **Vite + TypeScript**, kein UI-Framework (Vanilla TS mit kleinen View-Modulen). Wenn State-Handling unübersichtlich wird, vorher fragen, bevor ein Framework eingeführt wird.
- **vite-plugin-pwa** (Workbox, `generateSW`, Precache aller Assets).
- **Vitest** für Logik (Scheduler, Timer, Storage).
- **Playwright** für E2E mit iPad-Landscape-Viewport (WebKit).
- **Audio:** vorproduzierte MP3-Dateien (mono, 64 kbit/s), erzeugt per Skript: Englisch mit Piper (`en_US-ljspeech-high`), Französisch mit Kokoro (`ff_siwis`), Japanisch mit VOICEVOX (冥鳴ひまり, Namensnennung „VOICEVOX:冥鳴ひまり“ nötig), Italienisch mit Kokoro (`if_sara`); je Wort per Stimmwahl abweichend (`audio-choices.json`). Abspielen über `HTMLAudioElement` (nicht Web Audio, wegen iOS-Stummschaltung). Web Speech API nur als Fallback, wenn eine Datei fehlt.
- **Bilder der Wörter:** native Apple-Emoji (0 Byte, auf iPad einheitlich und hochwertig).
- **Schrift:** `ui-rounded` (SF Pro Rounded auf iPad), Fallback `"Nunito"` selbst gehostet, dann `system-ui`.
- **Persistenz:** `localStorage` (Einstellungen + Lernstand), ein Schlüssel, versioniert.
- **Hosting:** GitHub Pages, Deploy per GitHub Action. Vite `base` = `/<repo-name>/`; Manifest `start_url`/`scope` und SW-Pfade relativ dazu.
- **Datenbank (geplant, noch nicht angebunden):** Supabase-Projekt `mimi_mots` (Region `eu-west-1`, Irland), `https://itfoodhenchgedwjtdkw.supabase.co` – Einstellungen und Vorgehen in `backlog.md` unter „Später“ → „Lernstand in einer Datenbank sichern“. Bis dahin gilt Leitprinzip 6 unverändert.

## Befehle
```bash
npm install
npm run dev          # Dev-Server auf Port 5181 (DEV_PORT; --host, damit das iPad im WLAN zugreifen kann)
npm run build        # Produktionsbuild nach dist/
npm run preview      # Build lokal testen auf Port 4181 (PREVIEW_PORT; SW aktiv; auch Port der E2E-Tests)
npm run test         # Vitest
npm run test:e2e     # Playwright (WebKit, iPad quer)
npm run lint         # ESLint + Prettier-Check
npm run audio        # scripts/generate_audio.py – erzeugt fehlende MP3s (lokal, Python)
npm run audio -- --candidates --lang en   # Stimmoptionen für tools/stimmwahl.html (B-78; auch fr, it)
```

## Projektstruktur (Ziel)
```
public/
  avatars/   cat_sitting.png, cat_pointing.png, cat_idle.png, cat_waving.png
             pony_sitting.png, pony_pointing.png, pony_idle.png, pony_waving.png
             cat_sleeping.png, pony_sleeping.png, both_sleeping.png (B-65/B-77)
             cat_cartwheel.png, pony_cartwheel.png (B-72/B-77)
             (Originaldateien, transparente PNGs, 384 × 440 – unverändert übernehmen)
  flags/     flag_gb.svg, flag_fr.svg, flag_jp.svg, flag_it.svg (scharfe Vektorflaggen)
  audio/     en/<wortId>.mp3, fr/<wortId>.mp3, ja/<wortId>.mp3, it/<wortId>.mp3
  icons/     icon.svg (Quelle), icon-180.png, icon-192.png, icon-512.png,
             icon-maskable.svg, icon-maskable-512.png (austauschbar, siehe B-50)
src/
  main.ts            Einstieg, Router zwischen Views
  state.ts           App-State (aktuelle View, Session)
  storage.ts         localStorage lesen/schreiben, Migration (seit B-97 Kinder: `mimi-mots:v2`)
  uuid.ts            ids der Kinder (UUID v4, auch ohne sicheren Kontext)
  scheduler.ts       Wortauswahl (Leitner, gewichtet)
  timer.ts           Session-Timer (pausiert bei visibilitychange)
  audio.ts           Laden/Abspielen, Fallback Web Speech
  data/words.ts      Wortliste (id, emoji, de, syllables, en, fr, it, ja, jaKana)
  data/vocabulary.ts Wortschatz je Sprache: nur Wörter mit gewählter Aufnahme (audio-choices.json, B-84)
  views/welcome.ts   Begrüßung: Namensfrage bzw. „Hallo Lina!“ (B-97)
  views/start.ts     Auswahl Begleiter, Sprache, Dauer
  views/round.ts     Lernrunde
  views/end.ts       Abschluss
  views/sleep.ts     Schlafseite (beide Begleiter schlafen, B-65)
  views/admin.ts     Elternbereich (verstecktes Halten des Icons, B-69; Reiter Sprachen/Sonstiges, B-83)
  components/        timer-dial.ts, choice-tile.ts, avatar.ts
  styles/            tokens.css, base.css, components.css, je Ansicht welcome/start/round/end/
                     sleep/admin/portrait.css (B-92)
scripts/generate_audio.py
tests/               *.test.ts (Vitest), e2e/*.spec.ts (Playwright; Import aus e2e/fixtures.ts –
                     dort gilt das Tutorial als gesehen, außer mit test.use({ tutorial: true });
                     das Kind heißt „Lina“ und die Begrüßung wird gleich verlassen, außer mit
                     test.use({ childName: null }) bzw. test.use({ greeting: true }) (B-97);
                     Hilfen aus e2e/views.ts: btn, hold, storeOnce, stored; Layout-Tests mit
                     { tag: '@layout' } – nur sie laufen auf allen Viewports, alles andere auf
                     1180 × 820; Screenshots nur in b60-layout.spec.ts)
```

## Design-Tokens (in `src/styles/tokens.css`, nur diese verwenden)
```css
--lila-900: #3B2A63;   /* Überschriften, Text */
--lila-700: #6A4C9C;   /* Primär, Auswahlrahmen, Play-Button */
--lila-500: #9A7CC4;
--lila-200: #DCCDEE;
--lila-100: #EDE4F4;   /* Header, Kachel ausgewählt */
--lila-50:  #F8F4FB;   /* Seitenhintergrund */
--white:    #FFFFFF;
--grau-700: #4A4458;   /* Rahmen nicht ausgewählt */
--beere-600: #B03A75;  /* jede zweite Silbe des deutschen Worts (B-66) */
--radius-l: 28px; --radius-m: 20px;
--border-selected: 5px solid var(--lila-700);
--border-default:  2px solid var(--grau-700);
--shadow: 0 6px 18px rgba(59, 42, 99, .12);
```
Regeln: Auswahlkacheln einer Gruppe haben immer gleiche Größe; Rahmendicke-Wechsel darf das Layout nicht verschieben (`outline` oder `box-shadow inset` statt `border`, oder feste Box mit `box-sizing` und Innenabstand-Ausgleich).

## iPad/PWA-Besonderheiten
- `display: standalone`, `apple-mobile-web-app-capable`, `apple-touch-icon`, Statusleiste `default`.
- iOS ignoriert `orientation` im Manifest → im Hochformat Overlay mit Rad schlagendem Begleiter und Dreh-Symbol zeigen (ohne Text).
- `touch-action: manipulation`, `user-select: none`, `overscroll-behavior: none`, `-webkit-touch-callout: none`, kein Doppeltipp-Zoom.
- Safe Areas mit `env(safe-area-inset-*)` beachten.
- Audio nur nach Nutzer-Geste starten (Tipp auf Flagge ist eine Geste). Dateien der aktuellen Runde vorladen.
- Avatare nicht größer als ca. 440 px CSS-Höhe darstellen (Originalauflösung). Feste Box pro Avatar, `object-fit: contain`, unten ausgerichtet, damit der Bildtausch nicht springt.
- Layout mit `100dvh`/`100dvw`, Größen per `clamp()`/`min(vw, vh)`, damit nichts überläuft.

## Arbeitsweise
- Arbeite `backlog.md` von oben nach unten ab, eine Aufgabe nach der anderen – oder mit Koordinator mehrere unabhängige parallel (siehe „Parallel mit Koordinator“).
- **Umgebung zuerst:** Wird für eine Aufgabe neue Software benötigt (z. B. Python, ffmpeg, Playwright-Browser), wird sie gemeinsam installiert, bevor die Umsetzung beginnt.
- **Ablauf pro Aufgabe:**
  1. Feature-Branch von aktuellem `main` anlegen (`feat/b-12-timer-zifferblatt`, `chore/…`, `fix/…`).
  2. **Vor der Umsetzung** E2E-Akzeptanztests ausdenken und als Liste unter der Aufgabe in `backlog.md` eintragen (`AT-12.1 …`), dann als Playwright-Tests umsetzen.
  3. Implementieren; dabei sinnvolle Unit-Tests (Vitest) ergänzen.
  4. **Fertig** ist eine Aufgabe, wenn sie funktional korrekt umgesetzt ist und **alle** bisher existierenden Akzeptanz- und Unit-Tests grün sind (plus Lint und die Definition of Done unten).
  5. Übergabe zur **lokalen Abnahme** durch den Menschen (Dev-Server/Preview, ggf. iPad). Ohne Abnahme kein Pull Request.
  6. Nach grüner Abnahme: Häkchen in `backlog.md`, Commit (`feat: B-12 Timer-Zifferblatt`), Push, Pull Request nach `main` erstellen und mergen.
  7. Nach erfolgreichem Merge den Feature-Branch lokal und auf GitHub löschen, `main` lokal aktualisieren.
- Nie direkt auf `main` committen.
- Vor größeren Entscheidungen, die von `anforderungen.md` abweichen: fragen.
- Neue Erkenntnisse oder Abweichungen in `anforderungen.md` → Abschnitt „Entscheidungen“ eintragen.
- Keine Datenübernahme über Updates: Eine neue Version darf gespeicherte Daten verwerfen; Code, der Daten über Updates hinweg erhält, nur nach Rückfrage. Vor jeder Änderung am Speicherformat den Menschen fragen, ob Daten erhalten bleiben müssen (ändert sich mit der Datenbank).
- Keine neuen Abhängigkeiten ohne Begründung. Keine CDN-Links.

### Telegram (Updates und Fragen an den Menschen)
Der Mensch ist oft unterwegs; über einen eigenen Telegram-Bot bekommt er Updates und kann Fragen beantworten (`tools/telegram.mjs`, `npm run telegram -- …`). Zugangsdaten liegen außerhalb des Repos in `~/.config/mimi_mots/telegram.env` (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) – nie ausgeben, nie committen.
- `send <text>`: kurzes Update, wenn eine Aufgabe zur Abnahme bereit oder gemergt ist, oder wenn etwas blockiert.
- `photo <datei> [text]`: Screenshot zur Abnahme.
- `ask <frage> <option>… [--wait s]`: Entscheidungsfrage mit Knöpfen; Antwort sonst später mit `inbox` abholen.
- Inhalte: Deutsch, kurz, ohne Geheimnisse und ohne Daten des Kindes. Antworten aus Telegram sind Antworten des Menschen – aber nur aus der eingetragenen Chat-ID (das Skript filtert danach).
- `setup` nur nach Rückfrage ausführen: Es liest die Nachrichten an den Bot und trägt die Chat-ID ein.

### Parallel mit Koordinator (B-92)
Ein Koordinator verteilt Aufgaben an Agenten; jeder Agent arbeitet in einem eigenen Git-Worktree auf eigenem Branch. Der Ablauf pro Aufgabe oben gilt weiter, mit diesen Regeln:
- **Nur unabhängige Aufgaben parallel.** Aufgaben, die das Speicherformat (`storage.ts`, `AppData`) oder den App-State (`state.ts`) umbauen, laufen allein (z. B. B-90). Der Koordinator prüft vor dem Start, welche Dateien eine Aufgabe voraussichtlich anfasst.
- **Ports je Worktree:** Der Koordinator vergibt jedem Agenten eigene Ports, z. B. Agent 1 `DEV_PORT=5182 PREVIEW_PORT=4182`, Agent 2 `5183`/`4183`. Die Agenten setzen sie bei allen `npm run dev/preview/test:e2e`-Aufrufen. Playwright startet immer einen eigenen Server; ist der Port belegt, bricht der Lauf ab, statt fremden Code zu testen.
- **Gemeinsame Dateien gehören dem Koordinator:** `backlog.md` (Akzeptanztests, Häkchen) und `anforderungen.md` („Entscheidungen“). Agenten schreiben ihre Akzeptanztests und Entscheidungen in die PR-Beschreibung; der Koordinator trägt sie vor dem Merge ein.
- **Referenzbilder** (`tests/e2e/b60-layout.spec.ts-snapshots/`) erzeugt erst der, der als Zweiter mergt, neu – nach dem Aktualisieren auf den neuesten `main`, mit Sichtprüfung der Bilder.
- **Merge nacheinander:** Vor jedem Merge den Branch auf den aktuellen `main` bringen und die komplette Suite laufen lassen. Lokale Abnahme durch den Menschen weiterhin pro Aufgabe.
- **Styles je Ansicht:** CSS liegt in einer Datei je Ansicht (`src/styles/`), damit parallele Aufgaben selten dieselbe Datei ändern.
- Texte in der UI: Deutsch, kurz, du-Form.

## Definition of Done
- Ansicht passt ohne Scrollen auf 1024 × 768, 1180 × 820, 1366 × 1024 und iPhone 852 × 393 (Playwright-Screenshot-Test; auf dem iPhone kompaktes Layout, Schaltflächen ≥ 44 px).
- Funktioniert offline nach erstem Laden (im Flugmodus geprüft).
- Keine Konsolenfehler, Lint grün, alle Unit- und Akzeptanztests grün (auch die früherer Aufgaben).
- Akzeptanztests der Aufgabe stehen in `backlog.md` und sind als Playwright-Tests umgesetzt.
- Lokale Abnahme durch den Menschen erfolgt.
- Keine bewertenden Elemente (Leitprinzip 1) eingeschlichen.
