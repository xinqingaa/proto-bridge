import { THEME_ID_PATTERN } from "@proto-bridge/core/v2";
import {
  onScopeDispose,
  readonly,
  ref,
  computed,
  toValue,
  type MaybeRefOrGetter,
} from "vue";

const preferenceRevision = ref(0);

export const THEME_PACK_PREFERENCE_KEY = "pbwork.runtime.theme.v2";
export type ThemeModePreference = "light" | "dark" | "system";
export type ThemePackPreference = { theme: string; mode: ThemeModePreference };
type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

function storage(): PreferenceStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isPreference(value: unknown): value is ThemePackPreference {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.theme === "string" &&
    THEME_ID_PATTERN.test(record.theme) &&
    typeof record.mode === "string" &&
    ["light", "dark", "system"].includes(record.mode)
  );
}

function readAll(target: PreferenceStorage | null): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(
      target?.getItem(THEME_PACK_PREFERENCE_KEY) ?? "{}",
    );
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** v1 is deliberately never read: light/dark used to be a Theme ID. */
export function readThemePackPreference(
  prototypeId: string,
  target: PreferenceStorage | null = storage(),
): ThemePackPreference | null {
  const all = readAll(target);
  const value = Object.hasOwn(all, prototypeId) ? all[prototypeId] : undefined;
  return isPreference(value) ? { theme: value.theme, mode: value.mode } : null;
}

export function writeThemePackPreference(
  prototypeId: string,
  preference: ThemePackPreference,
  target: PreferenceStorage | null = storage(),
): void {
  if (!isPreference(preference)) throw new Error("INVALID_THEME_PREFERENCE");
  const all = { ...readAll(target), [prototypeId]: preference };
  try {
    target?.setItem(THEME_PACK_PREFERENCE_KEY, JSON.stringify(all));
    preferenceRevision.value++;
  } catch {
    /* Private browsing and storage quota must not block switching. */
  }
}

/** Follow the OS only while mode is system. Scope disposal releases the listener. */
export function useSystemThemeMode(
  media: MediaQueryList | null = typeof window !== "undefined" &&
  window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null,
) {
  const mode = ref<"light" | "dark">(media?.matches ? "dark" : "light");
  const update = (event: MediaQueryListEvent) => {
    mode.value = event.matches ? "dark" : "light";
  };
  media?.addEventListener("change", update);
  onScopeDispose(() => media?.removeEventListener("change", update));
  return readonly(mode);
}

export function concreteThemeMode(
  preference: ThemeModePreference,
  system: "light" | "dark",
) {
  return preference === "system" ? system : preference;
}

/** Observe both same-document writes and other same-origin Runtime frames. */
export function useThemePackPreference(prototypeId: MaybeRefOrGetter<string>) {
  const invalidate = (event: StorageEvent) => {
    if (event.key === THEME_PACK_PREFERENCE_KEY || event.key === null)
      preferenceRevision.value++;
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", invalidate);
    onScopeDispose(() => window.removeEventListener("storage", invalidate));
  }
  return computed(() => {
    void preferenceRevision.value;
    return readThemePackPreference(toValue(prototypeId));
  });
}
