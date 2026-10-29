# Backlog – Mimi & Mots

Reihenfolge = Umsetzungsreihenfolge. Häkchen setzen, wenn Definition of Done (siehe `CLAUDE.md`) erfüllt und die lokale Abnahme erfolgt ist.

Vor Beginn einer Aufgabe werden ihre E2E-Akzeptanztests als `AT-<Nr>.<n>` direkt unter der Aufgabe ergänzt.

## M0 – Grundgerüst
- [x] **B-01 Projekt aufsetzen**: Vite + TS, ESLint/Prettier, Vitest, Playwright (WebKit, Viewports 1024×768, 1180×820, 1366×1024 quer). npm-Skripte laut CLAUDE.md. Dev-Server mit `--host`.
  - AK: `npm run dev/build/test/test:e2e/lint` laufen grün.
  - AT-01.1: Die App lädt in WebKit auf 1024×768, 1180×820 und 1366×1024 (quer) ohne Konsolenfehler und ohne fehlgeschlagene Requests.
  - AT-01.2: Die Seite hat den Titel „Mimi & Mots“, `lang="de"` und einen Viewport-Meta-Tag ohne Zoom (`user-scalable=no`, `viewport-fit=cover`).
  - AT-01.3: Die App wird unter dem GitHub-Pages-Pfad `/mimi_mots/` ausgeliefert (Preview des Produktionsbuilds) und lädt ihre Skripte von dort.
  - AT-01.4: Zur Laufzeit gehen keine Requests an fremde Hosts (Leitprinzip 6).
