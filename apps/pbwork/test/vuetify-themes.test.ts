import { describe, expect, it } from "vitest";
import { createVuetifyThemes } from "@/design-system/themes/createVuetifyThemes";
import { resolveThemeTokens } from "@/design-system/resolveThemeTokens";
import { vuetifyThemeBindings } from "@/design-system/themes/vuetify-bindings";

describe("createVuetifyThemes", () => {
  it("maps Vuetify semantic colors from resolved tokens", () => {
    const themes = createVuetifyThemes();
    const light = resolveThemeTokens("light");
    const dark = resolveThemeTokens("dark");

    for (const [semantic, tokenId] of Object.entries(vuetifyThemeBindings)) {
      expect(themes.pbworkLight.colors[semantic]).toBe(String(light[tokenId]));
      expect(themes.pbworkDark.colors[semantic]).toBe(String(dark[tokenId]));
    }
    expect(themes.pbworkLight.dark).toBe(false);
    expect(themes.pbworkDark.dark).toBe(true);
  });
});
