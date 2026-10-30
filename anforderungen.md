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
| Kurze Sessions | Timer (3 oder 7 min), danach freundlicher Abschluss. |
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
- **Sprache:** flache Kacheln mit Flagge, ohne Text, im 2 × 2-Raster: Englisch (`flag_gb.svg`), Französisch (`flag_fr.svg`), Japanisch (`flag_jp.svg`, ausgegraut, noch nicht wählbar), vierter Platz frei.
- **Dauer:** zwei flache Kacheln untereinander, nur mit Uhr-Symbol (Optik wie Timer, Sektor zeigt 3 bzw. 7 Minuten), ohne Text. 3 Minuten ist beim Erststart vorausgewählt.
- **Kachelgrößen:** Kacheln einer Gruppe sind gleich groß; Sprach- und Dauer-Kacheln sind halb so hoch wie die Begleiter-Kacheln.
- **Auswahlzustand:** ausgewählt = dicker lila Rahmen (5 px, `--lila-700`) + Hintergrund `--lila-100`; nicht ausgewählt = dünner dunkelgrauer Rahmen (2 px, `--grau-700`) + weißer Hintergrund. Größe der Kacheln ändert sich nicht.
- **Play-Button** (rund, lila, ≥ 96 px) unten mittig. Aktiv, sobald alle drei Gruppen eine Auswahl haben.
- Letzte Auswahl (Begleiter, Sprache, Dauer) wird gespeichert und beim nächsten Start vorbelegt. Beim allerersten Start: Dauer vorbelegt, Begleiter und Sprache leer.
- Fragen bleiben als kurze Überschrift („Wer soll dich begleiten?“, „In welcher Sprache?“, „Wie lange?“).

### 3.2 Lernrunde
**Layout (quer):**
```
┌──────────────────────────────────────────────────────┐
│ [×]          [Icon] Mimi & Mots            (Timer)  │  ← Kopfleiste
├──────────────────────────────────────────────────────┤
│             ┌──────────────┐  ┌──────────────┐        │
│             │      🍎       │  │   Flagge     │        │
│  Avatar     │              │  │   apple      │        │
│  (links     │    Apfel     │  │    (🔊)      │        │
│   unten,    └──────────────┘  └──────────────┘        │
│   zeigt →)          (👍)        (🔁)                  │
└──────────────────────────────────────────────────────┘
```
- **Kopfleiste** wie auf dem Startbildschirm (App-Icon + „Mimi & Mots“), zusätzlich links [×] und rechts der Timer.
- **Begleiter** groß links unten, zeigt nach rechts auf die Karten.
1. **Neues Wort:** Zwei gleich große Karten nebeneinander. Links: Emoji groß (~ 40 % Bildschirmhöhe), darunter deutsches Wort. Rechts: Flagge der Sprache (nur Anzeige), Platz für das Fremdwort (noch leer) und ein runder lila Lautsprecher-Button (🔊). Avatar-Pose „zeigt“ (Richtung Karte/Flagge). Bewertungs-Buttons nicht sichtbar.
2. **Tipp auf den Lautsprecher:** Fremdwort erscheint in der rechten Karte zwischen Flagge und Lautsprecher, Audio wird einmal abgespielt. Avatar-Pose „freut“ (offener Mund, „spricht mit“).
3. **Erneuter Tipp auf den Lautsprecher:** Audio erneut (laufende Wiedergabe neu starten). Beliebig oft.
4. **Nach dem ersten Aufdecken** erscheinen zwei gleichwertige runde lila Buttons wie der Play-Button, nur mit Symbol: „Wusste ich“ (👍) und „Noch üben“ (🔁). Gleiche Größe, kein Text, kein Rot/Grün.
5. **Tipp auf einen der Buttons:** Lernstand aktualisieren, kein Feedback, direkt nächstes Wort (Übergang ≤ 200 ms).
- **Timer:** rechts in der Kopfleiste, ~88 px, nicht interaktiv (siehe 3.4).
- **[×]** links in der Kopfleiste, klein, beendet die Session (springt zum Abschluss). Langes Drücken (600 ms) gegen versehentliches Tippen.

