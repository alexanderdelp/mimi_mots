// B-71: Prüfstand der Hörprüfung aus audio-check.md – je Wort und Sprache abgehakt oder offen.
export type CheckLanguage = 'en' | 'fr' | 'ja';

export interface CheckRow {
  checked: Record<CheckLanguage, boolean>;
  note: string;
}

const LANGUAGES: readonly CheckLanguage[] = ['en', 'fr', 'ja'];

/** Liest die Tabelle `| id | Deutsch | EN | ok | FR | ok | JA | ok | neu |`. */
export function parseAudioCheck(markdown: string): Map<string, CheckRow> {
  const rows = new Map<string, CheckRow>();
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('| ')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 9 || cells[0] === 'id' || !/^[a-z]+$/.test(cells[0])) continue;
    const ok = [cells[3], cells[5], cells[7]];
    rows.set(cells[0], {
      checked: Object.fromEntries(
        LANGUAGES.map((l, i) => [l, /\[x\]/i.test(ok[i])]),
      ) as CheckRow['checked'],
      note: cells[8],
    });
  }
  return rows;
}

/** Abgehakt? Wörter, die (noch) nicht in der Datei stehen, gelten als offen. */
export function isChecked(rows: Map<string, CheckRow>, id: string, lang: CheckLanguage): boolean {
  return rows.get(id)?.checked[lang] ?? false;
}
