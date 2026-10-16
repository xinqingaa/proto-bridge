import { describe, expect, it, vi } from "vitest";
import { defineComponent, effectScope, h, provide, shallowRef } from "vue";
import { mount } from "@vue/test-utils";
import {
  loadBaseThemeSources,
  loadThemeSources,
} from "@/design-system/theme/sources";
import {
  createRuntimeThemeRegistry,
  RuntimeThemeError,
  ThemeTableKey,
  useRuntimeTheme,
  useTokenNumber,
} from "@/design-system/theme/runtime-theme";
import {
  concreteThemeMode,
  readThemePackPreference,
  THEME_PACK_PREFERENCE_KEY,
  useSystemThemeMode,
  writeThemePackPreference,
} from "@/runtime/theme-pack-preference";

describe("Runtime theme-pack preparation", () => {
  it("discovers the shipped base pack through the Runtime glob loader", () => {
    const sources = loadThemeSources();
    expect(sources.packs.get("pbwork-base")?.manifest.defaultTheme).toBe(
      "default",
    );
    expect(
      createRuntimeThemeRegistry(sources).resolve(
        "pbwork-base",
        "default",
        "dark",
      ).identity.mode,
    ).toBe("dark");
  });
  it("updates CSS and Vuetify from one reactive table without touching Workbench", () => {
    const selection = shallowRef({
      packId: "pbwork-base",
      theme: "default",
      mode: "light",
    });
    const theme = useRuntimeTheme(selection);
    const light = theme.table.value;
    expect(theme.vuetify.value.dark).toBe(false);
    expect(theme.cssVars.value["--pb-color-background"]).toBe(
      theme.vuetify.value.colors?.background,
    );
    expect(theme.attributes.value).toEqual({
      "data-pb-density": "regular",
      "data-pb-surface-treatment": "solid",
      "data-pb-motion": "standard",
    });
    expect(theme.density.value).toBe("comfortable");
    selection.value = { ...selection.value, mode: "dark" };
    expect(theme.table.value.identity.packDigest).toBe(
      light.identity.packDigest,
    );
    expect(theme.vuetify.value.dark).toBe(true);
    expect(theme.cssVars.value["--pb-color-background"]).not.toBe(
      light.values["color.background"],
    );
    expect(theme.vuetify.value.colors?.tooltip).toBe(
      theme.table.value.values["color.inverse-surface"],
    );
    selection.value = { ...selection.value, mode: "light" };
    expect(theme.table.value).toBe(light);
  });

  it("does not silently fall back for unknown combinations or invalid packs", () => {
    const sources = loadBaseThemeSources();
    const registry = createRuntimeThemeRegistry(sources);
    expect(() => registry.resolve("pbwork-base", "missing", "light")).toThrow(
      "UNKNOWN_THEME_COMBINATION",
    );
    expect(() => registry.resolve("missing", "default", "light")).toThrow(
      RuntimeThemeError,
    );
    const broken = sources.packs.get("pbwork-base")!;
    sources.packs.set("pbwork-base", { ...broken, semantic: { values: {} } });
    try {
      createRuntimeThemeRegistry(sources).resolve(
        "pbwork-base",
        "default",
        "light",
      );
      expect.fail("incomplete theme must block");
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeThemeError);
      expect(
        (error as RuntimeThemeError).diagnostics.some(
          (d) => d.severity === "block",
        ),
      ).toBe(true);
    }
  });

  it("keeps named themes independent from light/dark modes", () => {
    const sources = loadBaseThemeSources();
    sources.packs.set("sample", {
      manifest: {
        schemaVersion: 1,
        id: "sample",
        label: "Sample",
        scope: "playground",
        extends: "pbwork-base",
        modes: ["light", "dark"],
        defaultMode: "light",
        themes: [
          { id: "default", label: "Default" },
          { id: "rounded", label: "Rounded" },
        ],
        defaultTheme: "default",
      },
      semantic: { themes: { rounded: { values: { "radius.control": 20 } } } },
    });
    const registry = createRuntimeThemeRegistry(sources);
    const selection = shallowRef({
      packId: "sample",
      theme: "default",
      mode: "dark",
    });
    const runtime = useRuntimeTheme(selection, registry);
    const previousRadius = runtime.cssVars.value["--pb-radius-control"];
    selection.value = { ...selection.value, theme: "rounded" };
    expect(runtime.table.value.identity).toMatchObject({
      packId: "sample",
      theme: "rounded",
      mode: "dark",
    });
    expect(runtime.cssVars.value["--pb-radius-control"]).toBe("20px");
    expect(runtime.cssVars.value["--pb-radius-control"]).not.toBe(
      previousRadius,
    );
    expect(runtime.vuetify.value.dark).toBe(true);
  });

  it("injected JS tokens follow theme changes and reject nonnumeric values", () => {
    const registry = createRuntimeThemeRegistry(loadBaseThemeSources());
    const table = shallowRef(
      registry.resolve("pbwork-base", "default", "light"),
    );
    let numeric!: ReturnType<typeof useTokenNumber>;
    let color!: ReturnType<typeof useTokenNumber>;
    const Child = defineComponent({
      setup() {
        numeric = useTokenNumber("size.control");
        color = useTokenNumber("color.primary");
        return () => h("span");
      },
    });
    const wrapper = mount(
      defineComponent({
        setup() {
          provide(ThemeTableKey, table);
          return () => h(Child);
        },
      }),
    );
    expect(numeric.value).toBe(40);
    table.value = {
      ...table.value,
      values: { ...table.value.values, "size.control": 48 },
    };
    expect(numeric.value).toBe(48);
    expect(() => color.value).toThrow("THEME_TOKEN_NOT_NUMBER");
    wrapper.unmount();
  });
});

