# Anforderungen – Mimi & Mots

Beschreibt den aktuellen Stand der App. Frühere Fassungen und die vollständige Chronik der Entscheidungen: `docs/archiv/entscheidungen-chronik.md` (nur bei Bedarf lesen).

## 1. Ziel und Zielgruppe
- **Nutzerin:** Erstklässlerin (6–7 Jahre), kann einfache Wörter lesen. Deutsche Sprachausgabe ist nicht nötig.
- **Gerät:** iPad quer, als PWA vom Home-Bildschirm; iPhone quer mit kompaktem Layout.
- **Ziel:** Spielerisch ein paar Wörter auf Englisch, Französisch, Japanisch oder Italienisch kennenlernen. Kurze Runden, kein Leistungsdruck.
- **Nicht-Ziele:** Bewertung, Belohnung, Ranglisten, Accounts, Eltern-Statistiken, Schreiben/Tippen, Spracherkennung.

## 2. Didaktische Grundlagen
| Prinzip | Umsetzung |
|---|---|
| Abrufübung (Retrieval Practice) | Sprechen: Kind sagt das Wort erst selbst, dann Auflösung per Lautsprecher. Hören: Kind überlegt die Bedeutung, dann Auflösung per Auge-Button. |
| Duale Kodierung | Bild (Emoji) + gesprochenes Wort + geschriebenes Wort. |
| Verteiltes Wiederholen | Leitner-Boxen: Gewusstes kommt seltener, Ungewusstes öfter. |
| Dosierung neuer Inhalte | Max. 8 neue Wörter pro Runde, gemischt mit bekannten; Bremse bei vielen ungefestigten Wörtern. |
| Kurze Runden | Timer (Standard 5 Minuten), danach freundlicher Abschluss; der Begleiter schläft bis morgen. |
| Keine extrinsische Belohnung | Kein Lob/Tadel, neutrale Selbsteinschätzung. Motivation durch Begleiter und Erfolgserleben. |
| Joint Attention | Avatar zeigt per Geste auf die Aufgabe. |
| Lesen lernen | Deutsches Wort in Silbenfarben (Silbenmethode). |
| Genus mitlernen (FR, IT) | Nomen mit bestimmtem Artikel (la pomme, il gatto). |

## 3. Ablauf
```
Begrüßung → Start → Lernrunde (Tutorial beim ersten Mal, dann Wort 1..n) → Timer = 0 → aktuelles Wort abschließen → Abschluss → Start (bzw. Schlafseite)
```
- Beim Öffnen der App kommt zuerst die Begrüßung; schlafen beide Begleiter, stattdessen die Schlafseite. Nach dem Abschluss, nach Abbruch im Tutorial und nach dem Elternbereich geht es zur Auswahl (bzw. Schlafseite), nicht zur Begrüßung – außer der Elternbereich wurde auf der Begrüßung geöffnet.
- Ohne Namen ist die Auswahl nicht erreichbar: Es kommt erst die Namensfrage.
- **Kopfleiste** auf allen Seiten gleich hoch: App-Icon + „Mimi & Mots“ mittig; der Name des Kinds klein oben rechts (nicht auf der Begrüßung und nicht im Elternbereich). Halten des Icons (600 ms) öffnet auf Begrüßung, Start und Schlafseite den Elternbereich – ohne Hinweis, keine Schaltfläche.

### 3.0 Begrüßung
- Beide Begleiter links und rechts: wache winken, schlafende zeigen ihr Schlafbild (nur Bildtausch).
- **Ohne Namen** (Erststart): „Wie heißt du?“, Eingabefeld (höchstens 16 Zeichen, tippt ggf. ein Elternteil) und runder lila Button mit Haken („Fertig“, ausgegraut bei leerer Eingabe; Enter wirkt wie „Fertig“). Danach die Begrüßung mit Namen.
- **Mit Namen:** „Hallo Lina!“ und ein runder lila Button mit Pfeil („Weiter“) zur Auswahl.

### 3.1 Startbildschirm (Auswahl)
- **Begleiter** („Wer soll dich begleiten?“): zwei große Kacheln (Mimi, Mots) mit Bild (Pose „ruhig“) und Name. Ein schlafender Begleiter ist ausgegraut, nicht wählbar und zeigt sein Schlafbild.
- **Sprache** („In welcher Sprache?“): flache Kacheln nur mit Flagge, in einem Raster mit höchstens zwei Spalten, immer zwei Kachelzeilen hoch: Englisch (`flag_gb.svg`), Französisch (`flag_fr.svg`), Japanisch (`flag_jp.svg`), Italienisch (`flag_it.svg`). Es erscheinen nur Sprachen, die im Elternbereich eingeschaltet sind und Wörter haben (§5); ausgeschaltete fehlen ganz.
- **Modus** („Bei was?“): zwei flache Kacheln untereinander, nur Symbol: Kopf mit Schallwellen = Sprechen, Ohr = Hören.
- **Kachelgrößen:** Kacheln einer Gruppe sind gleich groß; Sprach- und Modus-Kacheln sind halb so hoch wie die Begleiter-Kacheln.
- **Auswahlzustand:** ausgewählt = dicker lila Rahmen (5 px, `--lila-700`) + Hintergrund `--lila-100`; nicht ausgewählt = dünner dunkelgrauer Rahmen (2 px, `--grau-700`) + weißer Hintergrund. Größe der Kacheln ändert sich nicht.
- **Play-Button** (rund, lila, ≥ 96 px) unten mittig. Aktiv, sobald alle drei Gruppen eine Auswahl haben.
- Letzte Auswahl (Begleiter, Sprache, Modus) wird gespeichert und vorbelegt. Erststart: nur der Modus Sprechen ist vorbelegt. Ist nur noch ein Begleiter wach bzw. nur eine Sprache spielbar, ist sie vorausgewählt.
- Das Kind wählt keine Dauer; sie stellen Eltern im Elternbereich ein (§3.7).

