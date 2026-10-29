# Anforderungen – Mimi & Mots

## 1. Ziel und Zielgruppe
- **Nutzerin:** Erstklässlerin (6–7 Jahre), kann einfache Wörter lesen. Deutsche Sprachausgabe ist nicht nötig.
- **Gerät:** iPad, quer, als PWA vom Home-Bildschirm.
- **Ziel:** Spielerisch ein paar Wörter auf Englisch oder Französisch kennenlernen. Kurze Sessions, kein Leistungsdruck.
- **Nicht-Ziele:** Bewertung, Belohnung, Ranglisten, Accounts, Eltern-Statistiken, Schreiben/Tippen, Spracherkennung.

## 2. Didaktische Grundlagen
| Prinzip | Umsetzung |
|---|---|
| Abrufübung (Retrieval Practice) | Kind versucht das Wort erst selbst zu sagen, dann Auflösung per Flaggen-Tipp. |
| Duale Kodierung | Bild (Emoji) + gesprochenes Wort + geschriebenes Wort. |
| Verteiltes Wiederholen | Leitner-Boxen: Gewusstes kommt seltener, Ungewusstes öfter. |
| Dosierung neuer Inhalte | Max. 6 neue Wörter pro Session, gemischt mit bekannten. |
| Kurze Sessions | Timer (5 min), danach freundlicher Abschluss. |
| Keine extrinsische Belohnung | Kein Lob/Tadel, neutrale Selbsteinschätzung. Motivation durch Begleiter und Erfolgserleben. |
| Joint Attention | Avatar zeigt per Geste auf die Aufgabe. |
| Genus mitlernen (FR) | Französische Nomen mit bestimmtem Artikel (la pomme, le chat). |

## 3. Ablauf
```
Start → Lernrunde (Wort 1..n) → Timer = 0 → aktuelles Wort abschließen → Abschluss → Start
```

### 3.1 Startbildschirm
- Header: App-Icon + „Mimi & Mots“.
- **Begleiter:** zwei große Kacheln (Mimi, Mots) mit Bild (Pose „ruhig“) und Name.
- **Sprache:** zwei Kacheln mit Flagge (`flag_gb.png`, `flag_fr.png`), ohne Text.
- **Dauer:** eine Kachel „5 Min.“ mit kleinem Uhr-Symbol (Optik wie Timer). Ist vorausgewählt.
- **Auswahlzustand:** ausgewählt = dicker lila Rahmen (5 px, `--lila-700`) + Hintergrund `--lila-100`; nicht ausgewählt = dünner dunkelgrauer Rahmen (2 px, `--grau-700`) + weißer Hintergrund. Größe der Kacheln ändert sich nicht.
- **Play-Button** (rund, lila, ≥ 96 px) unten mittig. Aktiv, sobald alle drei Gruppen eine Auswahl haben.
- Letzte Auswahl (Begleiter, Sprache, Dauer) wird gespeichert und beim nächsten Start vorbelegt. Beim allerersten Start: Dauer vorbelegt, Begleiter und Sprache leer.
- Fragen bleiben als kurze Überschrift („Wer begleitet dich?“, „Welche Sprache?“, „Wie lange?“).

### 3.2 Lernrunde
**Layout (quer):**
```
┌──────────────────────────────────────────────────────┐
│ [×]                                          (Timer) │
│                                                      │
│  Avatar      ┌────────────────────┐   ┌─────────┐    │
│  (links,     │        🍎          │   │ Flagge  │    │
│   zeigt      │       Apfel        │   │ apple   │    │
│   nach       └────────────────────┘   └─────────┘    │
│   rechts)                                            │
│              [ 👍 Wusste ich ]   [ 🔁 Noch üben ]    │
└──────────────────────────────────────────────────────┘
```
1. **Neues Wort:** Emoji groß (~ 40 % Bildschirmhöhe), darunter deutsches Wort. Flaggen-Button groß, ohne Fremdwort. Avatar-Pose „zeigt“ (Richtung Karte/Flagge). Bewertungs-Buttons nicht sichtbar.
2. **Tipp auf Flagge:** Fremdwort erscheint unter/neben der Flagge, Audio wird einmal abgespielt. Avatar-Pose „freut“ (offener Mund, „spricht mit“).
3. **Erneuter Tipp auf Flagge:** Audio erneut (laufende Wiedergabe neu starten). Beliebig oft.
4. **Nach dem ersten Aufdecken** erscheinen zwei gleichwertige Buttons: „Wusste ich“ (👍) und „Noch üben“ (🔁). Beide in Lila-Tönen, gleiche Größe, kein Rot/Grün.
5. **Tipp auf einen der Buttons:** Lernstand aktualisieren, kein Feedback, direkt nächstes Wort (Übergang ≤ 200 ms).
- **Timer:** oben rechts, ~120 px, nicht interaktiv (siehe 3.4).
- **[×]** oben links, klein, beendet die Session (springt zum Abschluss). Langes Drücken (600 ms) gegen versehentliches Tippen.

