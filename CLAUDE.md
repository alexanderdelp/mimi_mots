# CLAUDE.md – Mimi & Mots

## Projekt in einem Satz
PWA für ein quergelegtes iPad, mit der eine Erstklässlerin spielerisch ein paar Wörter auf Englisch oder Französisch lernt. Sie wird dabei von Mimi (Katze) oder Mots (Pony) begleitet. Sessions dauern kurz (Start: 5 Minuten).

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
- **Audio:** vorproduzierte MP3-Dateien (mono, 64 kbit/s), erzeugt per Skript mit Kokoro-TTS (Fallback Piper). Abspielen über `HTMLAudioElement` (nicht Web Audio, wegen iOS-Stummschaltung). Web Speech API nur als Fallback, wenn eine Datei fehlt.
- **Bilder der Wörter:** native Apple-Emoji (0 Byte, auf iPad einheitlich und hochwertig).
- **Schrift:** `ui-rounded` (SF Pro Rounded auf iPad), Fallback `"Nunito"` selbst gehostet, dann `system-ui`.
- **Persistenz:** `localStorage` (Einstellungen + Lernstand), ein Schlüssel, versioniert.
- **Hosting:** GitHub Pages, Deploy per GitHub Action. Vite `base` = `/<repo-name>/`; Manifest `start_url`/`scope` und SW-Pfade relativ dazu.

## Befehle
```bash
npm install
npm run dev          # Dev-Server (--host, damit das iPad im WLAN zugreifen kann)
npm run build        # Produktionsbuild nach dist/
npm run preview      # Build lokal testen (SW aktiv)
npm run test         # Vitest
npm run test:e2e     # Playwright (WebKit, iPad quer)
npm run lint         # ESLint + Prettier-Check
npm run audio        # scripts/generate_audio.py – erzeugt fehlende MP3s (lokal, Python)
```

## Projektstruktur (Ziel)
```
public/
  avatars/   cat_sitting.png, cat_pointing.png, cat_idle.png, cat_waving.png
             pony_sitting.png, pony_pointing.png, pony_idle.png, pony_waving.png
             (Originaldateien, transparente PNGs, 384 × 440 – unverändert übernehmen)
  flags/     flag_gb.png, flag_fr.png (Originale)
  audio/     en/<wortId>.mp3, fr/<wortId>.mp3
  icons/     icon.svg (Quelle), icon-180.png, icon-192.png, icon-512.png,
             icon-maskable.svg, icon-maskable-512.png (austauschbar, siehe B-50)
src/
  main.ts            Einstieg, Router zwischen Views
  state.ts           App-State (aktuelle View, Session)
  storage.ts         localStorage lesen/schreiben, Migration
  scheduler.ts       Wortauswahl (Leitner, gewichtet)
  timer.ts           Session-Timer (pausiert bei visibilitychange)
  audio.ts           Laden/Abspielen, Fallback Web Speech
  data/words.ts      Wortliste (id, emoji, de, en, fr)
  views/start.ts     Auswahl Begleiter, Sprache, Dauer
  views/round.ts     Lernrunde
  views/end.ts       Abschluss
  components/        timer-dial.ts, choice-tile.ts, avatar.ts
  styles/            tokens.css, base.css, views.css
scripts/generate_audio.py
tests/               *.test.ts (Vitest), e2e/*.spec.ts (Playwright)
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
--radius-l: 28px; --radius-m: 20px;
--border-selected: 5px solid var(--lila-700);
--border-default:  2px solid var(--grau-700);
--shadow: 0 6px 18px rgba(59, 42, 99, .12);
```
Regeln: Auswahlkacheln haben immer gleiche Größe; Rahmendicke-Wechsel darf das Layout nicht verschieben (`outline` oder `box-shadow inset` statt `border`, oder feste Box mit `box-sizing` und Innenabstand-Ausgleich).

## iPad/PWA-Besonderheiten
- `display: standalone`, `apple-mobile-web-app-capable`, `apple-touch-icon`, Statusleiste `default`.
- iOS ignoriert `orientation` im Manifest → im Hochformat Overlay „iPad drehen“ zeigen.
- `touch-action: manipulation`, `user-select: none`, `overscroll-behavior: none`, `-webkit-touch-callout: none`, kein Doppeltipp-Zoom.
- Safe Areas mit `env(safe-area-inset-*)` beachten.
- Audio nur nach Nutzer-Geste starten (Tipp auf Flagge ist eine Geste). Dateien der aktuellen Runde vorladen.
- Avatare nicht größer als ca. 440 px CSS-Höhe darstellen (Originalauflösung). Feste Box pro Avatar, `object-fit: contain`, unten ausgerichtet, damit der Bildtausch nicht springt.
- Layout mit `100dvh`/`100dvw`, Größen per `clamp()`/`min(vw, vh)`, damit nichts überläuft.

## Arbeitsweise
- Arbeite `backlog.md` von oben nach unten ab. Pro Aufgabe: umsetzen → Tests → Häkchen in `backlog.md` setzen → kurzer Commit (`feat: B-12 Timer-Zifferblatt`).
- Vor größeren Entscheidungen, die von `anforderungen.md` abweichen: fragen.
- Neue Erkenntnisse oder Abweichungen in `anforderungen.md` → Abschnitt „Entscheidungen“ eintragen.
- Keine neuen Abhängigkeiten ohne Begründung. Keine CDN-Links.
- Texte in der UI: Deutsch, kurz, du-Form.

## Definition of Done
- Ansicht passt ohne Scrollen auf 1024 × 768, 1180 × 820, 1366 × 1024 (Playwright-Screenshot-Test).
- Funktioniert offline nach erstem Laden (im Flugmodus geprüft).
- Keine Konsolenfehler, Lint grün, Tests grün.
- Keine bewertenden Elemente (Leitprinzip 1) eingeschlichen.