### 3.2 Lernrunde – Sprechen
**Layout (quer):**
```
┌──────────────────────────────────────────────────────┐
│ [×]          [Icon] Mimi & Mots             Lina    │  ← Kopfleiste
├──────────────────────────────────────────────────────┤
│             ┌──────────────┐  ┌──────────────┐        │
│             │      🍎       │  │   Flagge     │        │
│  Avatar     │              │  │   apple      │        │
│  (links     │    Apfel     │  │    (🔊)      │        │
│   unten,    └──────────────┘  └──────────────┘        │
│   zeigt →) (Timer)  (👍)        (🔁)                  │
└──────────────────────────────────────────────────────┘
```
- **Kopfleiste:** links [×], rechts der Name.
- **Begleiter** groß links unten (≥ 40 % der Bildschirmhöhe, ≤ 440 px), zeigt nach rechts auf die Karten. **Timer** rechts unten am Begleiter, auf Höhe der Bewertung (88 px, nicht interaktiv, siehe §3.4).
1. **Neues Wort:** Zwei gleich große Karten nebeneinander. Links: Emoji groß (ca. 35 % der Bildschirmhöhe), darunter das deutsche Wort in Silbenfarben. Rechts: Flagge der Sprache (nur Anzeige), Platz für das Fremdwort (noch leer) und ein runder lila Lautsprecher-Button (🔊). Avatar-Pose „zeigt“. Bewertungs-Buttons nicht sichtbar.
2. **Tipp auf den Lautsprecher:** Fremdwort erscheint in der rechten Karte zwischen Flagge und Lautsprecher, Audio wird einmal abgespielt. Avatar-Pose „freut“.
3. **Erneuter Tipp auf den Lautsprecher:** Audio von vorn. Beliebig oft.
4. **Nach dem ersten Aufdecken** erscheinen mittig unter den Karten zwei gleichwertige runde lila Buttons, nur mit Symbol: „Wusste ich“ (👍) und „Noch üben“ (🔁). Gleiche Größe, kein Text, kein Rot/Grün.
5. **Tipp auf einen der Buttons:** Lernstand aktualisieren, kein Feedback, direkt nächstes Wort (Übergang ≤ 200 ms); eine laufende Wiedergabe verstummt.
- Deutsches Wort und Fremdwort haben gleiche Schriftgröße und -stärke; nur zu lange Fremdwörter werden kleiner (notfalls getrennt).
- **[×]** beendet die Runde (Abschluss) nur durch Gedrückthalten (600 ms, mit sich füllendem Ring) – gegen versehentliches Tippen.

### 3.3 Lernrunde – Hören
- Gleiche Kopfleiste, Begleiter und Timer wie beim Sprechen; die Karten sind getauscht.
- Mittlere Karte: Flagge, Fremdwort (sofort sichtbar) und Lautsprecher. Das Wort wird beim Erscheinen einmal abgespielt, der Lautsprecher spielt es erneut.
- Rechte Karte: zunächst leer bis auf einen runden lila Auge-Button („Zeig mir das deutsche Wort“). Ein Tipp deckt Bild und deutsches Wort (Silbenfarben) auf; danach wie beim Sprechen „Wusste ich“ / „Noch üben“.
- Eigener Lernstand je Modus (§5).

### 3.4 Timer
- Optik wie ein „Time Timer“: Kreisscheibe mit 12 dezenten Strichmarken, lila Sektor schrumpft im Uhrzeigersinn bis 0, keine Ziffern. Die volle Scheibe entspricht der eingestellten Rundendauer.
- Startet mit dem ersten echten Wort (im Tutorial steht die Uhr).
- Pausiert, wenn die App in den Hintergrund geht (`visibilitychange`) oder im Hochformat, läuft danach weiter.
- Bei 0: kein Abbruch, keine Veränderung der Lernrunde. Das aktuelle Wort läuft ganz normal weiter: Aufdecken, Vorlesen und erneutes Vorlesen beliebig oft. Erst nach „Wusste ich“/„Noch üben“ (Lernstand wird wie immer gespeichert) kommt der Abschluss statt eines neuen Worts – auch wenn das Wort beim Ablauf noch nicht aufgedeckt war.
- Timer-Ende ist still (kein Ton, kein Blinken); die Scheibe ist dann leer.

### 3.5 Tutorial
- Kommt in der ersten Runde je Modus (Sprechen und Hören getrennt), vor dem ersten echten Wort. Es erklärt der gewählte Begleiter an einem Probewort (Apfel; fehlt es im Wortschatz oder ist es ausgeschaltet, das erste Wort).
- Zehn Schritte mit Sprechblase beim Begleiter (je höchstens 12 Wörter) und wechselnder Pose: Begrüßung und Einleitung, dann die Karten, der Lautsprecher (Hören: Wort und Auge-Button), „Wusste ich“, „Noch üben“, die Uhr und „Los geht’s!“.
- Das Gemeinte wird mit einem Stiftkreis (Beere `--beere-600`) eingekreist, der sich zieht; der Rest ist je Schritt teilweise unscharf. Kopfleiste, Begleiter und Sprechblase bleiben scharf. Die Uhr erscheint erst in ihrem Schritt.
- Nur der runde lila „Weiter“-Button (Pfeil, rechts unten in der Sprechblase) schaltet weiter; alle anderen Buttons tun nichts. Der Lautsprecher spielt in seinem Schritt das Probewort; danach ist es aufgedeckt.
- Die Uhr steht, das Probewort zählt nicht zum Lernstand. Nach dem letzten Schritt beginnt die Runde, das Tutorial des Modus gilt als gesehen.
- Abbruch mit [×] im Tutorial führt direkt zur Auswahl: niemand schläft ein, das Tutorial bleibt offen.
- Im Elternbereich je Modus zurücksetzbar (kommt dann in der nächsten Runde wieder).

### 3.6 Abschluss und Schlaf
- **Abschluss:** Begleiter groß in der Pose „winkt“, Text „Bis zum nächsten Mal!“, runder Haus-Button („Zurück“). Keine Zusammenfassung, keine Anzahl Wörter. Gleich, ob die Runde per Zeitablauf oder [×] endet.
- Mit dem Erreichen des Abschlusses schläft der Begleiter bis zum nächsten Tag (lokales Datum). Modi verbrauchen sich nicht.
- **Schlafseite:** Schlafen beide, führt der Haus-Button (und jedes Öffnen der App) zur Schlafseite: Kopfleiste, Bild beider Begleiter schlafend, „Gute Nacht und bis morgen!“, keine Schaltfläche. Aufwecken nur im Elternbereich.
- An einem späteren Tag wachen alle von selbst auf – beim Öffnen und beim Zurückholen aus dem Hintergrund; von der Schlafseite geht es dann zur Begrüßung.

