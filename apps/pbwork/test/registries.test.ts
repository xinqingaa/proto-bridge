import { describe, expect, it } from "vitest";
import { validateRegistries } from "@/design-system/validateRegistries";
import { loadTokens, loadThemes } from "@/design-system/loaders";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import { componentRecords } from "@/design-system/components/registry";
import { prototypes, prototypeScreens } from "@/prototypes/registry";

describe("registries", () => {
  it("accepts the shipped registries", () => {
    expect(validateRegistries()).toEqual([]);
  });

  it("rejects unknown theme token overrides", () => {
    const themes = loadThemes().map((theme) =>
      theme.id === "light"
        ? {
            ...theme,
            overrides: { ...theme.overrides, "color.missing": "#000" },
          }
        : theme,
    );
    const errors = validateRegistries({ themes });
    expect(
      errors.some(
        (error) =>
          error.resourceType === "theme" &&
          error.message.includes("unknown token"),
      ),
    ).toBe(true);
  });

  it("rejects duplicate screen ids and bad screenId formula", () => {
    const screens = [
      ...prototypeScreens,
      {
        ...prototypeScreens[0]!,
        screenId: "broken.id",
      },
    ];
    const errors = validateRegistries({
      screens: screens as typeof prototypeScreens,
    });
    expect(errors.some((error) => error.keyword === "const")).toBe(true);
  });

  it("requires every future Screen to author a complete default Evidence boundary", () => {
    const newScreen = {
      ...prototypeScreens.find(
        (screen) => screen.screenId === "cold-chain-ops.shipment-detail",
      )!,
      screenId: "cold-chain-ops.future-screen",
      screenSlug: "future-screen",
      path: "/prototype/cold-chain-ops/future-screen",
      defaultVariantId: "default",
      variants: [{ id: "default", label: "默认" }],
    };
    const errors = validateRegistries({
      screens: [...prototypeScreens, newScreen] as typeof prototypeScreens,
    });
    expect(
      errors.some(
        (error) =>
          error.resourceId === "cold-chain-ops.future-screen.default" &&
          error.instancePath === "/requiredFragments",
      ),
    ).toBe(true);
  });

  it("resolves theme tokens with overrides", () => {
    const light = resolveThemeTokens("light");
    const dark = resolveThemeTokens("dark");
    expect(light["color.primary"]).toBe("#2f73d2");
    expect(dark["color.primary"]).toBe("#83b2f2");
    expect(Object.keys(light).length).toBe(loadTokens().length);
  });

  it("keeps unitless tokens unitless while converting dimensions to px", () => {
    const vars = tokensToCssVars({
      "opacity.disabled": 0.38,
      "radius.md": 12,
      "spacing.4": 16,
    });
    expect(vars["--pb-opacity-disabled"]).toBe("0.38");
    expect(vars["--pb-radius-md"]).toBe("12px");
    expect(vars["--pb-spacing-4"]).toBe("16px");
  });
});

describe("design contracts", () => {
  it("ships the fixed component sample set", () => {
    expect(
      componentRecords.filter((item) => item.category === "basic"),
    ).toHaveLength(15);
    expect(
      componentRecords.filter((item) => item.category === "complex"),
    ).toHaveLength(14);
  });

  it("ships the expanded semantic token set", () => {
    expect(loadTokens()).toHaveLength(97);
    expect(new Set(loadTokens().map((item) => item.category))).toEqual(
      new Set([
        "color",
        "typography",
        "spacing",
        "sizing",
        "radius",
        "border",
        "elevation",
        "opacity",
        "motion",
      ]),
    );
  });

  it("ships the registered cold-chain prototype and its screens", () => {
    expect(prototypes.map((item) => item.id)).toEqual(["cold-chain-ops"]);
    const coldChainScreens = prototypeScreens.filter(
      (item) => item.prototypeId === "cold-chain-ops",
    );
    expect(coldChainScreens.map((item) => item.screenId)).toEqual([
      "cold-chain-ops.exception-queue",
      "cold-chain-ops.shipment-detail",
      "cold-chain-ops.resolution-form",
    ]);
    expect(
      coldChainScreens.flatMap((item) => item.requiredScenarioIds ?? []),
    ).toEqual([
      "focus-critical",
      "inspect-primary-exception",
      "reveal-response-options",
      "start-resolution",
      "reject-incomplete-resolution",
      "confirm-complete-resolution",
      "reject-missing-supervisor-approval",
    ]);
    const queue = prototypeScreens.find(
      (item) => item.screenId === "cold-chain-ops.exception-queue",
    );
    expect(queue?.variants.map((item) => item.id)).toEqual([
      "default",
      "critical-only",
      "loading",
      "empty",
      "error",
    ]);
    expect(queue?.actions?.map((item) => item.id)).toEqual([
      "show-critical",
      "open-primary-exception",
    ]);
    expect(queue?.scenarios?.map((item) => item.id)).toEqual([
      "focus-critical",
      "inspect-primary-exception",
    ]);
    expect(queue?.requiredScenarioIds).toEqual([
      "focus-critical",
      "inspect-primary-exception",
    ]);
  });
});

