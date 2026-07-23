export type LedgerThemeId = "light" | "dark";

let themeId: LedgerThemeId | null = null;
const STORAGE_KEY = "pbwork.ledger-planet.theme";

function storedTheme(): LedgerThemeId | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "dark" || value === "light" ? value : null;
}

export function ensureTheme(fromQuery?: string): LedgerThemeId {
  if (themeId == null) {
    themeId = storedTheme() ?? (fromQuery === "dark" ? "dark" : "light");
  }
  return themeId;
}

export function getTheme(fromQuery?: string): LedgerThemeId {
  return ensureTheme(fromQuery);
}

export function setTheme(next: LedgerThemeId) {
  themeId = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(
      new CustomEvent("ledger-theme-change", { detail: next }),
    );
  }
}

export function clearThemeSession() {
  themeId = null;
}