### 3.7 Elternbereich
- Erreichbar nur durch verstecktes Halten (600 ms) des App-Icons auf Begrüßung, Start und Schlafseite. „Zurück“ (runder Pfeil links in der Kopfleiste) führt dorthin, wo er geöffnet wurde; schlafen beide Begleiter, zur Schlafseite; ohne Namen zur Namensfrage.
- Rechts in der Kopfleiste zwei Reiter; beim Öffnen ist „Sprachen“ gewählt. Keine Avatare, sonst Design wie überall; Textbuttons weiß mit Rahmen.
- **Reiter „Sprachen“:** Modus (Sprechen | Hören) und Sprache (alle vier Flaggen, ausgeschaltete blass) wählen. Die Wörter des Wortschatzes stehen als Emoji in Zeilen „Neu“, „Stufe 0“ (noch üben) … „Stufe 4“ (sicher), je mit Anzahl. Ein Tipp auf ein Emoji schaltet das Wort aus (blass, bleibt an seinem Platz) bzw. wieder ein; das letzte Wort einer Sprache bleibt an. „Lernstand zurücksetzen“ (ausgegraut ohne Lernstand) fragt erst nach („Französisch, Hören: Wirklich zurücksetzen?“ – „Ja, zurücksetzen“ / „Abbrechen“) und leert nur diesen Modus dieser Sprache. „Sprache ausschalten/einschalten“: ohne Wörter nicht einschaltbar, die letzte spielbare Sprache nicht ausschaltbar. Ohne Wörter steht „Noch keine Wörter vorhanden“.
- **Reiter „Sonstiges“** (je Zeile Titel, kurze Erklärung, Bedienelement): Rundendauer (3 bis 10 Minuten, Standard 5; gilt für Sprechen und Hören), Schlafen (Kacheln „Mimi“ und „Mots“, markiert = schläft bis morgen), Tutorial Sprechen und Tutorial Hören („… zurücksetzen“, ausgegraut, solange es noch offen ist), Neue Wörter bremsen (Kachel „Bremsen“), Version („Version · Commit · Build-Datum“ mit Kopier-Button).

### 3.8 Hochformat
- Overlay über jeder Ansicht mit dem gewählten Begleiter (ohne Wahl Mimi) beim Radschlagen und Dreh-Symbol, ohne Text („iPad drehen“ nur für Screenreader); App-State bleibt erhalten, Timer pausiert.

## 4. Avatare
| Pose | Mimi | Mots | Einsatz |
|---|---|---|---|
| ruhig | `cat_sitting.png` (sitzt, lächelt) | `pony_sitting.png` (sitzt) | Startauswahl, Tutorial |
| zeigt | `cat_pointing.png` (Pfote nach rechts) | `pony_pointing.png` (Huf nach rechts) | neues Wort, Tutorial |
| freut | `cat_idle.png` (Mund offen) | `pony_idle.png` (steht, Mund offen) | nach Aufdecken, Tutorial |
| winkt | `cat_waving.png` (zwinkert, winkt) | `pony_waving.png` (winkt) | Begrüßung, Abschluss, Tutorial |
| schläft | `cat_sleeping.png` | `pony_sleeping.png` | Startauswahl, Begrüßung |
| Rad | `cat_cartwheel.png` | `pony_cartwheel.png` | Hochformat-Hinweis |

- Schlafseite: `both_sleeping.png` (beide).
- Statische Bilder, Bildtausch ohne Animation. Avatar steht links, damit Zeigegesten nach rechts zur Aufgabe gehen.
- Die vier Posen sind transparente PNGs (384 × 440) mit gleicher Leinwand, unverändert übernommen → in identischer Box darstellen, dann springt der Bildtausch nicht. Schlaf- und Radschlagbilder sind auf doppelte Anzeigegröße verkleinert.
- Darstellungsgröße: max. ca. 440 px Höhe.

## 5. Wortauswahl (Scheduler)
- **Wortschatz** einer Sprache: nur Wörter mit gewählter Aufnahme (`audio-choices.json`, §6), ohne die im Elternbereich ausgeschalteten.
- Lernstand **pro Modus, Sprache und Wort**: `{ box: 0..4, seen: number, lastSeenAt: ISO }`. Wörter ohne Eintrag gelten als „neu“.
- „Wusste ich“ → `box = min(box + 1, 4)`. „Noch üben“ → `box = 0`.
- Bekannte Wörter gewichtet zufällig: Gewicht Box 0 = 8, 1 = 5, 2 = 3, 3 = 2, 4 = 1.
- Neue Wörter: Solange weniger als 6 Wörter bekannt sind, wird mit neuen aufgefüllt; sonst ist jedes 3. Wort neu. Pro Runde höchstens 8 neue.
- **Bremse** (Standard an): Stehen 6 oder mehr eingeschaltete Wörter auf Stufe 0, kommen keine neuen dazu – bei jedem Wort neu geprüft.
- Dasselbe Wort frühestens nach 6 anderen Wörtern erneut; bei wenigen bekannten Wörtern kürzer (mindestens 3), damit immer mindestens 3 bekannte zur Auswahl bleiben.
- Scheduler ist eine reine Funktion (Zufall injizierbar) und vollständig unit-getestet.

