import {
  resolveAllThemeTables,
  type ResolvedThemeTable,
  type ThemeDiagnostic,
} from "@proto-bridge/core/v2";
import {
  computed,
  inject,
  toValue,
  type InjectionKey,
  type MaybeRefOrGetter,
  type Ref,
} from "vue";
import { themeTableToCssVars } from "./css-vars";
import {
  loadThemeSources,
  themeAssetUrl,
  type BaseThemeSources,
} from "./sources";
import { runtimeVuetifyDensity, runtimeVuetifyTheme } from "./vuetify-theme";

export const ThemeTableKey: InjectionKey<Readonly<Ref<ResolvedThemeTable>>> =
  Symbol("pbwork-theme-table");

export class RuntimeThemeError extends Error {
  constructor(
    message: string,
    public readonly diagnostics: readonly ThemeDiagnostic[] = [],
  ) {
    super(message);
    this.name = "RuntimeThemeError";
  }
}

/** Create a registry per source version; all combinations share the Core digest. */
export function createRuntimeThemeRegistry(
  sources: BaseThemeSources,
  assetUrl?: (packId: string, file: string) => string,
) {
  const packs = new Map(sources.packs);
  const cache = new Map<string, ReturnType<typeof resolveAllThemeTables>>();
  const cssCache = new WeakMap<ResolvedThemeTable, Record<string, string>>();

  function resolve(packId: string, theme: string, mode: string) {
    let result = cache.get(packId);
    if (!result) {
      result = resolveAllThemeTables({ ...sources, packs, packId });
      cache.set(packId, result);
    }
    if (!result.digest)
      throw new RuntimeThemeError(
        `INVALID_THEME_PACK:${packId}`,
        result.diagnostics,
      );
    const table = result.tables.find(
      (entry) => entry.identity.theme === theme && entry.identity.mode === mode,
    );
    if (!table)
      throw new RuntimeThemeError(
        `UNKNOWN_THEME_COMBINATION:${packId}/${theme}/${mode}`,
      );
    return table;
  }

  function cssVars(table: ResolvedThemeTable) {
    let css = cssCache.get(table);
    if (!css) {
      css = Object.freeze(
        themeTableToCssVars(
          table,
          sources.keyCatalog,
          sources.constants,
          assetUrl,
        ),
      );
      cssCache.set(table, css);
    }
    return css;
  }

  return { resolve, cssVars };
}

export const runtimeThemeSources = loadThemeSources();
const defaultRegistry = createRuntimeThemeRegistry(
  runtimeThemeSources,
  themeAssetUrl,
);

export const resolveRuntimeTheme = defaultRegistry.resolve;

export function useRuntimeTheme(
  selection: MaybeRefOrGetter<{ packId: string; theme: string; mode: string }>,
  registry = defaultRegistry,
) {
  const table = computed(() => {
    const { packId, theme, mode } = toValue(selection);
    return registry.resolve(packId, theme, mode);
  });
  return {
    table,
    cssVars: computed(() => registry.cssVars(table.value)),
    attributes: computed(() => runtimeThemeAttributes(table.value)),
    vuetify: computed(() => runtimeVuetifyTheme(table.value)),
    density: computed(() => runtimeVuetifyDensity(table.value)),
  };
}

/** Reactive root presentation; these attributes describe the resolved enum values. */
export function runtimeThemeAttributes(table: ResolvedThemeTable) {
  return {
    "data-pb-density": String(table.values.density),
    "data-pb-surface-treatment": String(table.values["surface.treatment"]),
    "data-pb-motion": String(table.values["motion.personality"]),
  };
}

export function useToken(key: MaybeRefOrGetter<string>) {
  const table = inject(ThemeTableKey);
  if (!table) throw new Error("MISSING_THEME_TABLE_PROVIDER");
  return computed(() => {
    const id = toValue(key);
    if (!Object.hasOwn(table.value.values, id)) throw new Error(`UNKNOWN_THEME_KEY:${id}`);
    const value = table.value.values[id];
    if (value === undefined) throw new Error(`UNKNOWN_THEME_KEY:${key}`);
    return value;
  });
}

export function useTokenNumber(key: MaybeRefOrGetter<string>) {
  const token = useToken(key);
  return computed(() => {
    if (typeof token.value !== "number")
      throw new Error(`THEME_TOKEN_NOT_NUMBER:${key}`);
    return token.value;
  });
}
