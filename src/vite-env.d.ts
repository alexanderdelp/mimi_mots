/// <reference types="vite/client" />

// B-98: beim Bauen per Vite `define` eingesetzt (vite.config.ts)
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILD_DATE__: string;
// Cloudflare-Umgebungen: Branch des Builds und Umgebung (produktion/integration/abnahme/lokal)
declare const __APP_BRANCH__: string;
declare const __APP_STAGE__: string;