## 6. Audio
- **Anforderung:** hochwertige, natürliche Aussprache, kostenlos, offline, klein.
- **Lösung:** Audio wird einmalig vor dem Build lokal erzeugt (`scripts/generate_audio.py`, `npm run audio`) und als statische Dateien `public/audio/<lang>/<id>.mp3` ausgeliefert und gecacht.
  - Standardstimmen: EN **Piper** `en_US-ljspeech-high`, FR **Kokoro** `ff_siwis`, JA **VOICEVOX** 冥鳴ひまり (aus der Kana-Lesung, Namensnennung „VOICEVOX:冥鳴ひまり“), IT **Kokoro** `if_sara`. Lizenzen siehe README und §11.
  - **Stimmwahl je Wort** (`tools/stimmwahl.html`, nur Dev-Server): je Wort mehrere Stimmen als „Wort“ und „Wort.“ anhören und eine wählen oder „keins“. Die Wahl steht in `audio-choices.json` und gilt als Hörprüfung (Häkchen in `audio-check.md`).
  - Nachbearbeitung (ffmpeg): Stille trimmen, 150 ms Vorlauf, Lautheit normalisieren (−16 LUFS), MP3 mono 64 kbit/s.
  - Größe: ~8 KB/Wort; je Datei < 32 KB, alle zusammen < 3 MB (derzeit ca. 1,6 MB).
  - Eigene Aufnahmen in `audio-overrides/<lang>/<id>.(mp3|wav|m4a)` haben Vorrang.
- **Laufzeit:** `HTMLAudioElement`; beim Start einer Runde werden die Dateien der eingeschalteten Wörter der Sprache vorgeladen. Fehlt eine Datei oder scheitert das Abspielen → Fallback Web Speech API (`lang` en-GB/fr-FR/ja-JP/it-IT, beste verfügbare Stimme).

## 7. Persistenz
- `localStorage`, Schlüssel `mimi-mots:v2`; alle Daten gehören zu einem Kind (Platz für weitere, B-90):
```json
{ "version": 2,
  "activeChildId": "3f0c…-uuid",
  "children": [{
    "id": "3f0c…-uuid", "name": "Lina",
    "createdAt": "2026-11-01T09:00:00.000Z", "updatedAt": "2026-11-01T09:05:00.000Z",
    "settings": { "companion": "mimi", "language": "fr", "mode": "speak" },
    "progress": { "fr": { "apfel": { "box": 2, "seen": 5, "lastSeenAt": "…" } }, "en": {} },
    "listenProgress": { "fr": {}, "en": {} },
    "rest": { "sleeping": ["mimi"], "since": "2026-10-30" },
    "enabledLanguages": ["en", "fr"], "tutorialDone": true, "listenTutorialDone": false,
    "brakeNew": true, "disabledWords": { "en": [] }, "roundMin": 5 }] }
```
- `progress` = Sprechen, `listenProgress` = Hören. Standard: Englisch und Französisch eingeschaltet, Bremse an, 5 Minuten.
- Beschädigte, unbrauchbare oder fremde Daten → Defaults bzw. Erststart, kein Absturz. Ältere Daten (`mimi-mots:v1`) werden nicht übernommen (§11).
- Hinweis: Als Home-Bildschirm-App ist der Speicher unter iOS stabil; im Safari-Tab kann er nach längerer Nichtnutzung gelöscht werden.

## 8. Design
- Aufgeräumt, einheitlich, süß, Lila-basiert (Tokens in `CLAUDE.md`).
- Große, runde Kacheln mit weichen Schatten; viel Weißraum; maximal 3 Gruppen pro Ansicht.
- Schrift `ui-rounded`; Wortkarte: deutsches Wort und Fremdwort höchstens 48 px (Stärke 800, in schmalen Karten kleiner), Überschriften ~28 px.
- Silbenfarben: 1., 3., … Silbe `--lila-900`, 2., 4., … `--beere-600`.
- Kontrast Text ≥ 4,5 : 1 (große Schrift ≥ 3 : 1).
- Keine Ablenkung: keine Hintergrundmuster, keine Deko-Elemente während der Lernrunde.
- iPhone (Höhe ≤ 500 px): kompaktes Layout mit gleicher Anordnung und kleineren Maßen.

## 9. PWA / Technik
- Manifest: Name „Mimi & Mots“, `display: standalone`, `orientation: landscape`, `theme_color` `#6A4C9C`, `background_color` `#F8F4FB`, Icons 192/512/maskable 512; dazu `apple-touch-icon` 180.
- Service Worker precacht alle Assets inkl. Audio (< 5 MB). Update: neue Version wird still beim nächsten Start aktiv (kein Popup für das Kind).
- Hosting: **GitHub Pages** (HTTPS) unter `/mimi_mots/`. Deploy per GitHub Action bei Push auf `main` (Lint → Unit-Tests → Build → Deploy).
- App-Icon: `icons/icon.svg` (lila Verlauf, weiße Sprechblase mit Katzen- und Ponyohr, lila Herz wie auf dem Halstuch). Austausch: SVG ersetzen und `npm run icons` ausführen.
- Version, Commit und Build-Datum werden beim Bauen eingesetzt und im Elternbereich angezeigt.
- Performance: Startbildschirm < 1 s nach Cache, keine Layout-Sprünge.

## 10. Anhang: Wortliste
Quelle für App und Audio-Skript ist `src/data/words.json` (dort zusätzlich die Silben `syllables`); ein Unit-Test prüft, dass diese Tabelle Eintrag für Eintrag übereinstimmt. Welche Wörter je Sprache in der App vorkommen, bestimmt `audio-choices.json` (§5).

FR- und IT-Nomen mit Artikel; EN ohne Artikel; Farben und Zahlen ohne Artikel. JA in üblicher Schreibweise (Kanji, Hiragana oder Katakana), dazu die Kana-Lesung für die Aussprache.

