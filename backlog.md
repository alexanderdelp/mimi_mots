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
- [x] **B-03 Assets einbinden**: Gelieferte PNGs (Avatare, Flaggen) und Icons liegen bereits unverändert in `public/avatars/`, `public/flags/`, `public/icons/` (Namen laut CLAUDE.md). Asset-Mapping Pose → Datei in `src/components/avatar.ts`.
  - AK: Bildtausch zwischen Posen springt nicht (visueller Check im Dev-Server).
  - AT-03.1: Alle 8 Avatar-PNGs, beide Flaggen und alle Icons werden unter `/mimi_mots/…` mit Status 200 ausgeliefert; Avatare haben 384 × 440 px.
  - AT-03.2: In der Avatar-Vorschau bleiben Position und Größe von Avatar-Box und Bild beim Wechsel durch alle 4 Posen beider Begleiter identisch.
  - AT-03.3: Nach dem Vorladen löst ein Posen-Wechsel keinen Netzwerk-Request aus; das neue Bild ist sofort vollständig geladen.
  - AT-03.4: Der Avatar wird höchstens 440 CSS-px hoch dargestellt, unten ausgerichtet und ohne Verzerrung (`object-fit: contain`).
  - Hinweis: Die Avatar-Vorschau ist ein Platzhalter für den visuellen Check und wird mit B-06/B-11 durch den Router und die Startansicht ersetzt.
- [x] **B-04 Wortliste**: `src/data/words.ts` mit Typ `Word { id, emoji, de, en, fr }` und Liste aus Anhang `anforderungen.md`. Export als JSON für das Audio-Skript.
  - AK: Test prüft eindeutige ids, keine leeren Felder.
  - AT-04.1: Alle 50 Emojis der Wortliste werden in WebKit als je ein einzelnes Bildzeichen dargestellt (kein Zerfall in mehrere Zeichen, kein leeres Kästchen).
  - AT-04.2: Die Wortliste liegt als `src/data/words.json` vor, die das Audio-Skript direkt lesen kann, und stimmt Eintrag für Eintrag mit der Tabelle in `anforderungen.md` §10 überein (Unit-Test).
  - Hinweis: B-04 hat noch keine Oberfläche; AT-04.1 prüft die Darstellung in einer leeren Testseite.
- [x] **B-05 Storage-Modul**: `load()`, `save()`, Defaults, Versionsfeld, robust bei kaputtem JSON.
  - AK: Unit-Tests für Defaults, Roundtrip, kaputte Daten.
  - AT-05.1: Die App startet ohne Konsolenfehler, wenn unter `mimi-mots:v1` kaputtes JSON, ein falscher Datentyp, eine unbekannte Version oder ungültige Einträge liegen.
  - AT-05.2: Die App startet ohne Fehler, wenn `localStorage` nicht verfügbar ist (Zugriff wirft, wie im privaten Modus).
  - AT-05.3: Gültige gespeicherte Daten bleiben beim Start und nach Neuladen unverändert erhalten.
  - Hinweis: Der Roundtrip Speichern → Neuladen über die Oberfläche wird mit B-12 (AT „Auswahl merken“) geprüft; bis dahin per Unit-Test.
- [x] **B-06 Router/State**: Views `start | round | end`, einfache Zustandsmaschine; Hochformat-Overlay (B-52) vorbereiten.
  - AT-06.1: Beim Öffnen der App ist die Startansicht aktiv, und es ist genau eine Ansicht im DOM.
  - AT-06.2: Ablauf Start → (Play) → Lernrunde → (Beenden) → Abschluss → (Zurück) → Start funktioniert; es ist immer genau eine Ansicht sichtbar.
  - AT-06.3: Neuladen während Lernrunde oder Abschluss startet wieder auf der Startansicht.
  - AT-06.4: Im Hochformat erscheint ein Overlay „iPad drehen“ über der aktuellen Ansicht; zurück ins Querformat ist es weg und dieselbe Ansicht ist unverändert da.
  - AT-06.5: Die Avatar-Vorschau aus B-03 bleibt unter `?vorschau=avatar` erreichbar (bis die Lernrunde die Posen zeigt, B-24); die B-03-Tests nutzen diese Adresse.
  - Hinweis: Start-, Lernrunden- und Abschlussansicht sind Platzhalter mit je einer Schaltfläche; Inhalte folgen in B-11, B-21 ff. und B-43. Beenden per einfachem Tipp, Long-Press folgt in B-25.

## M1 – Startbildschirm
- [x] **B-10 Komponente Auswahlkachel**: Zustände ausgewählt (5 px lila, `--lila-100`) / nicht ausgewählt (2 px dunkelgrau, weiß); kein Layout-Sprung beim Wechsel; ≥ 88 px; `aria-pressed`.
  - AT-10.1: Nicht ausgewählte Kachel: weißer Hintergrund, 2 px Rahmen in `--grau-700`; ausgewählte Kachel: Hintergrund `--lila-100`, 5 px Rahmen in `--lila-700`.
  - AT-10.2: Tipp auf eine Kachel wählt sie aus; in einer Gruppe ist immer genau eine ausgewählt; erneuter Tipp auf die ausgewählte ändert nichts; `aria-pressed` spiegelt den Zustand.
  - AT-10.3: Ein Auswahlwechsel verschiebt nichts: Position und Größe aller Kacheln und ihrer Inhalte bleiben pixelgleich.
  - AT-10.4: Jede Kachel ist auf allen drei Viewports mindestens 88 × 88 px groß.
  - AT-10.5: Kacheln verwenden in beiden Zuständen nur Farben aus den Design-Tokens (kein Rot/Grün, Leitprinzip 1).
  - Hinweis: Geprüft wird in der Vorschau `?vorschau=kacheln` (Begleiter-, Flaggen- und Dauer-Kacheln), bis die Startansicht (B-11) die Kacheln nutzt.
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
