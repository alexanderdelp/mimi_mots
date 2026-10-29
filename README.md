# Mimi & Mots

PWA für ein quergelegtes iPad, mit der eine Erstklässlerin spielerisch ein paar Wörter auf Englisch oder Französisch lernt – begleitet von Mimi (Katze) oder Mots (Pony).

- Fachliche Anforderungen: [anforderungen.md](anforderungen.md)
- Aufgaben und Reihenfolge: [backlog.md](backlog.md)
- Arbeitsweise und Technik: [CLAUDE.md](CLAUDE.md)

## Entwicklung

```bash
npm install
npx playwright install webkit   # einmalig, für die E2E-Tests
npm run dev                     # http://localhost:5173/mimi_mots/ (auch im WLAN, z. B. iPad)
npm test                        # Unit-Tests (Vitest)
npm run test:e2e                # Akzeptanztests (Playwright, WebKit, iPad quer)
npm run lint
```

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

Die französische Aussprache liegt als fertige MP3-Dateien in `public/audio/fr/<id>.mp3` und wird mit der App ausgeliefert. Englisch liest die App vorerst mit der Stimme des Geräts vor (die Kokoro-Stimme `bf_emma` sprach einen falschen Anfangslaut mit, siehe `anforderungen.md` §11). Erzeugt werden sie **einmalig lokal** mit dem Open-Source-Sprachmodell [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) über [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) – ohne Internet zur Laufzeit.

### Einmalige Einrichtung

Voraussetzungen: Python 3.12 und ffmpeg im `PATH` (Windows: `winget install Python.Python.3.12` und `winget install Gyan.FFmpeg`).

```bash
python -m venv .venv
.venv/Scripts/python -m pip install kokoro-onnx soundfile      # macOS/Linux: .venv/bin/python
npm run audio -- --download-models                              # lädt Modell + Stimmen (~350 MB) nach .models/
```

`.venv/` und `.models/` werden nicht eingecheckt.

### Benutzung

```bash
npm run audio                       # erzeugt fehlende Dateien (Standard: nur Französisch)
npm run audio -- --id apfel --force # eine Datei neu erzeugen
npm run audio -- --lang en          # Englisch trotzdem erzeugen (z. B. zum Ausprobieren)
npm run test:audio                  # Tests des Skripts (inkl. echter Erzeugung im Temp-Ordner)
```

- Stimmen: Französisch `ff_siwis`; Englisch wäre `bf_emma` (britisch), wird wegen des falschen Anfangslauts derzeit nicht genutzt.
- Nachbearbeitung mit ffmpeg: Stille vorn/hinten entfernt, 150 ms Vorlauf, Lautheit −16 LUFS, MP3 mono 64 kbit/s.
- **Eigene Aufnahmen:** Klingt ein Wort schlecht, eine Aufnahme als `audio-overrides/<lang>/<id>.mp3` (oder `.wav`, `.m4a`) ablegen und `npm run audio` erneut ausführen – sie hat Vorrang und wird genauso nachbearbeitet.

### Lizenzen

- Kokoro-82M (Modell und Stimmen): Apache-2.0.
- Die französische Stimme `ff_siwis` wurde u. a. mit der *SIWIS French Speech Synthesis Database* trainiert (CC BY 4.0, Universität Edinburgh) – Namensnennung hiermit.
- kokoro-onnx: MIT.