| id | Emoji | DE | EN | FR | IT | JA | JA (Lesung) |
|---|---|---|---|---|---|---|---|
| apfel | 🍎 | Apfel | apple | la pomme | la mela | りんご | りんご |
| banane | 🍌 | Banane | banana | la banane | la banana | バナナ | バナナ |
| erdbeere | 🍓 | Erdbeere | strawberry | la fraise | la fragola | いちご | いちご |
| birne | 🍐 | Birne | pear | la poire | la pera | 梨 | なし |
| kirsche | 🍒 | Kirsche | cherry | la cerise | la ciliegia | さくらんぼ | さくらんぼ |
| zitrone | 🍋 | Zitrone | lemon | le citron | il limone | レモン | レモン |
| karotte | 🥕 | Karotte | carrot | la carotte | la carota | にんじん | にんじん |
| brot | 🍞 | Brot | bread | le pain | il pane | パン | パン |
| kaese | 🧀 | Käse | cheese | le fromage | il formaggio | チーズ | チーズ |
| ei | 🥚 | Ei | egg | l'œuf | l'uovo | 卵 | たまご |
| milch | 🥛 | Milch | milk | le lait | il latte | 牛乳 | ぎゅうにゅう |
| kuchen | 🍰 | Kuchen | cake | le gâteau | la torta | ケーキ | ケーキ |
| eis | 🍦 | Eis | ice cream | la glace | il gelato | アイス | アイス |
| katze | 🐱 | Katze | cat | le chat | il gatto | 猫 | ねこ |
| hund | 🐶 | Hund | dog | le chien | il cane | 犬 | いぬ |
| pferd | 🐴 | Pferd | horse | le cheval | il cavallo | 馬 | うま |
| maus | 🐭 | Maus | mouse | la souris | il topo | ねずみ | ねずみ |
| hase | 🐰 | Hase | rabbit | le lapin | il coniglio | うさぎ | うさぎ |
| vogel | 🐦 | Vogel | bird | l'oiseau | l'uccello | 鳥 | とり |
| fisch | 🐟 | Fisch | fish | le poisson | il pesce | 魚 | さかな |
| kuh | 🐮 | Kuh | cow | la vache | la mucca | 牛 | うし |
| schwein | 🐷 | Schwein | pig | le cochon | il maiale | 豚 | ぶた |
| ente | 🦆 | Ente | duck | le canard | l'anatra | カモ | カモ |
| baer | 🐻 | Bär | bear | l'ours | l'orso | 熊 | くま |
| loewe | 🦁 | Löwe | lion | le lion | il leone | ライオン | ライオン |
| elefant | 🐘 | Elefant | elephant | l'éléphant | l'elefante | 象 | ぞう |
| schmetterling | 🦋 | Schmetterling | butterfly | le papillon | la farfalla | ちょうちょ | ちょうちょ |
| frosch | 🐸 | Frosch | frog | la grenouille | la rana | かえる | かえる |
| ball | ⚽ | Ball | ball | le ballon | la palla | ボール | ボール |
| haus | 🏠 | Haus | house | la maison | la casa | 家 | いえ |
| auto | 🚗 | Auto | car | la voiture | la macchina | 車 | くるま |
| buch | 📖 | Buch | book | le livre | il libro | 本 | ほん |
| baum | 🌳 | Baum | tree | l'arbre | l'albero | 木 | き |
| blume | 🌸 | Blume | flower | la fleur | il fiore | 花 | はな |
| sonne | ☀️ | Sonne | sun | le soleil | il sole | 太陽 | たいよう |
| mond | 🌙 | Mond | moon | la lune | la luna | 月 | つき |
| stern | ⭐ | Stern | star | l'étoile | la stella | 星 | ほし |
| schuh | 👟 | Schuh | shoe | la chaussure | la scarpa | 靴 | くつ |
| hut | 👒 | Hut | hat | le chapeau | il cappello | 帽子 | ぼうし |
| fahrrad | 🚲 | Fahrrad | bike | le vélo | la bicicletta | 自転車 | じてんしゃ |
| boot | ⛵ | Boot | boat | le bateau | la barca | 船 | ふね |
| zug | 🚂 | Zug | train | le train | il treno | 電車 | でんしゃ |
| regenschirm | ☂️ | Regenschirm | umbrella | le parapluie | l'ombrello | 傘 | かさ |
| herz | ❤️ | Herz | heart | le cœur | il cuore | ハート | ハート |
| rot | 🔴 | rot | red | rouge | rosso | 赤 | あか |
| blau | 🔵 | blau | blue | bleu | blu | 青 | あお |
| gelb | 🟡 | gelb | yellow | jaune | giallo | 黄色 | きいろ |
| gruen | 🟢 | grün | green | vert | verde | 緑 | みどり |
| lila | 🟣 | lila | purple | violet | viola | 紫 | むらさき |
| orange | 🟠 | orange | orange | orange | arancione | オレンジ | オレンジ |
| null | 0️⃣ | null | zero | zéro | zero | ゼロ | ゼロ |
| eins | 1️⃣ | eins | one | un | uno | 一 | いち |
| zwei | 2️⃣ | zwei | two | deux | due | 二 | に |
| drei | 3️⃣ | drei | three | trois | tre | 三 | さん |
| vier | 4️⃣ | vier | four | quatre | quattro | 四 | よん |
| fuenf | 5️⃣ | fünf | five | cinq | cinque | 五 | ご |
| sechs | 6️⃣ | sechs | six | six | sei | 六 | ろく |
| sieben | 7️⃣ | sieben | seven | sept | sette | 七 | なな |
| acht | 8️⃣ | acht | eight | huit | otto | 八 | はち |
| neun | 9️⃣ | neun | nine | neuf | nove | 九 | きゅう |
| zehn | 🔟 | zehn | ten | dix | dieci | 十 | じゅう |

## 11. Entscheidungen
Nur gültige Entscheidungen, nach Thema; Begründungen nur, wo sie für die heutige Regel wichtig sind. Überholte Entscheidungen und die vollständige Chronik mit Datum: `docs/archiv/entscheidungen-chronik.md`.

