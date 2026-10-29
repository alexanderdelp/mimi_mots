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
  - AT-03.2: Position und Größe von Avatar-Box und Bild bleiben beim Posenwechsel identisch (seit B-24 in der Lernrunde geprüft: zeigt ↔ freut, beide Begleiter).
  - AT-03.3: Nach dem Vorladen löst ein Posen-Wechsel keinen Netzwerk-Request aus; das neue Bild ist sofort vollständig geladen (seit B-24 in der Lernrunde).
  - AT-03.4: Der Avatar wird höchstens 440 CSS-px hoch dargestellt, unten ausgerichtet und ohne Verzerrung (`object-fit: contain`) (seit B-24 in der Lernrunde).
  - Hinweis: Die Avatar-Vorschau war ein Platzhalter für den visuellen Check; sie ist mit B-24 entfallen, die Tests laufen seitdem in der Lernrunde.
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
  - AT-06.5: ~~Avatar-Vorschau unter `?vorschau=avatar`~~ – mit B-24 entfallen; seitdem zeigt `?vorschau=avatar` die normale Startansicht.
  - Hinweis: Start-, Lernrunden- und Abschlussansicht sind Platzhalter mit je einer Schaltfläche; Inhalte folgen in B-11, B-21 ff. und B-43. Beenden per einfachem Tipp, Long-Press folgt in B-25.

## M1 – Startbildschirm
- [x] **B-10 Komponente Auswahlkachel**: Zustände ausgewählt (5 px lila, `--lila-100`) / nicht ausgewählt (2 px dunkelgrau, weiß); kein Layout-Sprung beim Wechsel; ≥ 88 px; `aria-pressed`.
  - AT-10.1: Nicht ausgewählte Kachel: weißer Hintergrund, 2 px Rahmen in `--grau-700`; ausgewählte Kachel: Hintergrund `--lila-100`, 5 px Rahmen in `--lila-700`.
  - AT-10.2: Tipp auf eine Kachel wählt sie aus; in einer Gruppe ist immer genau eine ausgewählt; erneuter Tipp auf die ausgewählte ändert nichts; `aria-pressed` spiegelt den Zustand.
  - AT-10.3: Ein Auswahlwechsel verschiebt nichts: Position und Größe aller Kacheln und ihrer Inhalte bleiben pixelgleich.
  - AT-10.4: Jede Kachel ist auf allen drei Viewports mindestens 88 × 88 px groß.
  - AT-10.5: Kacheln verwenden in beiden Zuständen nur Farben aus den Design-Tokens (kein Rot/Grün, Leitprinzip 1).
  - Hinweis: Geprüft wird in der Vorschau `?vorschau=kacheln` (Begleiter-, Flaggen- und Dauer-Kacheln), bis die Startansicht (B-11) die Kacheln nutzt.
- [x] **B-11 Startansicht**: Header mit Icon + Titel; Gruppen Begleiter, Sprache, Dauer (nur „5 Min.“ mit Uhr-Symbol); Play-Button. Layout laut Mockup, passt auf alle Ziel-Viewports.
  - AK: Play erst aktiv, wenn alle drei Gruppen gewählt; Screenshot-Tests für 3 Viewports.
  - AT-11.1: Header mit App-Icon und „Mimi & Mots“; drei Gruppen mit den Überschriften „Wer begleitet dich?“, „Welche Sprache?“, „Wie lange?“.
  - AT-11.2: Begleiter-Kacheln zeigen Bild (Pose „ruhig“) und Namen; Sprach-Kacheln nur die Flagge ohne Text; Dauer-Kachel ein Uhr-Symbol und „5 Min.“.
  - AT-11.3: Ohne gespeicherte Auswahl ist nur „5 Min.“ ausgewählt und Play deaktiviert; ein Tipp auf das deaktivierte Play bewirkt nichts.
  - AT-11.4: Play wird erst aktiv, wenn Begleiter und Sprache gewählt sind; Tipp auf Play startet die Lernrunde.
  - AT-11.5: Auf allen drei Viewports liegt alles vollständig im Bildschirm, nichts überlappt, nichts scrollt; Kacheln ≥ 88 × 88 px, Play rund und ≥ 96 px.
  - AT-11.6: Screenshot-Vergleich der Startansicht je Viewport (Erststart und vollständige Auswahl).
  - Hinweis: Die Kachel-Vorschau aus B-10 entfällt; die B-10-Tests laufen jetzt auf der Startansicht. Speichern der Auswahl folgt in B-12.
