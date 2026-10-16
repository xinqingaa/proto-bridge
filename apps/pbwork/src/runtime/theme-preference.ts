import type { RouteNavigationIntent } from "@/runtime/navigation-intent";
import type { ThemePackPreference } from "./theme-pack-preference";
import { concreteThemeMode } from "./theme-pack-preference";

export type ThemeSyncInput = {
  intent: RouteNavigationIntent;
  url: { theme: string; mode: "light" | "dark" };
  preference: ThemePackPreference | null;
  forced: boolean;
  themeExplicit: boolean;
  modeExplicit: boolean;
  systemMode: "light" | "dark";
};
export type ThemeSyncResult = {
  action: "write-preference" | "stamp-url" | "keep";
  preference: ThemePackPreference;
  theme: string;
  mode: "light" | "dark";
};

/** URL pins explicit dimensions; history restores the current prototype preference. */
export function resolveThemeSync(input: ThemeSyncInput): ThemeSyncResult {
  const saved = input.preference;
  const useSaved = saved && !input.forced && input.intent === "back";
  const theme =
    useSaved || (saved && !input.forced && !input.themeExplicit)
      ? saved!.theme
      : input.url.theme;
  const mode =
    useSaved || (saved && !input.forced && !input.modeExplicit)
      ? saved!.mode
      : saved?.mode === "system" &&
          !input.forced &&
          input.url.mode === concreteThemeMode("system", input.systemMode)
        ? "system"
        : input.url.mode;
  const preference: ThemePackPreference = { theme, mode };
  const concreteMode = concreteThemeMode(mode, input.systemMode);
  const changedUrl =
    theme !== input.url.theme || concreteMode !== input.url.mode;
  return {
    action: changedUrl
      ? "stamp-url"
      : saved?.theme === theme && saved.mode === mode
        ? "keep"
        : "write-preference",
    preference,
    theme,
    mode: concreteMode,
  };
}

export function routeHasExplicitTheme(fullPath: string): boolean {
  return new URL(fullPath, "http://runtime.local").searchParams.has("theme");
}
export function routeHasExplicitMode(fullPath: string): boolean {
  return new URL(fullPath, "http://runtime.local").searchParams.has("mode");
}
export function stampThemeOnHref(
  href: string,
  theme: string,
  mode: "light" | "dark",
): string {
  const url = new URL(href, "http://runtime.local");
  url.searchParams.set("theme", theme);
  url.searchParams.set("mode", mode);
  return `${url.pathname}${url.search}${url.hash}`;
}