### Ablauf und Runde
- Keine deutsche Sprachausgabe – das Kind liest (2026-10-29).
- Nach Ablauf der Zeit läuft das aktuelle Wort unverändert weiter (inkl. Vorlesen); der Abschluss kommt erst nach der Selbsteinschätzung (B-42).
- Das Kind wählt den Modus Sprechen oder Hören, keine Dauer (B-89). Die Rundendauer stellen Eltern im Elternbereich ein: 3 bis 10 Minuten, Standard 5, gilt für beide Modi; die Zahl steht nur im Elternbereich (B-93).
- Die volle Timer-Scheibe entspricht der eingestellten Dauer, nicht einer 60-Minuten-Skala wie beim echten Time Timer – ein schmaler Keil wäre für ein Kind kaum ablesbar (B-41, B-93).
- Hörrunde: Fremdwortkarte vorn (Wort sofort sichtbar und einmal abgespielt), Bildkarte mit Auge-Button daneben; eigener Lernstand (`listenProgress`) und eigenes Tutorial, weil Hören leichter ist und den Sprechen-Stand nicht anheben soll (B-89).
- Schlafen: Mit dem Erreichen des Abschlusses (Zeitablauf oder [×]) schläft der Begleiter bis zum nächsten Tag (lokales Datum); Modi verbrauchen sich nicht. Schlafen beide, kommt die Schlafseite. Aufwachen von selbst an einem späteren Tag, beim Start und beim Zurückholen aus dem Hintergrund. Einschlafen ist weder Belohnung noch Strafe – es passiert immer (B-65, B-89).
- [×] beendet die Runde nur durch Gedrückthalten (600 ms) (B-25).
- Begrüßung als erster Bildschirm, wenn ein Tier wach ist; ohne Namen ist die Auswahl nie erreichbar. Nach einer Runde, nach Abbruch im Tutorial und nach dem Elternbereich kommt nie die Begrüßung – außer der Elternbereich wurde auf ihr geöffnet; neu ist sie nur, wenn es auf der Schlafseite ein neuer Tag wird (B-97, B-99).
- Der Name (höchstens 16 Zeichen, sonst Auslassungspunkte) steht oben rechts in der Kopfleiste auf allen Seiten außer Begrüßung und Elternbereich; in der Lernrunde links [×] (B-97, B-99).
- Die Uhr der Lernrunde hängt rechts unten am Begleiter auf Höhe der Bewertung (8 px neben der Stelle, bis zu der das breiteste Tierbild in dieser Höhe reicht – 89 % der Bildbreite) (B-99).

### Tutorial
- In der ersten Runde je Modus, vor dem ersten echten Wort; Probewort Apfel bzw. das erste Wort des Wortschatzes, wenn Apfel fehlt oder ausgeschaltet ist. Uhr steht, Probewort zählt nicht; danach `tutorialDone` bzw. `listenTutorialDone`, im Elternbereich je Modus zurücksetzbar (B-74, B-84, B-88, B-89).
- Es erklärt der gewählte Begleiter – er legt sich am Ende auch hin. Zehn Schritte; unscharfer Hintergrund lenkt den Fokus, Kopfleiste nie unscharf; die Uhr erscheint erst mit ihrem Schritt (B-87).
- Der Stiftkreis liegt in einer eigenen Ebene über der Ansicht (die Flagge ist ein Bild und kann ihn nicht enthalten; so bleibt er auch am Rand im Bild). Er wird in Pixeln passend zum Ziel berechnet, weil WebKit das Strichmuster bei gestreckten Koordinaten falsch maß. Bleibt das Ziel gleich, bleibt der Kreis stehen (B-87).
- Nur der „Weiter“-Button schaltet weiter (88 px, iPhone 44 px, rechts unten in der Sprechblase); alle anderen Buttons tun im Tutorial nichts. Grund: Kinder tippten auf „Wusste ich“/„Noch üben“, es ging weiter, und sie waren verwirrt (B-95).
- Abbruch im Tutorial führt direkt zur Auswahl: niemand schläft ein, das Tutorial bleibt offen (B-87).

### Scheduler
- Takt neuer Wörter: Solange weniger als 6 Wörter bekannt sind, wird mit neuen aufgefüllt (die erste Runde beginnt also nicht mit mehr als 6 neuen am Stück); sonst ist jedes 3. Wort neu, höchstens 8 pro Runde. Grund: Mit „neues Wort als gewichteter Platz“ kamen später nur noch 2–3 neue (B-20, B-70).
- Pause zwischen Wiederholungen 6 Wörter, damit das Kind wirklich abruft statt aus dem Kurzzeitgedächtnis; bei kleinem Wortschatz kürzer, mindestens 3 (`gapFor`), sonst bliebe keine Auswahl und die Gewichtung wäre wirkungslos (B-70).
- Bremse statt Startseiten-Kachel: Schalter im Elternbereich (Standard an); ab 6 eingeschalteten Wörtern auf Stufe 0 kommen keine neuen dazu, bei jedem Wort neu geprüft. Das Kind sieht davon nichts (B-82, B-88).
- Lernstand je Sprache und je Modus (B-23, B-89).

### Audio, Stimmen und Lizenzen
- Alle Sprachen aus vorproduzierten MP3s; Web Speech nur als Fallback. Die Gerätestimme klang unter Linux schlecht und hängt auf dem iPad von den installierten Stimmen ab (B-64).
- Englisch: Piper `en_US-ljspeech-high` (LJ Speech, public domain). Alle englischen Kokoro-Stimmen sprachen bei Einzelwörtern einen falschen Anfangslaut mit (z. B. „egg“ → „leg“). Keine Piper-Stimmen auf Lessac-Basis (u. a. Amy): Blizzard-2013-Daten nur für Forschung. Die Stimme ist amerikanisch, die Flagge bleibt britisch; der Fallback ist en-GB (B-64).
- Französisch: Kokoro `ff_siwis` (Standard). Wählbar auch Piper tom (AGPL-Modell, Lizenzwirkung auf Aufnahmen unklar – nur nach bewusster Entscheidung) und MeloTTS (MIT; eigene Umgebung mit Python 3.10, Aufruf als Unterprozess). Piper mls war unverständlich; Piper siwis-medium/upmc (Lessac) und siwis-low/gilles/mls_1840-low (nicht-kommerziell) entfallen (B-79).
- Japanisch: VOICEVOX 冥鳴ひまり – kostenlos, auch kommerziell, Namensnennung „VOICEVOX:冥鳴ひまり“ (README). Die japanischen Kokoro-Stimmen sind schwach bewertet, No.7 nur nicht-kommerziell. Aussprache aus der Kana-Lesung (`jaKana`), damit Kanji nicht falsch gelesen werden (月 → つき). VOICEVOX wird nicht automatisch geladen, weil man beim Download den Nutzungsbedingungen zustimmen muss (B-67).
- Italienisch: Kokoro `if_sara` (Standard) und `im_nicola` (Apache-2.0), Piper `it_IT-riccardo-x_low` (M-AILABS, frei nutzbar, nur x_low-Qualität). Nicht Piper paola (Lessac, nur Forschung); MeloTTS kann kein Italienisch, MMS-TTS und XTTS sind nur nicht-kommerziell (B-80).
- Stimmwahl je Wort statt einer Stimme je Sprache, als „Wort“ oder „Wort.“: Das Beschneiden bei −45 dB kappt teils leises Wortende, „Wort.“ endet bei manchen Stimmen sauberer. Gewählte Dateien werden kopiert statt neu erzeugt, weil Piper nicht bitgleich reproduziert. Die Wahl gilt als Hörprüfung (B-78).
- „keins“, wenn keine Aufnahme taugt: gespeichert als `null`, die App-Datei wird gelöscht, kein Haken; `npm run audio` erzeugt dafür nichts. Keine Notizspalte in `audio-check.md` (B-85).
- Grenzen: je Datei < 32 KB, alle zusammen < 3 MB – manche wählbaren Stimmen sprechen langsamer (B-79).
- Kokoro über `kokoro-onnx` (gleiches Modell, ohne PyTorch); Python-Umgebung `.venv`, Modelle in `.models/` (nicht eingecheckt). Beim Start einer Runde werden alle Audiodateien der Sprache vorgeladen. Hörprüfung über `tools/hoerpruefung.html` (nur Dev-Server) und `audio-check.md` (B-30a, B-31, B-71).

