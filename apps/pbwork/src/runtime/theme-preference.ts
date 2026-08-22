import type { RouteNavigationIntent } from "@/runtime/navigation-intent";

const STORAGE_KEY = "pbwork.runtime.theme.v1";

export type ThemeSyncInput = {
  intent: RouteNavigationIntent;
  urlThemeId: string;
  preference: string | null;
  forced: boolean;
  themeExplicit: boolean;
};

export type ThemeSyncResult = {
  action: "write-preference" | "stamp-url" | "keep";
  themeId: string;
};

function runtimeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readRuntimeThemePreference(): string | null {
  const value = runtimeStorage()?.getItem(STORAGE_KEY);
  return value && value.length > 0 ? value : null;
}

export function writeRuntimeThemePreference(themeId: string): void {
  runtimeStorage()?.setItem(STORAGE_KEY, themeId);
}

export function routeHasExplicitTheme(fullPath: string): boolean {
  const search = fullPath.includes("?")
    ? fullPath.slice(fullPath.indexOf("?") + 1)
    : "";
  return new URLSearchParams(search).has("theme");
}

export function stampThemeOnHref(href: string, themeId: string): string {
  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf("?");
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const search = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(search);
  params.set("theme", themeId);
  return `${path}?${params.toString()}${hash}`;
}

/**
 * Capture-safe theme policy:
 * - Forced / explicit URL (goto, prepare, share, toolbar) writes preference from URL.
 * - Back/forward stamps the destination URL to the session preference.
 * - Omitted theme on a non-back navigation keeps an existing preference.
 */
export function resolveThemeSync(input: ThemeSyncInput): ThemeSyncResult {
  if (input.forced) {
    return { action: "write-preference", themeId: input.urlThemeId };
  }
  if (input.intent === "back") {
    if (input.preference && input.preference !== input.urlThemeId) {
      return { action: "stamp-url", themeId: input.preference };
    }
    return { action: "keep", themeId: input.preference ?? input.urlThemeId };
  }
  if (!input.themeExplicit && input.preference) {
    if (input.preference !== input.urlThemeId) {
      return { action: "stamp-url", themeId: input.preference };
    }
    return { action: "keep", themeId: input.preference };
  }
  return { action: "write-preference", themeId: input.urlThemeId };
}

export function resolveWorkbenchSessionTheme(input: {
  navigation: RouteNavigationIntent;
  destinationThemeId: string;
  sessionThemeId: string | null;
}): string {
  if (input.navigation === "back") {
    return input.sessionThemeId ?? input.destinationThemeId;
  }
  return input.destinationThemeId;
}
