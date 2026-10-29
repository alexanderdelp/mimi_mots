// Startet ein Python-Skript mit dem Interpreter aus .venv (Windows: Scripts/, sonst bin/).
// Aufruf: node scripts/run-python.mjs <skript.py> [argumente …]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const venv = join(import.meta.dirname, '..', '.venv');
const python = [join(venv, 'Scripts', 'python.exe'), join(venv, 'bin', 'python')].find(existsSync);

if (!python) {
  console.error('Python-Umgebung .venv fehlt – Einrichtung siehe README.md („Audio erzeugen“).');
  process.exit(1);
}

const [script, ...args] = process.argv.slice(2);
const result = spawnSync(python, [join(import.meta.dirname, '..', script), ...args], {
  stdio: 'inherit',
  // UTF-8 auch in der Windows-Konsole (Umlaute, „Anführungszeichen“)
  env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
});
process.exit(result.status ?? 1);