### Sprachen und Wortschatz
- Wortliste: `src/data/words.json` ist Quelle für App und Audio-Skript, `words.ts` liefert Typ und Zugriff (B-04).
- Wortschatz = Wörter mit gewählter Aufnahme (`audio-choices.json`, beim Bauen eingelesen) – lieber ein Wort weglassen als eine schlechte Aussprache anbieten. Lernstand herausgefallener Wörter bleibt gespeichert und gilt wieder, wenn sie zurückkommen (B-84).
- Nur eingeschaltete Sprachen erscheinen auf der Startseite (ausgegraute wirkten zu voll). Standard: Englisch und Französisch an, Japanisch und Italienisch aus. Sprachen ohne Wörter lassen sich nicht einschalten, die letzte Sprache mit Wörtern nicht ausschalten; gespeicherte Daten werden beim Laden entsprechend bereinigt – so ist die Startseite nie ohne Sprache (B-73, B-81, B-86).
- Wörter je Sprache im Elternbereich aus- und einschaltbar; ausgeschaltete kommen nicht vor (auch nicht als Probewort), ihr Lernstand bleibt; das letzte Wort bleibt an (B-88).
- Französisch und Italienisch: Nomen mit bestimmtem Artikel, Farben und Zahlen ohne (B-04, B-68, B-80). Italienisch kindgerecht: ⚽ „la palla“, 🚗 „la macchina“, 🍰 „la torta“ (B-80).
- Japanisch: übliche Schreibweise (Kanji, Hiragana oder Katakana), ohne Lesehilfe; Wortwahl nach Bild: 🦆 カモ, ⛵ 船, 🚂 電車, 🍦 アイス (B-67).
- Silben des deutschen Worts von Hand in `words.json` (`syllables`), weil automatische Trennung bei Grundschul-Silben (z. B. „E-le-fant“) unzuverlässig ist (B-66).

### Elternbereich
- Erreichbar nur durch verstecktes Halten (600 ms) des App-Icons auf Begrüßung, Start und Schlafseite – ohne Hinweis, keine Schaltfläche. Auf der Begrüßung, weil sie nach dem Öffnen der erste Bildschirm ist (B-69, B-97).
- „Zurück“ als Pfeil statt Haus (es geht zurück, nicht „nach Hause“) und dorthin, wo er geöffnet wurde (B-86, B-99).
- Zwei Reiter rechts in der Kopfleiste, beim Öffnen „Sprachen“; jede Einstellung mit kurzer Erklärung. Sprachkacheln dort 100 px breit, damit vier Flaggen auf 1024 px passen. Modi stehen vor den Flaggen; Gruppennamen nur für Screenreader, sonst passt die Leiste nicht auf 1024 px; die Sicherheitsabfrage nimmt die ganze Leiste ein (B-83, B-89).
- Schalter als Auswahlkacheln wie bei der Tierauswahl („Bremsen“, „Mimi“, „Mots“; markiert = an bzw. schläft), nur Text, keine Avatare. Hingelegt wird wie nach einer Runde (bis morgen); schlafen Tiere noch vom Vortag, gilt beim Umschalten erst der neue Tag. Die Auswahl der Startseite wird erst beim Verlassen angepasst (B-86, B-94).
- Kein Hinweis auf die Stimmwahl in der App, nur „Noch keine Wörter vorhanden“ (B-86).
- Version „Version · Commit · Build-Datum“ im Reiter „Sonstiges“, beim Bauen per Vite `define` eingesetzt (Commit aus `git rev-parse`, sonst `GITHUB_SHA`, sonst „unbekannt“ – der Build bricht nie ab). Jeder Build ändert den Bundle-Hash und damit den Precache; das stille Update ist gewollt. Daneben ein schlichter Kopier-Button (weiß mit Rahmen, zwei Rechtecke, danach kurz ein Haken) (B-98, B-99).

### Speicher und Daten
- Alle Daten gehören zu einem Kind: `{ version: 2, activeChildId, children: [{ id, name, createdAt, updatedAt, …Daten }] }` unter `mimi-mots:v2`. ids sind UUIDs (`crypto.randomUUID`, ohne sicheren Kontext über `crypto.getRandomValues`), Zeitstempel ISO in UTC – damit die Kinder später 1 : 1 als Zeilen in Supabase passen. Unbrauchbare Daten führen zum Erststart (B-97).
- Keine Datenübernahme über Updates (Entscheidung des Menschen): Eine neue Version darf gespeicherte Daten verwerfen; Code, der Daten über Updates erhält, nur nach Rückfrage; vor jeder Änderung am Speicherformat fragen. Deshalb wird `mimi-mots:v1` nicht übernommen (B-97).
- Sprachen, Bremse, Rundendauer, ausgeschaltete Wörter und der Schlaf der Tiere gelten je Kind, nicht für das Gerät (Nutzerentscheidung für B-90).
- Fehlende oder ungültige Werte → Standard (z. B. `roundMin` → 5, Bremse an) (B-82, B-93).

