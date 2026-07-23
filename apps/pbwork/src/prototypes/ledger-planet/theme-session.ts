export type LedgerThemeId = "light" | "dark";

let themeId: LedgerThemeId | null = null;

export function ensureTheme(fromQuery?: string): LedgerThemeId {
  if (themeId == null) {
    themeId = fromQuery === "dark" ? "dark" : "light";
  }
  return themeId;
}

export function getTheme(fromQuery?: string): LedgerThemeId {
  return ensureTheme(fromQuery);
}

export function setTheme(next: LedgerThemeId) {
  themeId = next;
}

export function clearThemeSession() {
  themeId = null;
}
