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

  it("keeps tooltip foreground and background as an explicit inverse pair", () => {
    const themes = createVuetifyThemes();

    expect(themes.workbenchLight.colors.tooltip).toBe("#303236");
    expect(themes.workbenchLight.colors["on-tooltip"]).toBe("#ffffff");
    expect(themes.workbenchDark.colors.tooltip).toBe("#eef0f2");
    expect(themes.workbenchDark.colors["on-tooltip"]).toBe("#202124");
    expect(themes.pbworkLight.colors.tooltip).toBe(
      themes.pbworkLight.colors.action,
    );
    expect(themes.pbworkDark.colors["on-tooltip"]).toBe(
      themes.pbworkDark.colors["on-action"],
    );
  });
});
