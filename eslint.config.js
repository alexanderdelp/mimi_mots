import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // Python-Umgebungen, Modelle und erzeugte Audio-Kandidaten gehören nicht zum Projekt-Code
    ignores: [
      'dist',
      'node_modules',
      'playwright-report',
      'test-results',
      '.venv',
      '.venv-melo',
      '.models',
      'tools/stimmwahl',
      'tools/vergleich',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  prettier,
);
