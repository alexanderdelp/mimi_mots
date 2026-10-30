// B-71: Prüfstand der Hörprüfung aus audio-check.md – je Wort und Sprache abgehakt oder offen.
export type CheckLanguage = 'en' | 'fr' | 'ja' | 'it';

export interface CheckRow {
  checked: Record<CheckLanguage, boolean>;
}

const LANGUAGES: readonly CheckLanguage[] = ['en', 'fr', 'ja', 'it'];

/** Liest die Tabelle `| id | Deutsch | EN | ok | FR | ok | JA | ok | IT | ok |` (IT seit B-80,
 *  ohne Notizspalte seit B-85). */
export function parseAudioCheck(markdown: string): Map<string, CheckRow> {
  const rows = new Map<string, CheckRow>();
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('| ')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 10 || cells[0] === 'id' || !/^[a-z]+$/.test(cells[0])) continue;
    const ok = [cells[3], cells[5], cells[7], cells[9]];
    rows.set(cells[0], {
      checked: Object.fromEntries(
        LANGUAGES.map((l, i) => [l, /\[x\]/i.test(ok[i])]),
      ) as CheckRow['checked'],
    });
  }
  return rows;
}

/** Abgehakt? Wörter, die (noch) nicht in der Datei stehen, gelten als offen. */
export function isChecked(rows: Map<string, CheckRow>, id: string, lang: CheckLanguage): boolean {
  return rows.get(id)?.checked[lang] ?? false;
}