### 3.3 Abschluss
- Avatar-Pose „winkt“, groß.
- Kurzer Text: „Bis zum nächsten Mal!“ (o. ä., ohne Leistungsbezug).
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
  - TTS: EN **Piper** `en_US-ljspeech-high` (LJ Speech, public domain), FR **Kokoro** `ff_siwis` (Apache-2.0), JA **VOICEVOX** 冥鳴ひまり (Namensnennung „VOICEVOX:冥鳴ひまり“). Lizenz der jeweiligen Stimme vor Nutzung prüfen.
  - Nachbearbeitung (ffmpeg): Stille trimmen, 150 ms Vorlauf, Lautheit normalisieren (−16 LUFS), MP3 mono 64 kbit/s.
  - Größe: ~8 KB/Wort → ~1 MB für 50 Wörter × 2 Sprachen.
  - Jede Datei wird einmal angehört; schlechte Dateien neu erzeugen (anderer Satzkontext/Stimme) oder durch eigene Aufnahme ersetzen. Override-Ordner `audio-overrides/` hat Vorrang.
- **Laufzeit:** `HTMLAudioElement`, Dateien der Session vorladen. Fehlt eine Datei → Fallback Web Speech API (`lang` en-GB/fr-FR/ja-JP, beste verfügbare Stimme).
- Skript `scripts/generate_audio.py` erzeugt nur fehlende Dateien anhand `src/data/words.ts` (bzw. daraus exportiertem JSON).