### 3.3 Abschluss
- Avatar-Pose „winkt“, groß.
- Kurzer Text: „Viel Spaß beim Spielen!“ (o. ä., ohne Leistungsbezug).
- Button „Zurück“ (Haus-Icon) → Startbildschirm.
- Keine Zusammenfassung, keine Anzahl Wörter.

### 3.4 Timer
- Optik wie ein „Time Timer“: Kreisscheibe, lila Sektor schrumpft im Uhrzeigersinn bis 0, keine Ziffern, dezente Strichmarken.
- Startet mit dem ersten angezeigten Wort.
- Pausiert, wenn die App in den Hintergrund geht (`visibilitychange`), läuft beim Zurückkehren weiter.
- Bei 0: kein Abbruch, keine Veränderung der Lernrunde. Das aktuelle Wort läuft ganz normal weiter: Aufdecken, Vorlesen und erneutes Vorlesen beliebig oft. Erst nach Tipp auf „Wusste ich“/„Noch üben“ (Lernstand wird wie immer gespeichert) kommt der Abschluss statt eines neuen Worts.
- Läuft der Timer ab, bevor das aktuelle Wort aufgedeckt wurde, gilt dasselbe: Wort normal fertig machen.
- Timer-Ende ist still (kein Ton, kein Blinken). Optional: Scheibe zeigt leer.

### 3.5 Hochformat
- Overlay mit Avatar und Dreh-Symbol („iPad drehen“), App-State bleibt erhalten, Timer pausiert.

## 4. Avatare
| Pose | Mimi | Mots | Einsatz |
|---|---|---|---|
| ruhig | `cat_sitting.png` (sitzt, lächelt) | `pony_sitting.png` (sitzt) | Startauswahl, Hochformat-Overlay |
| zeigt | `cat_pointing.png` (Pfote nach rechts) | `pony_pointing.png` (Huf nach rechts) | neues Wort |
| freut | `cat_idle.png` (Mund offen) | `pony_idle.png` (steht, Mund offen) | nach Aufdecken |
| winkt | `cat_waving.png` (zwinkert, winkt) | `pony_waving.png` (winkt) | Abschluss |

- Statische Bilder, Bildtausch ohne Animation. Avatar steht links, damit Zeigegesten nach rechts zur Aufgabe gehen.
- Dateien liegen als transparente PNGs (384 × 440) vor und werden unverändert übernommen. Alle Posen haben dieselbe Leinwandgröße → in identischer Box darstellen, dann springt der Bildtausch nicht.
- Darstellungsgröße: max. ca. 440 px Höhe. Für schärfere Darstellung auf Retina können später höher aufgelöste Versionen mit gleichem Dateinamen eingesetzt werden.

## 5. Wortauswahl (Scheduler)
- Lernstand **pro Sprache und Wort**: `{ box: 0..4, seen: number, lastSeenAt: ISO }`. Wörter ohne Eintrag gelten als „neu“.
- „Wusste ich“ → `box = min(box + 1, 4)`. „Noch üben“ → `box = 0`.
- Auswahl gewichtet zufällig: Gewicht Box 0 = 8, 1 = 5, 2 = 3, 3 = 2, 4 = 1.
- Pro Session max. 6 neue Wörter. Sind weniger als 6 bekannte Wörter vorhanden, wird mit neuen aufgefüllt.
- Dasselbe Wort frühestens nach 3 anderen Wörtern erneut.
- Scheduler ist eine reine Funktion (Seed injizierbar) und vollständig unit-getestet.

