import type { ResolvedThemeTable } from "@proto-bridge/core/v2";
import type { ThemeDefinition } from "vuetify";
import { useTheme } from "vuetify";
import { computed, watch, type Ref } from "vue";
import { vuetifyThemeBindings } from "@/design-system/themes/vuetify-bindings";

/** Convert the same resolved table used by CSS; never read legacy Token defaults. */
export function runtimeVuetifyTheme(
  table: ResolvedThemeTable,
): ThemeDefinition {
  const colors: Record<string, string> = {};
  const bindings = {
    ...vuetifyThemeBindings,
    tooltip: "color.inverse-surface",
    "on-tooltip": "color.on-inverse-surface",
  };
  for (const [slot, key] of Object.entries(bindings)) {
    const value = table.values[key];
    if (typeof value !== "string")
      throw new Error(`MISSING_VUETIFY_COLOR:${key}`);
    colors[slot] = value;
  }
  if (table.identity.mode !== "light" && table.identity.mode !== "dark")
    throw new Error(`UNSUPPORTED_VUETIFY_MODE:${table.identity.mode}`);
  return { dark: table.identity.mode === "dark", colors };
}

export function runtimeVuetifyDensity(table: ResolvedThemeTable) {
  switch (table.values.density) {
    case "compact":
      return "compact";
    case "regular":
      return "comfortable";
    case "comfortable":
      return "default";
    default:
      throw new Error(`INVALID_THEME_DENSITY:${String(table.values.density)}`);
  }
}

/** Register in the shared registry, then select locally through VApp/VThemeProvider. */
export function useRuntimeVuetifyTheme(
  table: Readonly<Ref<ResolvedThemeTable>>,
) {
  const vuetify = useTheme();
  const name = computed(() => {
    const { packId, theme, mode, packDigest } = table.value.identity;
    return `pb-${packId}-${theme}-${mode}-${packDigest.slice(5)}`;
  });
  watch(
    table,
    (value) => {
      const definition = runtimeVuetifyTheme(value);
      const base = vuetify.themes.value.light ?? vuetify.current.value;
      vuetify.themes.value[name.value] = {
        dark: definition.dark ?? false,
        colors: {
          ...base.colors,
          ...Object.fromEntries(
            Object.entries(definition.colors ?? {}).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === "string",
            ),
          ),
        },
        variables: { ...base.variables },
      };
    },
    { immediate: true, flush: "sync" },
  );
  return name;
}
