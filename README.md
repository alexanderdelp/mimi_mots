# Mimi & Mots

PWA für ein quergelegtes iPad (auch iPhone quer), mit der eine Erstklässlerin spielerisch ein paar Wörter auf Englisch, Französisch, Japanisch oder Italienisch lernt – begleitet von Mimi (Katze) oder Mots (Pony).

- Kurze Runden (Standard 5 Minuten) im Modus **Sprechen** (Bild → Fremdwort) oder **Hören** (Fremdwort → Bild), mit Tutorial beim ersten Mal; danach schläft der Begleiter bis morgen.
- Neutrale Selbsteinschätzung („Wusste ich“ / „Noch üben“), Wortauswahl nach Leitner – keine Punkte, kein Lob.
- Versteckter Elternbereich (App-Icon gedrückt halten): Lernstand, Sprachen und Wörter ein-/ausschalten, Rundendauer, Tiere wecken.
- Offline nach dem ersten Laden, keine Server, kein Tracking.

- Fachliche Anforderungen (aktueller Stand): [anforderungen.md](anforderungen.md)
- Offene Aufgaben: [backlog.md](backlog.md)
- Arbeitsweise und Technik: [CLAUDE.md](CLAUDE.md)
- Archiv (erledigte Aufgaben, Chronik der Entscheidungen): [docs/archiv/](docs/archiv/)

## Entwicklung

```bash
npm install
npx playwright install webkit   # einmalig, für die E2E-Tests
npm run dev                     # http://localhost:5181/mimi_mots/ (auch im WLAN, z. B. iPad)
npm run preview                 # Produktionsbuild auf http://localhost:4181/mimi_mots/
npm test                        # Unit-Tests (Vitest)
npm run test:e2e                # Akzeptanztests (Playwright, WebKit, iPad quer und iPhone quer)
npm run lint
```

Andere Ports (z. B. für parallele Worktrees): `DEV_PORT=5182 PREVIEW_PORT=4182 npm run …` – die E2E-Tests nutzen `PREVIEW_PORT`.

## Veröffentlichung (GitHub Pages)

Jeder Push auf `main` baut die App und veröffentlicht sie unter **https://alexanderdelp.github.io/mimi_mots/** (Workflow `.github/workflows/deploy.yml`: Lint → Unit-Tests → Build → Deploy). Von Hand: im Repo unter *Actions → Deploy GitHub Pages → Run workflow*.

Einmalige Einrichtung im Repo: *Settings → Pages → Build and deployment → Source: „GitHub Actions“*. Die E2E-Tests laufen lokal (`npm run test:e2e`), nicht in der Action.

### Auf dem iPad installieren („Zum Home-Bildschirm“)

1. Die Adresse oben in **Safari** öffnen.
2. Auf das Teilen-Symbol tippen (Quadrat mit Pfeil nach oben).
3. **„Zum Home-Bildschirm“** wählen und mit „Hinzufügen“ bestätigen.
4. Die App vom Home-Bildschirm aus starten – sie läuft dann im Vollbild und nach dem ersten Start auch **offline** (z. B. im Flugmodus).

Neue Versionen lädt die App still im Hintergrund; sie sind beim **nächsten Start** aktiv (App einmal ganz schließen und neu öffnen).

## Audio erzeugen

Die Aussprache liegt als fertige MP3-Dateien in `public/audio/<en|fr|ja|it>/<id>.mp3` und wird mit der App ausgeliefert. Erzeugt werden sie **einmalig lokal** – ohne Internet zur Laufzeit – mit drei Sprachsynthesen (Kokoro, Piper, VOICEVOX):

