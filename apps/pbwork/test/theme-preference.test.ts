import { beforeEach, describe, expect, it } from "vitest";
import {
  readRuntimeThemePreference,
  resolveThemeSync,
  resolveWorkbenchSessionTheme,
  routeHasExplicitTheme,
  stampThemeOnHref,
  writeRuntimeThemePreference,
} from "@/runtime/theme-preference";

describe("resolveThemeSync", () => {
  it("lets Capture/forced navigation pin the URL theme and write preference", () => {
    expect(
      resolveThemeSync({
        intent: "replace",
        urlThemeId: "dark",
        preference: "light",
        forced: true,
        themeExplicit: true,
      }),
    ).toEqual({ action: "write-preference", themeId: "dark" });
  });

  it("does not stamp preference over an explicit Case URL on first load", () => {
    expect(
      resolveThemeSync({
        intent: "push",
        urlThemeId: "dark",
        preference: null,
        forced: false,
        themeExplicit: true,
      }),
    ).toEqual({ action: "write-preference", themeId: "dark" });
  });

  it("writes preference from an in-app theme replace", () => {
    expect(
      resolveThemeSync({
        intent: "replace",
        urlThemeId: "dark",
        preference: "light",
        forced: false,
        themeExplicit: true,
      }),
    ).toEqual({ action: "write-preference", themeId: "dark" });
  });

  it("stamps current preference onto history back destinations", () => {
    expect(
      resolveThemeSync({
        intent: "back",
        urlThemeId: "light",
        preference: "dark",
        forced: false,
        themeExplicit: true,
      }),
    ).toEqual({ action: "stamp-url", themeId: "dark" });
  });

  it("keeps a Case URL on back when no preference exists", () => {
    expect(
      resolveThemeSync({
        intent: "back",
        urlThemeId: "light",
        preference: null,
        forced: false,
        themeExplicit: true,
      }),
    ).toEqual({ action: "keep", themeId: "light" });
  });

  it("restores preference when a non-back URL omitted theme", () => {
    expect(
      resolveThemeSync({
        intent: "replace",
        urlThemeId: "light",
        preference: "dark",
        forced: false,
        themeExplicit: false,
      }),
    ).toEqual({ action: "stamp-url", themeId: "dark" });
  });
});

describe("stampThemeOnHref", () => {
  it("rewrites theme without dropping variant or business query", () => {
    expect(
      stampThemeOnHref(
        "/prototype/hengdong/today?variant=default&theme=light",
        "dark",
      ),
    ).toBe("/prototype/hengdong/today?variant=default&theme=dark");
  });
});

describe("routeHasExplicitTheme", () => {
  it("detects the reserved theme query", () => {
    expect(routeHasExplicitTheme("/prototype/hengdong/today")).toBe(false);
    expect(
      routeHasExplicitTheme("/prototype/hengdong/today?variant=default&theme=dark"),
    ).toBe(true);
  });
});

describe("runtime theme preference storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips the session preference", () => {
    expect(readRuntimeThemePreference()).toBeNull();
    writeRuntimeThemePreference("dark");
    expect(readRuntimeThemePreference()).toBe("dark");
  });
});

describe("resolveWorkbenchSessionTheme", () => {
  it("ignores a historical destination theme on back", () => {
    expect(
      resolveWorkbenchSessionTheme({
        navigation: "back",
        destinationThemeId: "light",
        sessionThemeId: "dark",
      }),
    ).toBe("dark");
  });

  it("adopts iframe/toolbar theme on push and replace", () => {
    expect(
      resolveWorkbenchSessionTheme({
        navigation: "replace",
        destinationThemeId: "dark",
        sessionThemeId: "light",
      }),
    ).toBe("dark");
  });
});
