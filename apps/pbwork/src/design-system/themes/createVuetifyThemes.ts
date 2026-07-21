import { loadThemes } from "@/design-system/loaders";
import { resolveThemeTokens } from "@/design-system/resolveThemeTokens";
import { vuetifyThemeBindings } from "@/design-system/themes/vuetify-bindings";
import type { TokenValue } from "@/design-system/types";

function colorsFromResolved(
  resolved: Record<string, TokenValue>,
): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const [semantic, tokenId] of Object.entries(vuetifyThemeBindings)) {
    const value = resolved[tokenId];
    if (value === undefined) {
      throw new Error(`MISSING_VUETIFY_TOKEN:${tokenId}`);
    }
    colors[semantic] = String(value);
  }
  return colors;
}

/** Build Vuetify ThemeDefinitions from Token + Theme overrides (single source). */
export function createVuetifyThemes() {
  const themes = loadThemes();
  const lightTheme = themes.find((item) => item.id === "light");
  const darkTheme = themes.find((item) => item.id === "dark");
  if (!lightTheme || !darkTheme) {
    throw new Error("MISSING_LIGHT_OR_DARK_THEME");
  }

  return {
    pbworkLight: {
      dark: lightTheme.dark,
      colors: colorsFromResolved(resolveThemeTokens("light")),
    },
    pbworkDark: {
      dark: darkTheme.dark,
      colors: colorsFromResolved(resolveThemeTokens("dark")),
    },
  };
}