- **Englisch:** [Piper](https://github.com/OHF-Voice/piper1-gpl), Stimme `en_US-ljspeech-high`
- **Französisch:** [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) über [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), Stimme `ff_siwis`
- **Japanisch:** [VOICEVOX](https://voicevox.hiroshiba.jp/) (VOICEVOX CORE), Stimme 冥鳴ひまり – vorgelesen wird die Kana-Lesung `jaKana`
- **Italienisch:** Kokoro, Stimme `if_sara` (Standard); per Stimmwahl je Wort auch Kokoro `im_nicola` oder Piper `it_IT-riccardo-x_low`

Warum mehrere: Die englischen Kokoro-Stimmen sprachen bei Einzelwörtern einen falschen Anfangslaut mit, die japanischen sind schwach bewertet (siehe `anforderungen.md` §11).

### Einmalige Einrichtung

Voraussetzungen: Python 3.12 und ffmpeg im `PATH` (Windows: `winget install Python.Python.3.12` und `winget install Gyan.FFmpeg`).

```bash
python -m venv .venv
.venv/Scripts/python -m pip install kokoro-onnx soundfile piper-tts  # macOS/Linux: .venv/bin/python
npm run audio -- --download-models  # lädt Kokoro (~350 MB) und Piper-Stimme (~110 MB) nach .models/
```

**VOICEVOX (Japanisch, Linux x64):** Beim Download muss man den Nutzungsbedingungen der Stimmmodelle und der ONNX Runtime zustimmen (Eingabe `y`), deshalb lädt das Skript das nicht selbst (~1,8 GB).

```bash
mkdir -p .models/voicevox && cd .models/voicevox
curl -LO https://github.com/VOICEVOX/voicevox_core/releases/download/0.17.1/download-linux-x64
chmod +x download-linux-x64 && ./download-linux-x64 --exclude c-api -o .
cd ../..
.venv/bin/python -m pip install https://github.com/VOICEVOX/voicevox_core/releases/download/0.17.1/voicevox_core-0.17.1-cp310-abi3-manylinux_2_34_x86_64.whl
```

Für Windows/macOS gibt es den Downloader und das Wheel ebenfalls auf der [Release-Seite](https://github.com/VOICEVOX/voicevox_core/releases).

**MeloTTS (Französisch, Option der Stimmwahl, B-79):** braucht Python 3.10 und alte Paketversionen, deshalb eine eigene Umgebung `.venv-melo` (nicht eingecheckt). Mit [uv](https://docs.astral.sh/uv/):

```bash
uv python install 3.10 && uv venv --python 3.10 .venv-melo
uv pip install --python .venv-melo/bin/python --index-strategy unsafe-best-match \
  --extra-index-url https://download.pytorch.org/whl/cpu torch torchaudio \
  "git+https://github.com/myshell-ai/MeloTTS.git" "setuptools<70"
# MeloTTS lädt beim Start auch Japanisch – das kleine Wörterbuch genügt:
ln -sfn "$PWD/.venv-melo/lib/python3.10/site-packages/unidic_lite/dicdir" \
  .venv-melo/lib/python3.10/site-packages/unidic/dicdir
```

Die Modelle (~630 MB) lädt MeloTTS beim ersten Lauf in den Hugging-Face-Cache.

`.venv/` und `.models/` werden nicht eingecheckt.

### Benutzung

```bash
npm run audio                       # erzeugt fehlende Dateien (Englisch, Französisch, Japanisch, Italienisch)
npm run audio -- --id apfel --force # eine Datei neu erzeugen
npm run audio -- --lang en          # nur eine Sprache
npm run test:audio                  # Tests des Skripts (inkl. echter Erzeugung im Temp-Ordner)
```

- Stimmen: Englisch Piper `en_US-ljspeech-high` (amerikanisch), Französisch Kokoro `ff_siwis`, Japanisch VOICEVOX 冥鳴ひまり (Stil-ID 14), Italienisch Kokoro `if_sara` – jeweils sofern in `audio-choices.json` nichts anderes gewählt ist.
- Nachbearbeitung mit ffmpeg: Stille vorn/hinten entfernt, 150 ms Vorlauf, Lautheit −16 LUFS, MP3 mono 64 kbit/s.
- **Stimmwahl je Wort (B-78, „keins“ seit B-85):** `npm run audio -- --candidates --lang en` (bzw. `--lang fr`, `--lang it` oder `--lang ja`) erzeugt für jedes Wort alle Stimmoptionen als „Wort“ und „Wort.“ in `tools/stimmwahl/` (nicht eingecheckt). Auf `http://localhost:5181/mimi_mots/tools/stimmwahl.html` (`?lang=fr`, `?lang=ja`, `?lang=it`; nur `npm run dev`) anhören und auswählen: Die gehörte Datei wird sofort nach `public/audio/` kopiert, die Wahl in `audio-choices.json` gespeichert und das Wort in `audio-check.md` abgehakt. Taugt keine Aufnahme, „keins“ wählen: Das Wort fehlt dann in dieser Sprache in der App (B-84) – **in der App kommen überhaupt nur Wörter mit gewählter Aufnahme vor**. `npm run audio` erzeugt danach mit der gewählten Stimme (und für „keins“ nichts). Achtung: Piper klingt bei jedem Lauf minimal anders – `--force` ersetzt also auch ausgewählte Aufnahmen durch eine neue Version.
- **Eigene Aufnahmen:** Klingt ein Wort schlecht, eine Aufnahme als `audio-overrides/<lang>/<id>.mp3` (oder `.wav`, `.m4a`) ablegen und `npm run audio` erneut ausführen – sie hat Vorrang und wird genauso nachbearbeitet.

### Lizenzen

- Kokoro-82M (Modell und Stimmen): Apache-2.0.
- Die französische Stimme `ff_siwis` wurde u. a. mit der *SIWIS French Speech Synthesis Database* trainiert (CC BY 4.0, Universität Edinburgh) – Namensnennung hiermit.
- kokoro-onnx: MIT.
- Piper (`piper-tts`): GPL-3.0 – nur lokal als Werkzeug benutzt, nicht Teil der App.
- Englische Stimme `en_US-ljspeech-high`: trainiert auf dem *LJ Speech Dataset* (public domain). Bewusst keine der vielen Piper-Stimmen, die auf der Lessac-Stimme aufbauen (z. B. Amy): deren Trainingsdaten (Blizzard 2013) sind nur für Forschung lizenziert.
- VOICEVOX CORE: MIT; VOICEVOX ONNX Runtime und Stimmmodelle: eigene Nutzungsbedingungen (kostenlos, auch kommerziell, Namensnennung nötig).
- Französisch wählbar (B-79): MeloTTS (MIT) mit dem Sprachmodell `dbmdz/bert-base-french-europeana-cased` (MIT) und Piper `fr_FR-tom-medium` (Modell unter AGPLv3, https://git.bksp.space/Tjiho/French-tts-model-piper).
- Italienisch (B-80): Kokoro `if_sara`/`im_nicola` (Apache-2.0); Piper `it_IT-riccardo-x_low`, trainiert auf dem *M-AILABS Speech Dataset* (frei nutzbar, BSD-artige Lizenz). Bewusst nicht Piper `paola` (Lessac-Basis, nur Forschung).
- **Japanische Aussprache: VOICEVOX:冥鳴ひまり** ([Nutzungsbedingungen](https://www.meimeihimari.com/terms-of-use)).
