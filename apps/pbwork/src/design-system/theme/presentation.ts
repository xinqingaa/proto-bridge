import {
  validateThemePacks,
  type ResolvedThemeTable,
  type ThemeDiagnostic,
} from "@proto-bridge/core/v2";
import type {
  TokenCategory,
  TokenRecord,
  ThemeRecord,
} from "@/design-system/types";
import { runtimeThemeSources, resolveRuntimeTheme } from "./runtime-theme";
import { themeTableToCssVars } from "./css-vars";
import { themeAssetUrl } from "./sources";

export type ThemePackOption = {
  id: string;
  label: string;
  scope: string;
  themes: Array<{ id: string; label: string }>;
  modes: string[];
  defaultTheme: string;
  defaultMode: string;
};

const APPEARANCE_LABELS: Record<string, string> = {
  "pbwork-base:default": "默认",
  "pbwork-sample:garden": "绿色",
  "pbwork-sample:citrus": "橙色",
};

export type AppearanceChoice = {
  id: string;
  label: string;
  packId: string;
  themeId: string;
};

/** Reviewer-facing appearances. Pack and theme ids stay internal. */
export function reviewAppearanceChoices(): AppearanceChoice[] {
  return reviewThemePackOptions().flatMap((pack) =>
    pack.themes.map((theme) => {
      const id = `${pack.id}:${theme.id}`;
      return {
        id,
        label: APPEARANCE_LABELS[id] ?? theme.label,
        packId: pack.id,
        themeId: theme.id,
      };
    }),
  );
}

/** Packs a reviewer can switch in Gallery and Playground. Prototype packs stay on their prototype. */
export function reviewThemePackOptions(): ThemePackOption[] {
  return [...runtimeThemeSources.packs.values()]
    .filter((pack) => pack.manifest.scope !== "prototype")
    .map((pack) => ({
      id: pack.manifest.id,
      label: pack.manifest.label,
      scope: pack.manifest.scope,
      themes: pack.manifest.themes.map((theme) => ({
        id: theme.id,
        label: theme.label,
      })),
      modes: [...pack.manifest.modes],
      defaultTheme: pack.manifest.defaultTheme,
      defaultMode: pack.manifest.defaultMode,
    }));
}

export function coercePackSelection(
  packId: string,
  theme: string,
  mode: string,
): { packId: string; theme: string; mode: string } {
  const manifest = runtimeThemeSources.packs.get(packId)?.manifest;
  return {
    packId,
    theme: manifest?.themes.some((item) => item.id === theme)
      ? theme
      : (manifest?.defaultTheme ?? theme),
    mode: manifest?.modes.includes(mode)
      ? mode
      : (manifest?.defaultMode ?? mode),
  };
}

export function resolvePackTheme(
  packId: string,
  theme: string,
  mode: string,
): ResolvedThemeTable {
  const selection = coercePackSelection(packId, theme, mode);
  return resolveRuntimeTheme(selection.packId, selection.theme, selection.mode);
}

export function themePackDiagnostics(packId: string): ThemeDiagnostic[] {
  return validateThemePacks({
    keyCatalog: runtimeThemeSources.keyCatalog,
    constants: runtimeThemeSources.constants,
    packs: runtimeThemeSources.packs,
  }).filter((item) => item.packId === packId);
}

export const normalizeTokenCssVarName = (id: string) =>
  `--pb-${id.replaceAll(".", "-")}`;
/** Display categories only; Core valueType owns units and resolution. */
export function themeKeyCategory(key: {
  id: string;
  valueType: string;
}): TokenCategory {
  const family = key.id.split(".")[0]!;
  if (["spacing", "radius", "opacity", "motion", "border"].includes(family))
    return family as TokenCategory;
  if (
    key.valueType === "typography" ||
    key.valueType === "color" ||
    key.valueType === "border"
  )
    return key.valueType;
  if (key.valueType === "shadow") return "elevation";
  if (key.valueType === "duration" || key.valueType === "easing")
    return "motion";
  if (key.valueType === "length") return "sizing";
  if (key.valueType === "filter" || key.valueType === "asset") return "effect";
  return "layout";
}
export function themePackCssValues(
  packId: string,
  theme: string,
  mode: string,
): Record<string, string> {
  const table = resolvePackTheme(packId, theme, mode);
  const css = themeTableToCssVars(
    table,
    runtimeThemeSources.keyCatalog,
    runtimeThemeSources.constants,
    themeAssetUrl,
  );
  return Object.fromEntries(
    Object.keys(table.values).map((id) => [
      id,
      css[normalizeTokenCssVarName(id)]!,
    ]),
  );
}

export function themeCssValues(mode: string): Record<string, string> {
  const pack = runtimeThemeSources.packs.get("pbwork-base")!.manifest;
  return themePackCssValues(pack.id, pack.defaultTheme, mode);
}
export function valuesToCssVars(
  values: Record<string, string | number>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([id, value]) => [
      normalizeTokenCssVarName(id),
      String(value),
    ]),
  );
}
/** Workbench display records; these are not the Evidence token Catalog. */
export function loadTokenPresentations(): TokenRecord[] {
  const css = themeCssValues("light");
  return runtimeThemeSources.keyCatalog.keys.map((key) => ({
    schemaVersion: 1,
    id: key.id,
    label: key.label ?? key.id,
    category: themeKeyCategory(key),
    defaultValue: css[key.id]!,
    ...(key.description ? { description: key.description } : {}),
  }));
}
export function loadModePresentations(): ThemeRecord[] {
  return runtimeThemeSources.packs
    .get("pbwork-base")!
    .manifest.modes.map((id) => ({
      schemaVersion: 1,
      id,
      label: id === "dark" ? "深色模式" : "浅色模式",
      dark: id === "dark",
      overrides: {},
    }));
}
