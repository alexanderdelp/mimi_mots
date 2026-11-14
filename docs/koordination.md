# Koordination: mit mehreren Sessions weiterentwickeln

Für eine Session, die **koordiniert** (Start mit `/koordinieren` oder „Du bist Koordinator“). Der Mensch redet nur
mit dem Koordinator (Chat oder Telegram); der Koordinator startet und steuert die Arbeits-Sessions. Ergänzt
„Arbeitsweise“ und „Parallel mit Koordinator“ in `CLAUDE.md`; bei Widerspruch gilt `CLAUDE.md`.

## Rollen

| Rolle | Macht | Macht nicht |
|---|---|---|
| **Koordinator** (eine Session) | Aufgaben aus `backlog.md` auswählen und zerlegen, Sessions starten, Rückfragen beantworten, Branches prüfen, Abnahme beim Menschen einholen, Akzeptanztests und Häkchen in `backlog.md`, Entscheidungen in `anforderungen.md`, Archiv, Version, PR, Merge, Tag, Telegram | selbst große Aufgabenarbeit (nur Kleinigkeiten und Knotenpunkte) |
| **Arbeits-Session** (je Aufgabe eine) | im eigenen Worktree auf `feat/b-NN-…` / `fix/…` genau eine Aufgabe umsetzen: Akzeptanztests als Playwright-Tests, Implementierung, Unit-Tests, Commit, Übergabe | Version, Knotenpunkte ändern, PR, Merge, Push, Telegram, Fragen an den Menschen |

**Knotenpunkte** (nur der Koordinator ändert sie; Arbeits-Sessions beschreiben nötige Änderungen in der Übergabe):
`backlog.md`, `anforderungen.md`, `docs/archiv/`, `CLAUDE.md`, `package.json`, `package-lock.json`,
`vite.config.ts`, `playwright.config.ts`, `.github/`, Referenzbilder in `tests/e2e/b60-layout.spec.ts-snapshots/`.

## Ablauf je Wunsch

1. **Verstehen:** Beim Start den Telegram-Posteingang lesen (`npm run telegram -- inbox`). Gehört eine
   Entscheidung dem Menschen (Abweichung von `anforderungen.md`, Optik, Umfang, Speicherformat), per Telegram
   fragen (`npm run telegram -- ask "Mimi & Mots: …" <Optionen> --wait 600`, Screenshot dazu, wenn er die Frage
   erklärt). Sonst selbst entscheiden und im Bericht nennen.
2. **Planen:** Aufgaben aus `backlog.md` von oben nehmen. Vor dem Start prüfen, welche Dateien eine Aufgabe
   voraussichtlich anfasst. **Nur unabhängige Aufgaben parallel**; Aufgaben, die `storage.ts`/`AppData` oder
   `state.ts` umbauen, laufen allein. Akzeptanztests (`AT-NN.x`) mit der Session abstimmen und in `backlog.md`
   eintragen.
3. **Starten:** je Aufgabe eine Session (Claude-Desktop: `start_session`, eigener Worktree, `context: "fresh"`),
   höchstens **3 gleichzeitig**. Jede Session bekommt eigene Ports (Session 1 `DEV_PORT=5182 PREVIEW_PORT=4182`,
   Session 2 `5183`/`4183`, Session 3 `5184`/`4184`). Brief nach der Vorlage unten.
4. **Warten:** Die Sessions melden sich selbst zurück; nicht abfragen. Rückfragen der Sessions beantworten
   (`SendMessage` an die Session), Fragen an den Menschen bündeln.
5. **Prüfen:** Diff des Branches lesen (nicht nur der Übergabe glauben), im Worktree `npm run lint`,
   `npm run test` und die betroffenen E2E-Tests grün, Screenshots bei sichtbaren Änderungen ansehen.
6. **Abnahme:** Übergabe an den Menschen im Chat und per Telegram mit Screenshots (iPad 1180 × 820, bei Layout
   auch iPhone; nur Testdaten), Hinweis, wie er lokal prüft (Dev-Server/Preview des Worktrees mit dessen Ports).
   Ohne Abnahme kein Pull Request.
7. **Zusammenführen** nacheinander: Branch auf aktuellen `main` bringen, Knotenpunkte nachziehen (Häkchen,
   Aufgabe samt Akzeptanztests ans Ende von `docs/archiv/backlog-erledigt.md`, Entscheidungen,
   Version nach „Versionierung“), komplette Suite (`npm run lint`, `npm run test`, `npm run test:e2e`,
   `npm run build`, im Hintergrund). Referenzbilder erneuert erst, wer als Zweiter mergt (mit Sichtprüfung).
   Commit, Push, PR nach `main`, mergen, Tag `vX.Y.Z` auf dem Merge-Commit pushen.
8. **Abschließen:** Telegram-Fertigmeldung (Version, Neues, Offenes). Worktrees und gemergte Branches lokal
   und auf GitHub löschen, `main` aktualisieren.

## Vorlage für einen Session-Brief

```
Aufgabe: B-NN <Titel aus backlog.md>  (Wunsch des Menschen wörtlich, falls vorhanden: „…“)

Kontext: backlog.md → B-NN, betroffene Bereiche: <src/…>. Lies CLAUDE.md und docs/koordination.md
  (du bist Arbeits-Session).
Aufgabe: <was genau; was ausdrücklich nicht>
Akzeptanztests: <AT-NN.1 …> (als Playwright-Tests umsetzen, zuerst schreiben)
Fertig, wenn: alle Akzeptanztests und alle bisherigen Tests grün, npm run lint grün, Definition of Done aus
  CLAUDE.md erfüllt; bei Optik Screenshots (iPad 1180 × 820, bei Layout auch iPhone) im Worktree abgelegt.
Ports: DEV_PORT=<5182> PREVIEW_PORT=<4182> bei allen npm run dev/preview/test:e2e.
Branch: feat/b-NN-<kurzname>. backlog.md, anforderungen.md, package.json, Referenzbilder nicht ändern; nicht
  pushen, kein PR, keine Version, kein Telegram. Rückfragen an den Koordinator (SendMessage), nicht an den Menschen.
Ende mit Übergabe: was geändert ist, Dateien, Tests, Screenshot-Pfade, Entscheidungen für anforderungen.md,
  gewünschte Änderungen an Knotenpunkten, Offenes.
```

## Regeln

- **Eine Aufgabe, eine Session.** Überschneiden sich Dateien, nacheinander statt parallel; spätere Aufgaben
  starten dann vom neuen `main`.
- **Neuer Worktree:** einmal `npm ci`.
- **Gesamttests vor jedem Merge.**
- Telegram bleibt der Kanal zum Menschen (siehe `CLAUDE.md`); Arbeits-Sessions schreiben nie selbst dorthin.
- Kleine Aufgaben (ein paar Tool-Aufrufe) macht der Koordinator selbst; eine Session lohnt sich erst für echte
  Aufgabenarbeit.