## 6. Audio
- **Anforderung:** hochwertige, natürliche Aussprache, kostenlos, offline, klein.
- **Lösung:** Audio wird einmalig vor dem Build lokal erzeugt und als statische Dateien ausgeliefert/gecacht.
  - TTS: **Kokoro** (Open Source, Apache-2.0), Stimmen: EN `bf_emma` (britisch, passend zur UK-Flagge), FR `ff_siwis`. Alternative: **Piper** (fr_FR-siwis / en_GB-Stimmen). Lizenz der jeweiligen Stimme vor Nutzung prüfen.
  - Nachbearbeitung (ffmpeg): Stille trimmen, 150 ms Vorlauf, Lautheit normalisieren (−16 LUFS), MP3 mono 64 kbit/s.
  - Größe: ~8 KB/Wort → ~1 MB für 50 Wörter × 2 Sprachen.
  - Jede Datei wird einmal angehört; schlechte Dateien neu erzeugen (anderer Satzkontext/Stimme) oder durch eigene Aufnahme ersetzen. Override-Ordner `audio-overrides/` hat Vorrang.
- **Laufzeit:** `HTMLAudioElement`, Dateien der Session vorladen. Fehlt eine Datei → Fallback Web Speech API (`lang` en-GB/fr-FR, beste verfügbare Stimme).
- Skript `scripts/generate_audio.py` erzeugt nur fehlende Dateien anhand `src/data/words.ts` (bzw. daraus exportiertem JSON).

## 7. Persistenz
- `localStorage`, Schlüssel `mimi-mots:v1`:
```json
{ "version": 1,
  "settings": { "companion": "mimi", "language": "fr", "durationMin": 5 },
  "progress": { "fr": { "apfel": { "box": 2, "seen": 5, "lastSeenAt": "…" } }, "en": {} } }
```
- Beschädigte/fehlende Daten → Defaults, kein Absturz. Versionsfeld für spätere Migration.
- Hinweis: Als Home-Bildschirm-App ist der Speicher unter iOS stabil; im Safari-Tab kann er nach längerer Nichtnutzung gelöscht werden.

## 8. Design
- Aufgeräumt, einheitlich, süß, Lila-basiert (Tokens in `CLAUDE.md`).
- Große, runde Kacheln mit weichen Schatten; viel Weißraum; maximal 3 Gruppen pro Ansicht.
- Schrift `ui-rounded`; Wortkarte: deutsches Wort ~48 px, Fremdwort ~56 px, Überschriften ~28 px.
- Kontrast Text ≥ 4.5:1.
- Keine Ablenkung: keine Hintergrundmuster, keine Deko-Elemente während der Lernrunde.

## 9. PWA / Technik
- Manifest: Name „Mimi & Mots“, `display: standalone`, `theme_color` `#6A4C9C`, `background_color` `#F8F4FB`, Icons 180/192/512/maskable.
- Service Worker precacht alle Assets inkl. Audio. Update: neue Version wird beim nächsten Start aktiv (kein Popup für das Kind).
- Hosting: **GitHub Pages** (kostenlos, HTTPS). Deploy per GitHub Action bei Push auf `main`. Vite `base` auf Repo-Pfad setzen.
- App-Icon: `icons/icon.svg` (lila Verlauf, weiße Sprechblase mit Katzen- und Ponyohr, lila Herz wie auf dem Halstuch). Austausch: SVG ersetzen und `npm run icons` ausführen.
- Performance: Startbildschirm < 1 s nach Cache, keine Layout-Sprünge.

## 10. Anhang: Wortliste v1
FR-Nomen mit Artikel; EN ohne Artikel; Farben ohne Artikel.

