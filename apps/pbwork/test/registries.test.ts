import { describe, expect, it } from "vitest";
import { SEMANTIC_ROLES, TOKEN_BINDING_LITERALS } from "@proto-bridge/core/v2";
import { validateRegistries } from "@/design-system/validateRegistries";
import { BIND_TOKEN_SPECIAL_VALUES } from "@/design-system/bindTokens";
import componentSchema from "@/design-system/schemas/component.schema.json";
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

  it("rejects numeric pbKey values on required Fragments and Actions", () => {
    const settings = prototypeScreens.find(
      (screen) => screen.screenId === "hengdong.settings-goals",
    )!;
    const screens = prototypeScreens.map((screen) =>
      screen.screenId === settings.screenId
        ? {
            ...screen,
            variants: screen.variants.map((variant) =>
              variant.id === "weekly-open"
                ? {
                    ...variant,
                    requiredFragments: variant.requiredFragments?.map(
                      (fragment) =>
                        fragment.pbId ===
                        "hengdong.settings-goals.weekly-option"
                          ? { ...fragment, pbKey: "3" }
                          : fragment,
                    ),
                  }
                : variant,
            ),
          }
        : screen,
    );
    const errors = validateRegistries({
      screens: screens as typeof prototypeScreens,
    });
    expect(
      errors.some(
        (error) =>
          error.instancePath.endsWith("/pbKey") &&
          error.message.includes("stable lowercase identifier"),
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
  it("derives component roles and binding literals from the Core vocabulary", () => {
    expect(componentSchema.$defs.semanticRole.enum).toEqual(
      SEMANTIC_ROLES.filter((role) => role !== "unknown"),
    );
    expect(BIND_TOKEN_SPECIAL_VALUES).toEqual(TOKEN_BINDING_LITERALS);
  });

  it("ships the fixed component sample set", () => {
    expect(componentRecords).toHaveLength(32);
    expect(
      componentRecords.filter((item) => item.category === "action"),
    ).toHaveLength(3);
    expect(
      componentRecords.filter((item) => item.category === "input"),
    ).toHaveLength(7);
    expect(
      componentRecords.filter((item) => item.category === "display"),
    ).toHaveLength(8);
    expect(
      componentRecords.filter((item) => item.category === "navigation"),
    ).toHaveLength(7);
    expect(
      componentRecords.filter((item) => item.category === "data"),
    ).toHaveLength(2);
    expect(
      componentRecords.filter((item) => item.category === "feedback"),
    ).toHaveLength(5);
  });

  it("ships the expanded semantic token set", () => {
    expect(loadTokens()).toHaveLength(154);
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
        "layout",
        "layer",
        "effect",
      ]),
    );
  });

  it("ships the registered cold-chain prototype and its screens", () => {
    expect(prototypes.map((item) => item.id)).toEqual([
      "cold-chain-ops",
      "hengdong",
    ]);
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
      "warning-only",
      "attention-only",
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

  it("ships the redesigned hengdong prototype and its ten purposeful screens", () => {
    const hengdongScreens = prototypeScreens.filter(
      (item) => item.prototypeId === "hengdong",
    );
    expect(hengdongScreens.map((item) => item.screenSlug)).toEqual([
      "login",
      "register",
      "today",
      "activity-history",
      "plans",
      "progress",
      "plan-detail",
      "workout-session",
      "workout-complete",
      "settings-goals",
    ]);
    expect(
      hengdongScreens.every(
        (screen) =>
          (screen.variants.find((variant) => variant.id === "default")
            ?.requiredFragments?.length ?? 0) > 0,
      ),
    ).toBe(true);

    const today = hengdongScreens.find(
      (screen) => screen.screenId === "hengdong.today",
    );
    expect(today?.variants.map((variant) => variant.id)).toEqual(
      expect.arrayContaining([
        "record-detail-open",
        "record-detail-quick",
        "record-detail-long-note",
      ]),
    );
    expect(
      today?.variants.find((variant) => variant.id === "record-detail-open")
        ?.requiredFragments,
    ).toEqual(
      expect.arrayContaining([
        {
          screenId: "hengdong.today",
          pbId: "hengdong.today.record-detail-outcome",
        },
        {
          screenId: "hengdong.today",
          pbId: "hengdong.today.record-detail-facts",
        },
        {
          screenId: "hengdong.today",
          pbId: "hengdong.today.record-detail-exercises",
        },
        {
          screenId: "hengdong.today",
          pbId: "hengdong.today.record-detail-note",
        },
      ]),
    );

    const login = hengdongScreens.find(
      (screen) => screen.screenId === "hengdong.login",
    );
    expect(login?.variants.map((variant) => variant.id)).toEqual([
      "default",
      "ready",
      "validation-error",
      "invalid-credentials",
      "no-identity",
    ]);
    expect(login?.requiredScenarioIds).toEqual([
      "enter-with-local-identity",
      "reject-invalid-credentials",
      "open-local-registration",
    ]);

    const register = hengdongScreens.find(
      (screen) => screen.screenId === "hengdong.register",
    );
    expect(register?.variants.map((variant) => variant.id)).toEqual([
      "default",
      "ready",
      "validation-error",
      "replace-identity",
      "replace-confirm-open",
    ]);
    expect(register?.requiredScenarioIds).toEqual([
      "create-local-identity",
      "request-identity-replacement",
      "confirm-identity-replacement",
    ]);

    const plans = hengdongScreens.find(
      (screen) => screen.screenId === "hengdong.plans",
    );
    expect(plans?.variants.map((variant) => variant.id)).toEqual([
      "default",
      "filtered",
      "empty",
      "plan-editor-open",
      "plan-editor-validation",
    ]);
    expect(plans?.requiredScenarioIds).toEqual([
      "open-current-plan-detail",
      "start-current-plan-from-plans",
      "open-candidate-plan",
    ]);

    const planDetail = hengdongScreens.find(
      (screen) => screen.screenId === "hengdong.plan-detail",
    );
    expect(planDetail?.variants.map((variant) => variant.id)).toEqual([
      "default",
      "plan-editor-open",
      "candidate",
      "adopted-feedback",
      "invalid-plan",
      "plan-editor-validation",
    ]);
    expect(planDetail?.requiredScenarioIds).toEqual([
      "start-current-plan-from-detail",
      "adopt-candidate-plan",
      "start-candidate-once",
    ]);

    const settings = hengdongScreens.find(
      (screen) => screen.screenId === "hengdong.settings-goals",
    );
    expect(
      settings?.variants.find((variant) => variant.id === "weekly-open")
        ?.requiredFragments,
    ).toEqual(
      expect.arrayContaining([
        {
          screenId: "hengdong.settings-goals",
          pbId: "hengdong.settings-goals.weekly-option",
          pbKey: "times-3",
        },
      ]),
    );
    expect(
      settings?.actions?.find((action) => action.id === "choose-weekly-target")
        ?.target,
    ).toEqual(
      expect.objectContaining({
        pbId: "hengdong.settings-goals.weekly-option",
        pbKey: "times-4",
      }),
    );
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

  it("maps button kind to token bindings", async () => {
    const { resolveLiveTokenBindings } =
      await import("@/design-system/resolveLiveTokenBindings");
    const action = resolveLiveTokenBindings(
      {
        background: "color.action",
        border: "color.action",
        onBackground: "color.on-action",
      },
      { kind: "primary" },
    );
    expect(action.background).toBe("color.action");
    expect(action.border).toBe("color.action");
    expect(action.onBackground).toBe("color.on-action");

    const secondary = resolveLiveTokenBindings(
      {
        background: "color.action",
        border: "color.action",
        onBackground: "color.on-action",
      },
      { kind: "secondary" },
    );
    expect(secondary.background).toBe("color.action-soft");
    expect(secondary.onBackground).toBe("color.action");

    const outlined = resolveLiveTokenBindings(
      {
        background: "color.action",
        border: "color.action",
        onBackground: "color.on-action",
      },
      { kind: "outlined" },
    );
    expect(outlined.background).toBe("transparent");
    expect(outlined.border).toBe("color.outline");
    expect(outlined.onBackground).toBe("color.on-surface");
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

  it("maps tab appearance props to fixed primary tokens", async () => {
    const { resolveLiveTokenBindings } =
      await import("@/design-system/resolveLiveTokenBindings");
    const pill = resolveLiveTokenBindings(
      {
        activeBackground: "color.primary-soft",
        radius: "radius.full",
        border: "border.hairline",
      },
      { showDivider: true },
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
      { variant: "underline", showDivider: false },
    );
    expect(underline.activeBackground).toBe("transparent");
    expect(underline.radius).toBe("radius.md");
    expect(underline.border).toBe("transparent");

    const minimal = resolveLiveTokenBindings(
      {
        activeBackground: "color.primary-soft",
        radius: "radius.full",
        border: "border.hairline",
      },
      { variant: "minimal", showDivider: true },
    );
    expect(minimal.activeBackground).toBe("transparent");
    expect(minimal.radius).toBe("radius.md");
    expect(minimal.border).toBe("border.hairline");
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

  it("makes every declared disabled state a shared 0.38 interaction rule", async () => {
    const { loadComponentContracts } = await import("@/design-system/loaders");
    for (const contract of loadComponentContracts()) {
      const schema = contract.propsSchema as {
        properties?: Record<string, unknown>;
      };
      if (!schema.properties?.disabled) continue;
      expect(contract.tokenBindings.disabledOpacity, contract.id).toBe(
        "opacity.disabled",
      );
      expect(
        contract.states.some(
          (state) => state.id === "disabled" && state.kind === "interaction",
        ),
        contract.id,
      ).toBe(true);
    }
  });
});