describe("per-prototype v2 theme preferences", () => {
  it("ignores v1 and preserves independent prototype theme/mode selections", () => {
    const values = new Map([["pbwork.runtime.theme.v1", "dark"]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    expect(readThemePackPreference("cold-chain", storage)).toBeNull();
    writeThemePackPreference(
      "cold-chain",
      { theme: "default", mode: "system" },
      storage,
    );
    writeThemePackPreference(
      "sample",
      { theme: "alternate", mode: "dark" },
      storage,
    );
    expect(readThemePackPreference("cold-chain", storage)).toEqual({
      theme: "default",
      mode: "system",
    });
    expect(readThemePackPreference("sample", storage)).toEqual({
      theme: "alternate",
      mode: "dark",
    });
    expect(values.has(THEME_PACK_PREFERENCE_KEY)).toBe(true);
    expect(readThemePackPreference("toString", storage)).toBeNull();
  });

  it("tolerates corrupt data and unavailable storage", () => {
    for (const serialized of [
      "invalid",
      "[]",
      "null",
      '{"demo":{"theme":"default","mode":"sepia"}}',
    ]) {
      expect(
        readThemePackPreference("demo", {
          getItem: () => serialized,
          setItem() {},
        }),
      ).toBeNull();
    }
    const blocked = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
    };
    expect(readThemePackPreference("demo", blocked)).toBeNull();
    expect(() =>
      writeThemePackPreference(
        "demo",
        { theme: "default", mode: "light" },
        blocked,
      ),
    ).not.toThrow();
  });

  it("tracks system changes and disposes its listener; explicit modes stay concrete", () => {
    const target = new EventTarget();
    const media = Object.assign(target, { matches: false });
    const remove = vi.spyOn(media, "removeEventListener");
    const scope = effectScope();
    const mode = scope.run(() => useSystemThemeMode(media as MediaQueryList))!;
    expect(mode.value).toBe("light");
    media.dispatchEvent(Object.assign(new Event("change"), { matches: true }));
    expect(mode.value).toBe("dark");
    expect(concreteThemeMode("system", mode.value)).toBe("dark");
    expect(concreteThemeMode("light", mode.value)).toBe("light");
    scope.stop();
    expect(remove).toHaveBeenCalledOnce();
    media.dispatchEvent(Object.assign(new Event("change"), { matches: false }));
    expect(mode.value).toBe("dark");
  });
});
