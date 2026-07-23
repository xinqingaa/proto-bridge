import type { LedgerTab } from "./LedgerPlanetShell.vue";

let sessionTab: LedgerTab | null = null;

export function rememberTab(tab: LedgerTab) {
  sessionTab = tab;
}

export function readTab(fallback: LedgerTab): LedgerTab {
  return sessionTab ?? fallback;
}

export function clearTabSession() {
  sessionTab = null;
}