- [x] **B-12 Auswahl merken**: Letzte Auswahl speichern und vorbelegen; Erststart: nur Dauer vorbelegt.
  - AK: E2E – Auswahl treffen, neu laden, Auswahl ist vorbelegt.
  - AT-12.1: Begleiter und Sprache wählen, neu laden → beide sind vorbelegt, „5 Min.“ ebenfalls, Play ist sofort aktiv.
  - AT-12.2: Erststart mit leerem Speicher: nur „5 Min.“ vorbelegt; solange nichts gewählt wurde, wird nichts gespeichert.
  - AT-12.3: Auswahl ändern (Mimi → Mots, Englisch → Französisch), neu laden → die neue Auswahl ist vorbelegt.
  - AT-12.4: Nach einer Runde (Play → Beenden → Zurück) zeigt die Startansicht die zuletzt gewählte Auswahl.
  - AT-12.5: Ein vorhandener Lernstand bleibt beim Speichern der Auswahl unverändert erhalten.
  - AT-12.6: Ist `localStorage` gesperrt, funktionieren Auswahl und Play trotzdem ohne Fehler (nur ohne Merken).

## M2 – Lernrunde
- [x] **B-20 Scheduler**: reine Funktion laut anforderungen.md §5 (Leitner-Gewichte, max. 6 neue, Abstand ≥ 3, injizierbarer Zufall).
  - AK: Unit-Tests: Gewichtung statistisch plausibel, Abstand eingehalten, Neue-Limit, Auffüllen bei wenig Bekannten, Update-Regeln.
  - Hinweis: B-20 hat keine Oberfläche; die Akzeptanztests simulieren ganze Sessions mit dem echten Scheduler (Vitest, `tests/scheduler.acceptance.test.ts`). Sichtbar wird er ab B-21/B-23.
  - AT-20.1: In 500 simulierten Sessions à 60 Wörtern erscheint ein Wort nie, bevor mindestens 3 andere Wörter dran waren.
  - AT-20.2: Keine Session führt mehr als 6 neue Wörter ein.
  - AT-20.3: Erste Session (leerer Lernstand): die ersten 6 Wörter sind 6 verschiedene neue Wörter; danach kommen keine weiteren neuen.
  - AT-20.4: Gewichtung: Bei Wörtern gleichmäßig in Box 0–4 entspricht die Häufigkeit der Gewichtswahl 8 : 5 : 3 : 2 : 1 (±10 %); in ganzen Sessions kommen Wörter niedrigerer Boxen häufiger dran als die höherer Boxen.
  - AT-20.5: Bewertung: „Wusste ich“ → Box + 1 (max. 4), „Noch üben“ → Box 0; `seen` + 1, `lastSeenAt` = jetzt; andere Wörter und die Eingabe bleiben unverändert.
  - AT-20.6: Gleicher Seed → gleiche Wortfolge (reproduzierbar).
  - AT-20.7: Über mehrere Sessions werden nach und nach alle 50 Wörter eingeführt (spätestens nach 9 Sessions à 40 Wörtern, wenn alles gewusst wird).
  - AT-20.8: Ab 6 bekannten Wörtern ist in einer Session jedes 3. Wort neu (Positionen 3, 6, 9 …), bis 6 neue eingeführt sind.
- [x] **B-21 Wortkarte**: Emoji groß, deutsches Wort; Flaggen-Button; Fremdwort verborgen.
  - AT-21.1: Nach Play zeigt die Lernrunde ein Wort aus der Wortliste: Emoji und deutsches Wort gehören zusammen.
  - AT-21.2: Das Emoji ist groß (35–45 % der Bildschirmhöhe), das deutsche Wort steht darunter.
  - AT-21.3: Das Fremdwort (Englisch bzw. Französisch) steht nirgends auf der Seite; Bewertungs-Buttons gibt es noch nicht.
  - AT-21.4: Rechts neben der Karte steht ein großer Flaggen-Button (≥ 160 px breit) mit der Flagge der gewählten Sprache.
  - AT-21.5: [×] oben links, Karte mittig, Flagge rechts; auf allen drei Viewports liegt alles im Bildschirm, nichts überlappt, nichts scrollt.
  - AT-21.6: Das Wort bleibt gleich, solange nichts bewertet wird (auch nach Hochformat und zurück).
  - Hinweis: Platz für Avatar (B-24), Timer (B-41), Fremdwort (B-22) und Bewertungs-Buttons (B-23) wird schon freigehalten, damit das Layout später nicht springt.
- [x] **B-22 Aufdecken**: Tipp auf Flagge zeigt Fremdwort, spielt Audio; erneuter Tipp spielt erneut (von vorn).
  - AT-22.1: Tipp auf die Flagge zeigt das Fremdwort unter der Flagge (Französisch mit Artikel), vollständig sichtbar und innerhalb seines Bereichs – auch bei langen Wörtern.
  - AT-22.2: Beim Tipp wird das Fremdwort genau einmal vorgelesen, in der richtigen Sprache (en-GB bzw. fr-FR).
  - AT-22.3: Jeder weitere Tipp bricht die laufende Wiedergabe ab und startet sie von vorn; das Fremdwort bleibt sichtbar.
  - AT-22.4: Das Aufdecken verschiebt nichts: Karte, Flagge und [×] bleiben pixelgleich.
  - AT-22.5: Vor dem ersten Tipp wird nichts vorgelesen (kein Autoplay).
  - AT-22.6: Ohne Sprachausgabe im Browser wird das Wort trotzdem aufgedeckt, ohne Fehler.
  - Hinweis: Bis die MP3-Dateien da sind (B-30a/b, B-31), liest die Web-Speech-Stimme des Geräts vor (Fallback laut Anforderungen). In den Tests wird die Sprachausgabe durch eine Attrappe ersetzt, die Aufrufe mitschreibt.