- [x] **B-02 Design-Tokens & Basis-CSS**: `tokens.css`, `base.css` (Reset, `ui-rounded`, Touch-Regeln, kein Scroll/Zoom, Safe Areas, 100dvh-Layout).
  - AK: Leere Seite füllt Bildschirm ohne Scrollbalken; Doppeltipp zoomt nicht.
  - AT-02.1: Auf allen drei Viewports füllt `#app` exakt den Bildschirm; Dokument ist weder horizontal noch vertikal scrollbar, auch nicht bei zu großem Inhalt.
  - AT-02.2: Doppeltipp auf die Seite verändert den Zoom nicht (`visualViewport.scale` bleibt 1); `touch-action: manipulation` ist gesetzt.
  - AT-02.3: Seitenhintergrund ist `--lila-50` (#F8F4FB), Text `--lila-900` (#3B2A63); Schrift-Stack beginnt mit `ui-rounded`, dann `Nunito`.
  - AT-02.4: Touch-Regeln aktiv: `user-select: none`, `overscroll-behavior: none` (`-webkit-touch-callout` und – im Windows-Playwright-WebKit – `overscroll-behavior` sind nicht prüfbar → zusätzlich Unit-Test am CSS).
  - AT-02.5: Die Nunito-Schrift wird von der eigenen Domain geladen (keine externen Requests) und ist nach dem Laden verfügbar.
- [ ] **B-03 Assets einbinden**: Gelieferte PNGs (Avatare, Flaggen) und Icons liegen bereits unverändert in `public/avatars/`, `public/flags/`, `public/icons/` (Namen laut CLAUDE.md). Asset-Mapping Pose → Datei in `src/components/avatar.ts`.
  - AK: Bildtausch zwischen Posen springt nicht (visueller Check im Dev-Server).
- [ ] **B-04 Wortliste**: `src/data/words.ts` mit Typ `Word { id, emoji, de, en, fr }` und Liste aus Anhang `anforderungen.md`. Export als JSON für das Audio-Skript.
  - AK: Test prüft eindeutige ids, keine leeren Felder.
- [ ] **B-05 Storage-Modul**: `load()`, `save()`, Defaults, Versionsfeld, robust bei kaputtem JSON.
  - AK: Unit-Tests für Defaults, Roundtrip, kaputte Daten.
- [ ] **B-06 Router/State**: Views `start | round | end`, einfache Zustandsmaschine; Hochformat-Overlay (B-30) vorbereiten.

## M1 – Startbildschirm
- [ ] **B-10 Komponente Auswahlkachel**: Zustände ausgewählt (5 px lila, `--lila-100`) / nicht ausgewählt (2 px dunkelgrau, weiß); kein Layout-Sprung beim Wechsel; ≥ 88 px; `aria-pressed`.
- [ ] **B-11 Startansicht**: Header mit Icon + Titel; Gruppen Begleiter, Sprache, Dauer (nur „5 Min.“ mit Uhr-Symbol); Play-Button. Layout laut Mockup, passt auf alle Ziel-Viewports.
  - AK: Play erst aktiv, wenn alle drei Gruppen gewählt; Screenshot-Tests für 3 Viewports.
- [ ] **B-12 Auswahl merken**: Letzte Auswahl speichern und vorbelegen; Erststart: nur Dauer vorbelegt.
  - AK: E2E – Auswahl treffen, neu laden, Auswahl ist vorbelegt.

## M2 – Lernrunde
- [ ] **B-20 Scheduler**: reine Funktion laut anforderungen.md §5 (Leitner-Gewichte, max. 6 neue, Abstand ≥ 3, injizierbarer Zufall).
  - AK: Unit-Tests: Gewichtung statistisch plausibel, Abstand eingehalten, Neue-Limit, Auffüllen bei wenig Bekannten, Update-Regeln.
- [ ] **B-21 Wortkarte**: Emoji groß, deutsches Wort; Flaggen-Button; Fremdwort verborgen.
- [ ] **B-22 Aufdecken**: Tipp auf Flagge zeigt Fremdwort, spielt Audio; erneuter Tipp spielt erneut (von vorn).
- [ ] **B-23 Selbsteinschätzung**: Nach erstem Aufdecken zwei gleichwertige Buttons „Wusste ich“ 👍 / „Noch üben“ 🔁 (lila, gleiche Größe); Tipp aktualisiert Lernstand und lädt nächstes Wort. Kein Feedback.
  - AK: E2E – Buttons vor Aufdecken unsichtbar; nach Tipp neues Wort; Storage aktualisiert.
- [ ] **B-24 Avatar in der Runde**: Avatar links; Pose „zeigt“ bei neuem Wort, „freut“ nach Aufdecken; reiner Bildtausch; alle Posen vorgeladen.
- [ ] **B-25 Abbrechen**: [×] oben links, Long-Press 600 ms → Abschluss.

## M3 – Audio
- [ ] **B-30a Audio-Skript**: `scripts/generate_audio.py` (Kokoro; Stimmen EN `bf_emma`, FR `ff_siwis`), liest Wort-JSON, erzeugt nur fehlende Dateien, ffmpeg-Nachbearbeitung (Trim, 150 ms Vorlauf, −16 LUFS, MP3 mono 64 kbit/s), `audio-overrides/` hat Vorrang. README-Abschnitt zur einmaligen lokalen Einrichtung (Python-venv, Modell-Download).
  - AK: Skript erzeugt `public/audio/{en,fr}/<id>.mp3`; Gesamtgröße < 2 MB.
- [ ] **B-30b Audio erzeugen & prüfen**: Dateien generieren, Hörprüfliste `audio-check.md` (id, ok/neu) zum Abhaken durch den Menschen.
- [ ] **B-31 Audio-Modul**: Vorladen der Session-Dateien, Abspielen per `HTMLAudioElement`, Neustart bei erneutem Tipp, Fallback Web Speech (en-GB/fr-FR) bei fehlender Datei.
  - AK: Unit-Test für Fallback-Logik (gemockt); manueller Test auf iPad.

## M4 – Timer & Abschluss
- [ ] **B-40 Timer-Logik**: Start beim ersten Wort, Pause bei `visibilitychange`/Hochformat, Ereignis „abgelaufen“; testbar mit Fake-Timers.
- [ ] **B-41 Timer-Zifferblatt**: SVG im Time-Timer-Stil (lila Sektor schrumpft im Uhrzeigersinn, Strichmarken, keine Ziffern), ~120 px oben rechts, aktualisiert ≥ 1×/s.
- [ ] **B-42 Rundenende**: Nach Ablauf läuft das aktuelle Wort unverändert weiter (Aufdecken, Vorlesen beliebig oft); erst nach „Wusste ich“/„Noch üben“ (Lernstand gespeichert) kommt der Abschluss statt eines neuen Worts.
  - AK: E2E mit verkürzter Dauer (Test-Parameter `?dur=10s`, nur in Dev/Test): Timer läuft ab → Flagge mehrfach tippbar, Audio startet jeweils → Selbsteinschätzung → Abschluss; Fall „Timer läuft vor dem Aufdecken ab“ abgedeckt.
- [ ] **B-43 Abschlussansicht**: Avatar „winkt“ groß, „Viel Spaß beim Spielen!“, Haus-Button → Start. Keine Statistik.

## M5 – PWA & Offline
- [ ] **B-50 Manifest & Icons**: Vorhandene Icons aus `public/icons/` einbinden (Manifest 192/512/maskable, `apple-touch-icon` 180), Meta-Tags für iOS; Platzhalter im Header durch `icon.svg` ersetzen. Skript `npm run icons` rendert die PNGs aus `icon.svg` neu (z. B. mit `sharp`), damit das Icon später einfach austauschbar ist.
- [ ] **B-51 Service Worker**: vite-plugin-pwa, Precache aller Assets inkl. Audio, stilles Update beim nächsten Start.
  - AK: Nach erstem Laden im Flugmodus vollständig nutzbar (Start → Runde mit Audio → Abschluss).
- [ ] **B-52 Hochformat-Overlay**: Avatar + Dreh-Symbol, Timer pausiert.
- [ ] **B-53 Deployment GitHub Pages**: GitHub Action (Build + `actions/deploy-pages`) bei Push auf `main`; Vite `base` = Repo-Pfad; README mit Einrichtung (Pages-Quelle „GitHub Actions“) und Anleitung „Zum Home-Bildschirm hinzufügen“ auf dem iPad.
  - AK: App unter `https://<user>.github.io/<repo>/` erreichbar, installierbar, offline nutzbar.

## M6 – Feinschliff
- [ ] **B-60 Layout-Prüfung**: Screenshot-Tests aller Views auf 3 Viewports; keine Überläufe; Kontrast geprüft.
- [ ] **B-61 Leitprinzipien-Review**: Checkliste – keine Bewertung/Belohnung, keine Avatar-Animation, ≥ 88 px Touch-Ziele, wenig Text.
- [ ] **B-62 iPad-Praxistest**: Mit dem Kind testen; Beobachtungen in `anforderungen.md` §11 festhalten.

## Später
- Weitere Dauern und Sprachen · Themenwahl · Elternbereich (Reset) · Eigene Illustrationen