## 7. Persistenz
- `localStorage`, Schlüssel `mimi-mots:v1`:
```json
{ "version": 1,
  "settings": { "companion": "mimi", "language": "fr", "durationMin": 5 },
  "progress": { "fr": { "apfel": { "box": 2, "seen": 5, "lastSeenAt": "…" } }, "en": {} },
  "rest": { "sleeping": ["mimi"], "usedDurations": [3], "since": "2026-10-30" } }
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
FR-Nomen mit Artikel; EN ohne Artikel; Farben ohne Artikel. JA in üblicher Schreibweise (Kanji, Hiragana oder Katakana), dazu die Kana-Lesung für die Aussprache.

| id | Emoji | DE | EN | FR | JA | JA (Lesung) |
|---|---|---|---|---|---|---|
| apfel | 🍎 | Apfel | apple | la pomme | りんご | りんご |
| banane | 🍌 | Banane | banana | la banane | バナナ | バナナ |
| erdbeere | 🍓 | Erdbeere | strawberry | la fraise | いちご | いちご |
| birne | 🍐 | Birne | pear | la poire | 梨 | なし |
| kirsche | 🍒 | Kirsche | cherry | la cerise | さくらんぼ | さくらんぼ |
| zitrone | 🍋 | Zitrone | lemon | le citron | レモン | レモン |
| karotte | 🥕 | Karotte | carrot | la carotte | にんじん | にんじん |
| brot | 🍞 | Brot | bread | le pain | パン | パン |
| kaese | 🧀 | Käse | cheese | le fromage | チーズ | チーズ |
| ei | 🥚 | Ei | egg | l'œuf | 卵 | たまご |
| milch | 🥛 | Milch | milk | le lait | 牛乳 | ぎゅうにゅう |
| kuchen | 🍰 | Kuchen | cake | le gâteau | ケーキ | ケーキ |
| eis | 🍦 | Eis | ice cream | la glace | アイス | アイス |
| katze | 🐱 | Katze | cat | le chat | 猫 | ねこ |
| hund | 🐶 | Hund | dog | le chien | 犬 | いぬ |
| pferd | 🐴 | Pferd | horse | le cheval | 馬 | うま |
| maus | 🐭 | Maus | mouse | la souris | ねずみ | ねずみ |
| hase | 🐰 | Hase | rabbit | le lapin | うさぎ | うさぎ |
| vogel | 🐦 | Vogel | bird | l'oiseau | 鳥 | とり |
| fisch | 🐟 | Fisch | fish | le poisson | 魚 | さかな |
| kuh | 🐮 | Kuh | cow | la vache | 牛 | うし |
| schwein | 🐷 | Schwein | pig | le cochon | 豚 | ぶた |
| ente | 🦆 | Ente | duck | le canard | カモ | カモ |
| baer | 🐻 | Bär | bear | l'ours | 熊 | くま |
| loewe | 🦁 | Löwe | lion | le lion | ライオン | ライオン |
| elefant | 🐘 | Elefant | elephant | l'éléphant | 象 | ぞう |
| schmetterling | 🦋 | Schmetterling | butterfly | le papillon | ちょうちょ | ちょうちょ |
| frosch | 🐸 | Frosch | frog | la grenouille | かえる | かえる |
| ball | ⚽ | Ball | ball | le ballon | ボール | ボール |
| haus | 🏠 | Haus | house | la maison | 家 | いえ |
| auto | 🚗 | Auto | car | la voiture | 車 | くるま |
| buch | 📖 | Buch | book | le livre | 本 | ほん |
| baum | 🌳 | Baum | tree | l'arbre | 木 | き |
| blume | 🌸 | Blume | flower | la fleur | 花 | はな |
| sonne | ☀️ | Sonne | sun | le soleil | 太陽 | たいよう |
| mond | 🌙 | Mond | moon | la lune | 月 | つき |
| stern | ⭐ | Stern | star | l'étoile | 星 | ほし |
| schuh | 👟 | Schuh | shoe | la chaussure | 靴 | くつ |
| hut | 👒 | Hut | hat | le chapeau | 帽子 | ぼうし |
| fahrrad | 🚲 | Fahrrad | bike | le vélo | 自転車 | じてんしゃ |
| boot | ⛵ | Boot | boat | le bateau | 船 | ふね |
| zug | 🚂 | Zug | train | le train | 電車 | でんしゃ |
| regenschirm | ☂️ | Regenschirm | umbrella | le parapluie | 傘 | かさ |
| herz | ❤️ | Herz | heart | le cœur | ハート | ハート |
| rot | 🔴 | rot | red | rouge | 赤 | あか |
| blau | 🔵 | blau | blue | bleu | 青 | あお |
| gelb | 🟡 | gelb | yellow | jaune | 黄色 | きいろ |
| gruen | 🟢 | grün | green | vert | 緑 | みどり |
| lila | 🟣 | lila | purple | violet | 紫 | むらさき |
| orange | 🟠 | orange | orange | orange | オレンジ | オレンジ |

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
- 2026-10-29: Ausnahme von der 200-ms-Regel (Leitprinzip 4): Beim Gedrückthalten von [×] füllt sich ein Fortschrittsring über 600 ms (= Long-Press-Dauer). Er ist Rückmeldung auf eine Bedienung, keine Deko; bei „Bewegung reduzieren“ ohne Animation.
- 2026-10-29: UI-Überarbeitung (B-26): Dauer 5 oder 10 Minuten (nur Uhr-Symbol); Sprachkacheln flach im 2 × 2-Raster mit Japanisch ausgegraut; Kopfleiste auch in der Lernrunde; Lautsprecher-Button statt Tipp auf die Flagge; Bewertung als runde lila Buttons nur mit Symbol. Kacheln sind nur noch innerhalb einer Gruppe gleich groß.
- 2026-10-29: Flaggen GB/FR als SVG statt der gelieferten PNGs (214 × 143 px waren auf dem Retina-iPad in der großen Darstellung unscharf); alle Flaggen im Seitenverhältnis 3 : 2.
- 2026-10-29: Audio (M3): Kokoro über `kokoro-onnx` (gleiches Modell, ohne PyTorch); Python-Umgebung `.venv`, Modell in `.models/` (beides nicht eingecheckt). Beim Start einer Runde werden alle Audiodateien der gewählten Sprache vorgeladen (~450 KB). Hörprüfung über die Abhörseite `tools/hoerpruefung.html` (nur Dev-Server) und `audio-check.md`.
- 2026-10-29: Aussprache: Französisch aus vorproduzierten Kokoro-MP3s (`ff_siwis`, Hörprüfung ok). Englisch vorerst live über die Gerätestimme (Web Speech, en-GB): Kokoro `bf_emma` sprach im Klangvergleich bei jedem Wort einen falschen Anfangslaut mit (z. B. „egg“ → „leg“); weder Einblenden noch Satzkontext halfen. Pro Sprache steuert `audioFiles` in `src/data/languages.ts`, ob MP3s genutzt werden. Später prüfen: Piper (en_GB) oder eigene Aufnahmen.
- 2026-10-29: Timer-Zifferblatt (B-41): Die volle Scheibe entspricht der gewählten Dauer (5 bzw. 10 Minuten), nicht einer 60-Minuten-Skala wie beim echten Time Timer – auf 120 px wäre ein 30°-Keil für ein Kind kaum ablesbar. Die Uhr-Symbole der Startseite zeigen weiterhin 5 bzw. 10 von 60 Minuten, damit sich die Kacheln unterscheiden.
- 2026-10-29: Lernansicht überarbeitet (B-27): Dauer 3/7 statt 5/10 Minuten (wirkte zu lang; gespeicherte 5/10 werden zu 3/7). [×] und Timer sitzen fest in der Kopfleiste (dafür ist die Kopfleiste auf allen Seiten etwas höher, Timer 88 statt ~120 px). Fremdwort, Flagge und Lautsprecher stehen in einer eigenen Karte, gleich groß wie die Karte mit dem deutschen Wort, damit beide Wörter gleich gewichtet sind. Begleiter größer links unten.
- 2026-10-29: Texte angepasst: Sprachgruppe „In welcher Sprache?“ statt „Welche Sprache?“, Abschluss „Bis zum nächsten Mal!“ statt „Viel Spaß beim Spielen!“.
- 2026-10-29: Arbeit in Feature-Branches mit Pull Requests; Akzeptanztests vor der Umsetzung in `backlog.md`; PR erst nach lokaler Abnahme.
- 2026-10-30: Japanisch (B-67): dritte Lernsprache. Angezeigt wird die übliche Schreibweise (Kanji, Hiragana oder Katakana, z. B. 猫, いちご, バナナ), ohne Lesehilfe. Für die Aussprache gibt es je Wort die Kana-Lesung (`jaKana`), damit die Synthese Kanji nicht falsch liest (月 → つき). Stimme: VOICEVOX 冥鳴ひまり – kostenlos, auch kommerziell, Namensnennung „VOICEVOX:冥鳴ひまり“ (README); die japanischen Kokoro-Stimmen sind nur mit C bis C+ bewertet, No.7 wäre nur nicht-kommerziell. VOICEVOX wird nicht automatisch geladen, weil man beim Download den Nutzungsbedingungen zustimmen muss. Wortwahl nach Bild: 🦆 カモ, ⛵ 船, 🚂 電車, 🍦 アイス.
- 2026-10-30: Silbenfarben (B-66): Das deutsche Wort wird silbenweise abwechselnd in `--lila-900` und `--beere-600` (#B03A75, Himbeere; Kontrast auf Weiß 5,7 : 1) gefärbt – Silbenmethode für Leseanfänger. Die Sprechsilben stehen von Hand gepflegt in `words.json` (`syllables`), weil automatische Trennung bei Grundschul-Silben (z. B. „E-le-fant“, „o-ran-ge“) unzuverlässig ist. Nebenbei behoben: „Schmetterling“ war auf 1024 × 768 breiter als die Wortkarte; die Schrift des deutschen Worts ist jetzt höchstens 48 px und schrumpft mit der Kartenbreite (`min(48px, 14cqi)`).
- 2026-10-30: Schlafende Begleiter (B-65): Mit dem Erreichen der Abschlussseite (Zeitablauf oder [×]) schläft der Begleiter ein und die gespielte Dauer ist verbraucht; beides ist auf der Startseite ausgegraut, der Begleiter mit Schlafbild. Ist nur noch ein Begleiter bzw. eine Dauer frei, ist sie vorausgewählt. Schlafen beide (oder sind alle Dauern verbraucht), kommt statt der Startseite die Schlafseite mit „Gute Nacht und bis morgen!“. Aufwecken nur durch 600 ms Halten des Icons in der Kopfleiste der Schlafseite, absichtlich ohne Hinweis. An einem späteren Tag (lokales Datum) wachen alle von selbst auf – beim App-Start und beim Zurückholen aus dem Hintergrund. Gespeichert in `rest` (mit `since` = Tag des Einschlafens) im selben localStorage-Schlüssel (ältere Daten ohne `rest` = alle wach). `both_sleeping.png` ist die gelieferte Grafik `cat_and_pony_sleeping.png`: Sie hatte ein ins Bild gemaltes Schachbrett statt echter Transparenz; das wurde per Flutfüllung vom Rand entfernt, zugeschnitten und auf 1213 × 663 px verkleinert (1,5 MB → 250 KB). Einzelne Schlafbilder sind noch Platzhalter (entsättigte Sitz-Pose mit „Zzz“).
- 2026-10-29: Englisch aus vorproduzierten MP3s mit Piper `en_US-ljspeech-high` (B-64), ersetzt die Gerätestimme (klang unter Linux schlecht und hängt auf dem iPad von den installierten Stimmen ab). Im Klangvergleich fielen alle englischen Kokoro-Stimmen (`bf_*`, `bm_*`, `am_*`) durch. Unter den Piper-Stimmen fielen die auf Lessac aufbauenden (u. a. Amy) aus Lizenzgründen weg (Blizzard-2013-Daten nur für Forschung); ljspeech ist public domain. Die Stimme ist amerikanisch, die Flagge bleibt vorerst britisch. Der Web-Speech-Fallback bleibt en-GB.

## 12. Später (nicht in v1)
- Weitere Dauern (z. B. 3 min), weitere Sprachen (Japanisch ist in der Startauswahl schon ausgegraut vorgesehen).
- Themenwahl (Tiere, Essen …).
- Versteckter Elternbereich (Lernstand zurücksetzen, Wortliste).
- Eigene Illustrationen statt Emoji.