- [x] **B-23 Selbsteinschätzung**: Nach erstem Aufdecken zwei gleichwertige Buttons „Wusste ich“ 👍 / „Noch üben“ 🔁 (lila, gleiche Größe); Tipp aktualisiert Lernstand und lädt nächstes Wort. Kein Feedback.
  - AK: E2E – Buttons vor Aufdecken unsichtbar; nach Tipp neues Wort; Storage aktualisiert.
  - AT-23.1: Vor dem Aufdecken sind keine Bewertungs-Buttons sichtbar; nach dem ersten Tipp auf die Flagge erscheinen „Wusste ich“ 👍 und „Noch üben“ 🔁.
  - AT-23.2: Beide Buttons sind gleich groß (≥ 88 px hoch) und gleich gestaltet, nur in Token-Farben (kein Rot/Grün).
  - AT-23.3: „Wusste ich“ → das nächste Wort erscheint verdeckt, die Buttons verschwinden; im Speicher steht für das alte Wort Box 1, `seen` 1.
  - AT-23.4: „Noch üben“ → nächstes Wort; im Speicher Box 0, `seen` 1.
  - AT-23.5: Kein Feedback: Nach dem Tipp erscheint kein zusätzlicher Text oder Hinweis; das nächste Wort ist innerhalb von 200 ms da.
  - AT-23.6: 12 Wörter hintereinander bewerten: nie dasselbe Wort innerhalb von 3 anderen; alle bewerteten Wörter stehen im Lernstand.
  - AT-23.7: Der Lernstand gilt pro Sprache: Bewertungen auf Französisch ändern den englischen Lernstand nicht.
  - AT-23.8: Das Erscheinen der Buttons verschiebt Karte, Flagge und Fremdwort nicht; alles bleibt im Bildschirm.
- [ ] **B-24 Avatar in der Runde**: Avatar links; Pose „zeigt“ bei neuem Wort, „freut“ nach Aufdecken; reiner Bildtausch; alle Posen vorgeladen.
  - AT-24.1: In der Lernrunde steht der gewählte Begleiter links neben der Karte (keine Überlappung), bei einem neuen Wort in der Pose „zeigt“.
  - AT-24.2: Nach dem Aufdecken wechselt er zu „freut“; weitere Tipps auf die Flagge ändern daran nichts.
  - AT-24.3: Beim nächsten Wort zeigt er wieder („zeigt“).
  - AT-24.4: Mimi zeigt Katzen-, Mots Pony-Bilder.
  - AT-24.5: Alle vier Posen des Begleiters sind nach dem Start der Runde geladen; der Avatar ist ≤ 440 px hoch, vollständig im Bildschirm und nicht animiert.
  - Hinweis: Die Avatar-Vorschau (`?vorschau=avatar`) entfällt; AT-03.2–03.4 laufen jetzt in der Lernrunde, AT-06.5 prüft, dass die Adresse die Startansicht zeigt.
- [ ] **B-25 Abbrechen**: [×] oben links, Long-Press 600 ms → Abschluss.
  - AT-25.1: [×] steht oben links, ist mindestens 88 × 88 px groß und unaufdringlich (weiß, dünner grauer Rand).
  - AT-25.2: Ein kurzer Tipp auf [×] beendet die Runde nicht.
  - AT-25.3: Gedrückt halten (≥ 600 ms) führt zum Abschluss.
  - AT-25.4: Loslassen vor 600 ms oder Wegziehen des Fingers bricht ab; erneutes Halten zählt neu.
  - AT-25.5: Während des Haltens ist [×] sichtbar gedrückt (Hintergrund `--lila-100`), danach wieder weiß.
  - AT-25.6: Bereits bewertete Wörter bleiben im Lernstand; das aktuelle, unbewertete Wort wird nicht gezählt.
  - AT-25.7: Während des Haltens füllt sich ein lila Ring um [×] im Uhrzeigersinn (nach ~300 ms etwa halb voll); beim Loslassen ist er sofort weg. Bei „Bewegung reduzieren“ ist er während des Haltens sofort voll.
  - Hinweis: Frühere Tests, die [×] nur antippen (B-06, B-12, B-22), halten es jetzt gedrückt.

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