### Design, Layout und iPhone
- Avatare als gelieferte transparente PNGs, keine Aufbereitung. Ausnahme `both_sleeping.png`: Das gelieferte Bild hatte ein gemaltes Schachbrett statt Transparenz – per Flutfüllung entfernt, zugeschnitten, verkleinert. Schlaf- und Radschlagbilder auf doppelte Anzeigegröße verkleinert, damit der Precache unter 5 MB bleibt (B-03, B-65, B-77).
- Flaggen als SVG im Seitenverhältnis 3 : 2 (die gelieferten PNGs waren auf dem Retina-iPad unscharf) (2026-10-29).
- Kacheln sind innerhalb einer Gruppe gleich groß; das Sprachraster hat höchstens zwei Spalten und ist immer zwei Kachelzeilen hoch, damit die Überschrift mit den anderen Gruppen auf einer Linie bleibt (B-26, B-81).
- Lautsprecher-Button statt Tipp auf die Flagge; Bewertung als runde lila Buttons nur mit Symbol (B-26).
- Kopfleiste auf allen Seiten gleich hoch. Zwei gleich große Karten, damit beide Wörter gleich gewichtet sind; deutsches Wort und Fremdwort in gleicher Größe und Stärke, nur zu lange Fremdwörter kleiner (B-27, B-99).
- Silbenfarben: `--beere-600` (#B03A75, Kontrast auf Weiß 5,7 : 1); deutsches Wort höchstens 48 px und schrumpft mit der Kartenbreite (`min(48px, 14cqi)`), damit „Schmetterling“ auf 1024 × 768 passt (B-66).
- Hochformat-Hinweis: Begleiter schlägt Rad, kein Text (nur Name für Screenreader) (B-72).
- iPhone 15/16 quer (852 × 393) als zusätzlicher Test-Viewport, nur Querformat. Für Höhen ≤ 500 px ein kompaktes Layout mit gleicher Anordnung und kleineren Maßen (B-76).
- Texte: „In welcher Sprache?“, „Bis zum nächsten Mal!“ (B-27); „Bei was?“ (B-89).

### Ausnahmen von Leitprinzipien
- Leitprinzip 4 (≤ 200 ms): Der Ring beim Halten von [×] füllt sich über 600 ms (= Long-Press-Dauer) – Rückmeldung auf eine Bedienung, keine Deko (B-25). Der Stiftkreis im Tutorial zieht sich in 700 ms (B-87). Bei „Bewegung reduzieren“ beides sofort.
- Leitprinzip 3 (88 px): Auf dem iPhone gelten 44 px (Apple-Mindestmaß) (B-76). Die Wort-Buttons im Elternbereich sind auch auf dem iPad nur 44 px – bei 61 Wörtern passen größere nicht auf einen Bildschirm, und der Bereich richtet sich an Erwachsene (B-88). Der Kopier-Button neben der Version ist ebenfalls 44 px (B-99).
- Leitprinzip 3 (wenig Text): bis zu 12 Wörter je Tutorial-Sprechblase (B-87); sonst höchstens 14 Wörter je Kind-Ansicht außer den Lernwörtern (B-61, B-75).
- Das Leitprinzipien-Review (B-61, 2026-10-30) ergab keine Abweichung; die Prüfungen laufen automatisch in `b60-layout.spec.ts` und `b61-leitprinzipien.spec.ts` (Momentaufnahme mit Textliste im Archiv).
- Leitprinzip 6 bleibt unberührt vom Telegram-Bot (nur Entwicklung) und gilt bis zur Datenbank (siehe `backlog.md` → „Später“).

### Entwicklung und Werkzeuge
- Arbeit in Feature-Branches mit Pull Requests; Akzeptanztests vor der Umsetzung in `backlog.md`; PR erst nach lokaler Abnahme (2026-10-29).
- Hosting GitHub Pages; App-Icon als austauschbares SVG (`npm run icons`) (B-50, B-53).
- E2E-Tests steuern die Uhr mit Playwrights Clock-API statt eines Test-Parameters – der Produktionsbuild braucht keinen Test-Zugang (B-40).
- Verhalten läuft nur auf 1180 × 820; Tests zu Größe, Lage, Überlauf und Screenshots tragen `@layout` und laufen auf allen Viewports. Tests mit Hochformat-Wechsel per Größenänderung nur auf iPad-Viewports (die iPhone-Emulation löst kein Orientierungs-Ereignis aus) (B-76, B-91).
- Screenshot-Tests blenden in der Lernrunde nur die Uhr aus (B-99).
- Für die Tests gilt Tutorial und Begrüßung als durchgetippt und der Name „Lina“ als gesetzt, außer mit `test.use({ tutorial: true })`, `test.use({ greeting: true })` bzw. `test.use({ childName: null })` (B-97).
- Eigene Ports: Dev-Server 5181, Vorschau und E2E 4181, jeweils `strictPort`; je Worktree per `DEV_PORT`/`PREVIEW_PORT`. Playwright startet immer einen eigenen Server – sonst testete es womöglich ein fremdes Projekt (2026-11-01, B-92).
- Versionierung nach SemVer (Nutzerentscheidung): MINOR je neue Funktion, PATCH je Korrektur oder kleine Anpassung, keine neue Version für Doku/Tests/Werkzeuge; 1.0.0, sobald der Lernstand in Supabase liegt. Erhöht wird im Abnahme-Commit beim Merge, danach Git-Tag `vX.Y.Z`; keine GitHub-Releases (2026-11-01).
- Telegram-Bot für Updates und Fragen an den Menschen (`tools/telegram.mjs`): eigener Bot, weil Telegram je Bot nur eine Warteschlange hat; Zugangsdaten nur in `~/.config/mimi_mots/telegram.env` (2026-11-01).

## 12. Später
Die Liste für später führt `backlog.md` (Abschnitt „Später“).
