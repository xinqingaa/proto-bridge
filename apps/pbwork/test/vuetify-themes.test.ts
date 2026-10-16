import { describe, expect, it } from "vitest";
import { createVuetifyThemes } from "@/design-system/themes/createVuetifyThemes";
import { themeCssValues } from "@/design-system/theme/presentation";
import { vuetifyThemeBindings } from "@/design-system/themes/vuetify-bindings";
import { workbenchThemes } from "@/design-system/themes/workbench-themes";

describe("createVuetifyThemes", () => {
  it("maps Vuetify semantic colors from resolved tokens", () => {
    const themes = createVuetifyThemes();
    const light = themeCssValues("light");
    const dark = themeCssValues("dark");

    for (const [semantic, tokenId] of Object.entries(vuetifyThemeBindings)) {
      expect(themes.pbworkLight.colors![semantic]).toBe(String(light[tokenId]));
      expect(themes.pbworkDark.colors![semantic]).toBe(String(dark[tokenId]));
    }
    expect(themes.pbworkLight.dark).toBe(false);
    expect(themes.pbworkDark.dark).toBe(true);
  });

  it("keeps tooltip foreground and background as an explicit inverse pair", () => {
    const themes = createVuetifyThemes();

    expect(workbenchThemes.workbenchLight!.colors!.tooltip).toBe("#303236");
    expect(workbenchThemes.workbenchLight!.colors!["on-tooltip"]).toBe(
      "#ffffff",
    );
    expect(workbenchThemes.workbenchDark!.colors!.tooltip).toBe("#eef0f2");
    expect(workbenchThemes.workbenchDark!.colors!["on-tooltip"]).toBe(
      "#202124",
    );
    expect(themes.pbworkLight.colors!.tooltip).toBe(
      themeCssValues("light")["color.inverse-surface"],
    );
    expect(themes.pbworkDark.colors!["on-tooltip"]).toBe(
      themeCssValues("dark")["color.on-inverse-surface"],
    );
  });
});
