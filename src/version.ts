// B-98: Version des Builds; die Werte setzt Vite beim Bauen (`define` in vite.config.ts).
import { versionLabel } from '../tools/build-info';

export const VERSION_LABEL = versionLabel(__APP_VERSION__, __APP_COMMIT__, __APP_BUILD_DATE__);
