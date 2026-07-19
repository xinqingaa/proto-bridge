import { describe, expect, it } from "vitest";
import {
  readWhitelistedStyles,
  stylePropertyGroup,
} from "@/runtime/inspect/snapshot";
import { normalizeTokenCssVarName } from "@/design-system/resolveThemeTokens";
import { loadTokens } from "@/design-system/loaders";

describe("stylePropertyGroup", () => {
  it("maps whitelist properties into semantic inspector groups", () => {
    expect(stylePropertyGroup("background-color")).toBe("color");
    expect(stylePropertyGroup("font-size")).toBe("typography");
    expect(stylePropertyGroup("padding")).toBe("spacing-size");
    expect(stylePropertyGroup("width")).toBe("spacing-size");
    expect(stylePropertyGroup("border-radius")).toBe("border-radius");
    expect(stylePropertyGroup("box-shadow")).toBe("shadow-layout");
    expect(stylePropertyGroup("display")).toBe("shadow-layout");
  });
});

describe("readWhitelistedStyles", () => {
  it("attaches group and match source without exceeding row shape", () => {
    const surface = loadTokens().find((token) => token.id === "color.surface");
    expect(surface).toBeTruthy();

    const host = document.createElement("div");
    host.className = "runtime-app";
    const cssVar = normalizeTokenCssVarName("color.surface");
    host.style.setProperty(cssVar, String(surface!.defaultValue));
    document.body.appendChild(host);

    const target = document.createElement("div");
    target.style.backgroundColor = String(surface!.defaultValue);
    target.style.display = "block";
    host.appendChild(target);

    const rows = readWhitelistedStyles(target, ["color.surface"]);
    const background = rows.find((row) => row.property === "background-color");
    const display = rows.find((row) => row.property === "display");

    expect(background?.group).toBe("color");
    expect(background?.source).toBe("binding");
    expect(background?.tokenId).toBe("color.surface");
    expect(background?.cssVar).toBe(cssVar);

    expect(display?.group).toBe("shadow-layout");
    expect(display?.source).toBe("raw");
    expect(display?.tokenId).toBeUndefined();

    for (const row of rows) {
      expect(row).toEqual(
        expect.objectContaining({
          property: expect.any(String),
          value: expect.any(String),
          group: expect.any(String),
          source: expect.stringMatching(/^(binding|value-match|raw)$/),
        }),
      );
    }

    host.remove();
  });
});
