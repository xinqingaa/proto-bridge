import { describe, expect, it } from "vitest";
import {
  resolveThemeSync,
  routeHasExplicitTheme,
  routeHasExplicitMode,
  stampThemeOnHref,
  type ThemeSyncInput,
} from "@/runtime/theme-preference";
const base: ThemeSyncInput = {
  intent: "replace",
  url: { theme: "default", mode: "light" },
  preference: { theme: "alternate", mode: "dark" },
  forced: false,
  themeExplicit: true,
  modeExplicit: true,
  systemMode: "light",
};
describe("theme/mode synchronization", () => {
  it("pins both dimensions for forced Capture navigation even on history back", () => {
    expect(
      resolveThemeSync({ ...base, forced: true, intent: "back" }),
    ).toMatchObject({ action: "write-preference", preference: base.url });
  });
  it("uses explicit URL dimensions and stamps current preferences on history back", () => {
    expect(resolveThemeSync(base)).toMatchObject({
      action: "write-preference",
      preference: base.url,
    });
    expect(resolveThemeSync({ ...base, intent: "back" })).toMatchObject({
      action: "stamp-url",
      theme: "alternate",
      mode: "dark",
    });
  });
  it("resolves omitted dimensions independently", () => {
    expect(resolveThemeSync({ ...base, themeExplicit: false })).toMatchObject({
      theme: "alternate",
      mode: "light",
    });
    expect(resolveThemeSync({ ...base, modeExplicit: false })).toMatchObject({
      theme: "default",
      mode: "dark",
    });
    expect(resolveThemeSync({ ...base, preference: null })).toMatchObject({
      action: "write-preference",
      theme: "default",
      mode: "light",
    });
  });
  it("keeps system as preference while URLs carry concrete modes", () => {
    const input: ThemeSyncInput = {
      ...base,
      preference: { theme: "default", mode: "system" },
    };
    expect(resolveThemeSync(input)).toMatchObject({
      action: "keep",
      preference: { mode: "system" },
      mode: "light",
    });
    expect(
      resolveThemeSync({ ...input, intent: "back", systemMode: "dark" }),
    ).toMatchObject({
      action: "stamp-url",
      preference: { mode: "system" },
      mode: "dark",
    });
    expect(resolveThemeSync({ ...input, forced: true })).toMatchObject({
      action: "write-preference",
      preference: { mode: "light" },
    });
  });
  it("stamps both dimensions without losing business query or hash", () => {
    expect(
      stampThemeOnHref(
        "/prototype/demo/home?variant=sheet&shipment=SH-1#detail",
        "alternate",
        "dark",
      ),
    ).toBe(
      "/prototype/demo/home?variant=sheet&shipment=SH-1&theme=alternate&mode=dark#detail",
    );
    expect(
      routeHasExplicitTheme("/prototype/demo/home?theme=alternate&mode=dark"),
    ).toBe(true);
    expect(routeHasExplicitMode("/prototype/demo/home?mode=dark")).toBe(true);
    expect(routeHasExplicitMode("/prototype/demo/home")).toBe(false);
  });
});