describe("resolveLiveTokenBindings", () => {
  it("updates radius, tone, and elevation from live props", async () => {
    const { resolveLiveTokenBindings } =
      await import("@/design-system/resolveLiveTokenBindings");
    const live = resolveLiveTokenBindings(
      {
        background: "color.primary",
        radius: "radius.md",
        elevation: "elevation.card",
        typography: "typography.content",
      },
      { tone: "error", radius: "lg", elevated: false },
    );
    expect(live.background).toBe("color.error");
    expect(live.radius).toBe("radius.lg");
    expect(live.elevation).toBe("none");
    expect(live.typography).toBe("typography.content");
  });

  it("keeps soft background tokens when tone changes", async () => {
    const { resolveLiveTokenBindings } =
      await import("@/design-system/resolveLiveTokenBindings");
    const live = resolveLiveTokenBindings(
      {
        background: "color.primary-soft",
        color: "color.primary",
        radius: "radius.full",
      },
      { tone: "success" },
    );
    expect(live.background).toBe("color.success-soft");
    expect(live.color).toBe("color.success");
  });

  it("maps button tone and onBackground without aliases", async () => {
    const { resolveLiveTokenBindings } =
      await import("@/design-system/resolveLiveTokenBindings");
    const action = resolveLiveTokenBindings(
      {
        background: "color.action",
        onBackground: "color.on-action",
      },
      { tone: "action", variant: "flat" },
    );
    expect(action.background).toBe("color.action");
    expect(action.onBackground).toBe("color.on-action");

    const primary = resolveLiveTokenBindings(
      {
        background: "color.action",
        onBackground: "color.on-action",
      },
      { tone: "primary", variant: "flat" },
    );
    expect(primary.background).toBe("color.primary");
    expect(primary.onBackground).toBe("color.on-primary");

    const tonal = resolveLiveTokenBindings(
      {
        background: "color.action",
        onBackground: "color.on-action",
      },
      { tone: "action", variant: "tonal" },
    );
    expect(tonal.background).toBe("color.action-soft");
  });

  it("maps button size to height and paddingX tokens", async () => {
    const { resolveLiveTokenBindings } =
      await import("@/design-system/resolveLiveTokenBindings");
    const live = resolveLiveTokenBindings(
      {
        height: "sizing.control-md",
        paddingX: "spacing.md",
      },
      { size: "sm" },
    );
    expect(live.height).toBe("sizing.control-sm");
    expect(live.paddingX).toBe("spacing.sm");
  });

  it("maps tabs selectionStyle to fixed primary tokens", async () => {
    const { resolveLiveTokenBindings } =
      await import("@/design-system/resolveLiveTokenBindings");
    const pill = resolveLiveTokenBindings(
      {
        activeBackground: "color.primary-soft",
        radius: "radius.full",
        border: "border.hairline",
      },
      { selectionStyle: "pill", showDivider: true },
    );
    expect(pill.activeBackground).toBe("color.primary-soft");
    expect(pill.radius).toBe("radius.full");
    expect(pill.border).toBe("border.hairline");

    const underline = resolveLiveTokenBindings(
      {
        activeBackground: "color.primary-soft",
        radius: "radius.full",
        border: "border.hairline",
      },
      { selectionStyle: "underline", showDivider: false },
    );
    expect(underline.activeBackground).toBe("transparent");
    expect(underline.radius).toBe("radius.md");
    expect(underline.border).toBe("transparent");
  });
});

describe("bind tokens", () => {
  it("lists only registered token ids", async () => {
    const { BIND_TOKEN_IDS } = await import("@/design-system/bindTokens");
    const ids = new Set(loadTokens().map((token) => token.id));
    for (const id of BIND_TOKEN_IDS) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("requires component tokenBindings to use the bind pool", async () => {
    const { loadComponentContracts } = await import("@/design-system/loaders");
    const { isAllowedTokenBindingValue } =
      await import("@/design-system/bindTokens");
    for (const contract of loadComponentContracts()) {
      for (const [slot, tokenId] of Object.entries(contract.tokenBindings)) {
        expect(
          isAllowedTokenBindingValue(tokenId),
          `${contract.id}.${slot}=${tokenId}`,
        ).toBe(true);
      }
    }
  });
});