| id | Emoji | DE | EN | FR |
|---|---|---|---|---|
| apfel | 🍎 | Apfel | apple | la pomme |
| banane | 🍌 | Banane | banana | la banane |
| erdbeere | 🍓 | Erdbeere | strawberry | la fraise |
| birne | 🍐 | Birne | pear | la poire |
| kirsche | 🍒 | Kirsche | cherry | la cerise |
| zitrone | 🍋 | Zitrone | lemon | le citron |
| karotte | 🥕 | Karotte | carrot | la carotte |
| brot | 🍞 | Brot | bread | le pain |
| kaese | 🧀 | Käse | cheese | le fromage |
| ei | 🥚 | Ei | egg | l'œuf |
| milch | 🥛 | Milch | milk | le lait |
| kuchen | 🍰 | Kuchen | cake | le gâteau |
| eis | 🍦 | Eis | ice cream | la glace |
| katze | 🐱 | Katze | cat | le chat |
| hund | 🐶 | Hund | dog | le chien |
| pferd | 🐴 | Pferd | horse | le cheval |
| maus | 🐭 | Maus | mouse | la souris |
| hase | 🐰 | Hase | rabbit | le lapin |
| vogel | 🐦 | Vogel | bird | l'oiseau |
| fisch | 🐟 | Fisch | fish | le poisson |
| kuh | 🐮 | Kuh | cow | la vache |
| schwein | 🐷 | Schwein | pig | le cochon |
| ente | 🦆 | Ente | duck | le canard |
| baer | 🐻 | Bär | bear | l'ours |
| loewe | 🦁 | Löwe | lion | le lion |
| elefant | 🐘 | Elefant | elephant | l'éléphant |
| schmetterling | 🦋 | Schmetterling | butterfly | le papillon |
| frosch | 🐸 | Frosch | frog | la grenouille |
| ball | ⚽ | Ball | ball | le ballon |
| haus | 🏠 | Haus | house | la maison |
| auto | 🚗 | Auto | car | la voiture |
| buch | 📖 | Buch | book | le livre |
| baum | 🌳 | Baum | tree | l'arbre |
| blume | 🌸 | Blume | flower | la fleur |
| sonne | ☀️ | Sonne | sun | le soleil |
| mond | 🌙 | Mond | moon | la lune |
| stern | ⭐ | Stern | star | l'étoile |
| schuh | 👟 | Schuh | shoe | la chaussure |
| hut | 👒 | Hut | hat | le chapeau |
| fahrrad | 🚲 | Fahrrad | bike | le vélo |
| boot | ⛵ | Boot | boat | le bateau |
| zug | 🚂 | Zug | train | le train |
| regenschirm | ☂️ | Regenschirm | umbrella | le parapluie |
| herz | ❤️ | Herz | heart | le cœur |
| rot | 🔴 | rot | red | rouge |
| blau | 🔵 | blau | blue | bleu |
| gelb | 🟡 | gelb | yellow | jaune |
| gruen | 🟢 | grün | green | vert |
| lila | 🟣 | lila | purple | violet |
| orange | 🟠 | orange | orange | orange |

## 11. Entscheidungen
- 2026-10-29: Wortliste v1 bestätigt.
- 2026-10-29: Keine deutsche Sprachausgabe (Kind liest).
- 2026-10-29: Letztes Wort nach Timer-Ablauf läuft unverändert inkl. Vorlesen; Abschluss erst nach Selbsteinschätzung.
- 2026-10-29: Avatare und Flaggen als gelieferte transparente PNGs, keine Aufbereitung.
- 2026-10-29: Hosting GitHub Pages.
- 2026-10-29: App-Icon als austauschbares SVG generiert.
- 2026-10-29: Assets aus dem Repo-Root nach `public/avatars/`, `public/flags/`, `public/icons/` verschoben.
- 2026-10-29: Wortliste liegt als `src/data/words.json` (Quelle für App und Audio-Skript), `words.ts` liefert Typ und Zugriff. Kein separater JSON-Export nötig.
- 2026-10-29: Takt neuer Wörter (§5): Solange weniger als 6 Wörter bekannt sind, wird mit neuen aufgefüllt; sonst ist jedes 3. Wort neu, bis 6 neue eingeführt sind. Bekannte Wörter werden nach Leitner-Box gewichtet. Grund: Mit „neues Wort als gewichteter Platz“ kamen in späteren Sessions nur noch 2–3 neue Wörter.
- 2026-10-29: Arbeit in Feature-Branches mit Pull Requests; Akzeptanztests vor der Umsetzung in `backlog.md`; PR erst nach lokaler Abnahme.

## 12. Später (nicht in v1)
- Weitere Dauern (3/10 min), weitere Sprachen.
- Themenwahl (Tiere, Essen …).
- Versteckter Elternbereich (Lernstand zurücksetzen, Wortliste).
- Eigene Illustrationen statt Emoji.
