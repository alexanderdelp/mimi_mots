# Rechnerwechsel und offener Stand (2026-11-26)

Alles, was zum Weiterarbeiten nötig ist, liegt im Repository oder auf GitHub/Cloudflare/Neon. Auf dem alten
Rechner (Windows 11) blieb nichts Ungesichertes zurück: kein Stash, keine ungepushten Commits, nur `main`
lokal. Stand: `main` = v0.9.0.

## Offener Stand

1. **B-90 Mehrere Kinder – umgesetzt, wartet auf Abnahme.** Branch `feat/b-90-mehrere-kinder` (ein Commit
   `b8cb974`, gepusht, noch **kein Pull Request**). Inhalt: Begrüßung mit Kachel je Kind (ab 2 Kindern), Reiter
   „Kinder“ im Elternbereich (wählen, anlegen, umbenennen, löschen mit Abfrage, höchstens 4, Namen eindeutig).
   Speicherformat `mimi-mots:v2` bleibt, ein Stand von 0.9.x lädt unverändert. Akzeptanztests in
   `tests/e2e/b90-mehrere-kinder.spec.ts`; in `backlog.md` sind sie noch nicht eingetragen (beim Merge
   nachtragen). Abnahme-Vorschau: https://feat-b-90-mehrere-kinder.mimimots.bytekaska.de. Vor dem Merge auf
   aktuellen `main` bringen, komplette Suite laufen lassen, Version 0.10.0.
2. **B-116 Tutorials überarbeiten** und **B-117 Bedienung mit beiden Händen** – offen, vorher mit dem Menschen
   klären (Fragen stehen in `backlog.md`).
3. **Referenzbilder** `tests/e2e/b60-layout.spec.ts-snapshots/` gibt es nur für Linux (`*-linux.png`). Unter
   Windows schlagen die Screenshot-Vergleiche aus b60 deshalb immer fehl; alle anderen Tests laufen. Auf einem
   Linux-Rechner (oder macOS mit eigenen Bildern) nach Sichtprüfung mit
   `npx playwright test b60-layout --update-snapshots` erneuern.
4. **„Später“** in `backlog.md`: weitere Sprachen, Tiere im Elternbereich, Lernstand in Neon (nach B-90),
   mehr Wörter/Verben.

## Neuen Rechner einrichten

Voraussetzungen: Git, Node.js (zuletzt 26), GitHub CLI `gh`, für Audio Python 3.12 und ffmpeg.

```bash
git clone https://github.com/alexanderdelp/mimi_mots.git
cd mimi_mots
npm install
npx playwright install webkit          # E2E-Tests (unter Linux ggf. --with-deps)
git config core.hooksPath scripts/git-hooks   # pre-push: nie direkt auf release pushen
gh auth login                          # für PRs und Merge
npm run lint && npm run test           # Kontrolle
```

### Telegram

Die Zugangsdaten liegen **nicht** im Repo. Datei `~/.config/mimi_mots/telegram.env` vom alten Rechner von Hand
kopieren (Inhalt: `TELEGRAM_BOT_TOKEN=…`, `TELEGRAM_CHAT_ID=…`), nie per Chat, Git oder Cloud-Ordner teilen.
Prüfen mit `npm run telegram -- send "Mimi & Mots: neuer Rechner"`. Ohne die Datei berichtet Claude nur im Chat.

### Audio (nur nötig, um Aufnahmen neu zu erzeugen)

Die fertigen MP3s liegen im Repo (`public/audio/`). `.venv/`, `.models/` (Kokoro, Piper, VOICEVOX) und
`.venv-melo/` sind nicht eingecheckt und werden nach `README.md` → „Audio erzeugen“ neu angelegt
(`npm run audio -- --download-models`, VOICEVOX von Hand mit Zustimmung zu den Nutzungsbedingungen).

### Dienste (nichts lokal zu tun)

- **Cloudflare Workers Builds** baut `release`, `main` und Feature-Branches selbst (siehe `README.md`).
- **Neon** (geplant): Projekt `mimi_mots`, Daten in `backlog.md` → „Später“. Zugangsdaten nur in der
  Neon-Konsole bzw. als GitHub-Secret.

### Claude

- Regeln stehen in `CLAUDE.md`, der Koordinator-Ablauf in `docs/koordination.md` (Skill `/koordinieren` in
  `.claude/skills/`), Dev-Server für die Vorschau in `.claude/launch.json`.
- Claudes Notizen außerhalb des Repos enthalten nur die Telegram-Pflicht – die steht bereits in `CLAUDE.md`.
  Nichts zu übertragen.

### Alter Rechner

Aufgeräumt: keine Worktrees, keine lokalen Branches außer `main`, Build- und Testreste gelöscht. Der Repo-Ordner
kann nach dem Kopieren von `telegram.env` gelöscht werden.
