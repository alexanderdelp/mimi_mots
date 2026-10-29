/** Eine Ansicht: ihr Wurzelelement und optional eine Aufräumfunktion (z. B. Abmelden vom Store). */
export interface ViewHandle {
  el: HTMLElement;
  dispose?(): void;
}
