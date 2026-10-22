import { describe, expect, it } from "vitest";
import { createPrototypeCaptureDraft } from "@/app/stores/capture";
import { buildRuntimeCaptureManifest } from "@/runtime/capture-protocol";
import { yikeAppearanceEvidence } from "@/prototypes/yike/appearance-evidence";
import { validateRegistries } from "@/design-system/validateRegistries";
import { prototypeScreens } from "@/prototypes/registry";
import { resolveSelectionMatrix } from "@proto-bridge/core/v2/capture";
import { RuntimeCaptureManifest } from "@proto-bridge/core/v2/runtime-contract";

describe("authored appearance usage evidence", () => {
  it("preserves every business result and observes conditional theme usages", () => {
    const manifest = RuntimeCaptureManifest.parse(buildRuntimeCaptureManifest("yike"));
    const result = resolveSelectionMatrix(createPrototypeCaptureDraft("yike")!, manifest);
    const plan = result.selection.capturePlan!;
    expect(plan.fullCaseCount).toBe(414);
    expect(plan.businessCases).toHaveLength(69);
    expect(result.matrix.length).toBeLessThan(plan.fullCaseCount / 2);
    const observed = new Set(result.matrix.map(({ selectedCase }) => selectedCase.caseId));
    expect(plan.businessCases.every((item) => observed.has(item.caseId))).toBe(true);
    const hasSample = (screenId: string, variantId: string, theme: string, mode: string) =>
      result.matrix.some(({ selectedCase: { caseKey } }) =>
        !caseKey.scenario && caseKey.screenId === screenId &&
        caseKey.variantId === variantId && caseKey.theme === theme && caseKey.themeId === mode);
    for (const theme of ["water", "sundial"]) {
      expect(hasSample("yike.review", "intensity-levels", theme, "dark")).toBe(true);
      expect(hasSample("yike.review", "day-detail", theme, "dark")).toBe(true);
    }
    expect(hasSample("yike.focus", "running", "water", "dark")).toBe(true);
    expect(hasSample("yike.focus", "long-break-finished", "water", "dark")).toBe(true);
    for (const theme of manifest.theme.themes)
      for (const mode of manifest.theme.modes)
        expect(hasSample("yike.settings", "default", theme, mode)).toBe(true);
    expect(plan.derivations.every((item) => item.pixels === "unobserved")).toBe(true);
  });

  it("keeps a newly authored usage exhaustive until it is explicitly reviewed", () => {
    const manifest = buildRuntimeCaptureManifest("yike");
    const focus = manifest.screens.find((screen) => screen.screenId === "yike.focus")!;
    focus.variants = [...focus.variants, { ...focus.variants[0]!, variantId: "future-composition" }];
    const draft = createPrototypeCaptureDraft("yike")!;
    draft.screens = draft.screens.filter((screen) => screen.screenId === focus.screenId);
    draft.screens[0]!.variants.variantIds.push("future-composition");
    const { matrix, selection } = resolveSelectionMatrix(draft, manifest);
    expect(matrix.filter(({ selectedCase }) => selectedCase.caseKey.variantId === "future-composition")).toHaveLength(6);
    expect(selection.capturePlan!.observations.filter((item) =>
      item.selectedCase.caseKey.variantId === "future-composition" && item.reason === "fallback")).toHaveLength(5);
  });

  it("rechecks the local appearance matrix when a selected usage lacks its samples", () => {
    const draft = createPrototypeCaptureDraft("yike")!;
    draft.screens = draft.screens.filter((screen) => screen.screenId === "yike.focus");
    draft.screens[0]!.variants.variantIds = ["default"];
    draft.screens[0]!.scenarios = { mode: "none" };
    const { matrix } = resolveSelectionMatrix(draft, buildRuntimeCaptureManifest("yike"));
    expect(matrix).toHaveLength(6);
    expect(matrix.every(({ selectedCase }) => selectedCase.caseKey.variantId === "default")).toBe(true);
  });

  it("pins changed usage declarations in the Runtime input version", () => {
    const rule = yikeAppearanceEvidence.focus.rules[0]!;
    const original = rule.rationale;
    const before = buildRuntimeCaptureManifest("yike").inputVersion;
    try {
      rule.rationale += " Updated usage boundary.";
      expect(buildRuntimeCaptureManifest("yike").inputVersion).not.toBe(before);
    } finally {
      rule.rationale = original;
    }
    expect(buildRuntimeCaptureManifest("yike").inputVersion).toBe(before);
  });

  it("rejects unknown appearance references at the Registry boundary", () => {
    const screen = prototypeScreens.find((item) => item.screenId === "yike.focus")!;
    const errors = validateRegistries({ screens: prototypeScreens.map((item) => item === screen
      ? { ...item, appearanceEvidence: { rules: [{ ...screen.appearanceEvidence!.rules[0]!, representativeVariantIds: ["unknown-usage"] }] } }
      : item) });
    expect(errors.some((error) => error.instancePath.startsWith("/appearanceEvidence") && error.message.includes("unknown-usage"))).toBe(true);
  });

  it("requires transient outcomes to be freshly executed with their Toast present", () => {
    const manifest = buildRuntimeCaptureManifest("yike");
    for (const [screenId, scenarioId, toastId] of [
      ["yike.checkin", "checkin-today", "yike.checkin.undo"],
      ["yike.habit-detail", "archive-habit", "yike.checkin.saved"],
      ["yike.habit-editor", "save-edit", "yike.habit-detail.saved"],
    ]) {
      const scenario = manifest.screens.find((screen) => screen.screenId === screenId)!
        .scenarios.find((item) => item.scenarioId === scenarioId)!;
      expect(scenario.appearancePolicy).toBe("independent");
      expect(scenario.checkpoints[0]!.requiredFragments.some((item) => item.pbId === toastId)).toBe(true);
    }
  });
});
