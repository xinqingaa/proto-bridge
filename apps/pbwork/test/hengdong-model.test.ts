import { describe, expect, it } from "vitest";
import {
  activeDayCount,
  catalogPlans,
  defaultPlans,
  defaultRecords,
  latestRecords,
  isValidHengdongUsername,
  normalizeHengdongUsername,
  nextCustomPlanId,
  planSaveLabel,
  progressRange,
  resolvePlanSaveMode,
  recordsInRange,
  shiftProgressAnchor,
  totalMinutes,
} from "@/prototypes/hengdong/model";
import {
  hengdongState,
  adoptPlan,
  registerHengdong,
  resetHengdongData,
  savePlanForMode,
  setActivePlan,
} from "@/prototypes/hengdong/storage";
import { recordGlyph } from "@/prototypes/hengdong/glyphs";

describe("Hengdong activity ranges", () => {
  it("keeps plan save intent explicit across create and edit flows", () => {
    expect(resolvePlanSaveMode(undefined, "wake-up-15")).toBe("create");
    expect(resolvePlanSaveMode("wake-up-15", "wake-up-15")).toBe(
      "edit-current",
    );
    expect(resolvePlanSaveMode("full-body-basic", "wake-up-15")).toBe(
      "edit-candidate",
    );
    expect(planSaveLabel("create")).toBe("保存并设为当前计划");
    expect(planSaveLabel("edit-current")).toBe("保存修改");
    expect(planSaveLabel("edit-candidate")).toBe("保存计划");
  });

  it("keeps the current plan in the catalog and lists it first", () => {
    expect(
      catalogPlans(defaultPlans, "wake-up-15").map((plan) => plan.id),
    ).toEqual(["wake-up-15", "full-body-basic", "sleep-stretch"]);
    expect(
      catalogPlans(defaultPlans, "wake-up-15", "唤醒").map((plan) => plan.id),
    ).toEqual(["wake-up-15"]);
    expect(
      catalogPlans(defaultPlans, "full-body-basic").map((plan) => plan.id)[0],
    ).toBe("full-body-basic");
  });

  it("allocates a stable custom plan id without overwriting an earlier plan", () => {
    expect(nextCustomPlanId([])).toBe("custom-light-rhythm");
    expect(
      nextCustomPlanId([
        { ...defaultPlans[0]!, id: "custom-light-rhythm" },
        { ...defaultPlans[1]!, id: "custom-light-rhythm-2" },
      ]),
    ).toBe("custom-light-rhythm-3");
  });

  it("adopts a new plan while candidate edits preserve the current plan", () => {
    resetHengdongData();
    const newPlan = {
      ...defaultPlans[0]!,
      id: "custom-light-rhythm",
      name: "我的轻量训练",
      origin: "custom" as const,
    };
    savePlanForMode(newPlan, "create");
    expect(hengdongState.activePlanId).toBe(newPlan.id);

    const candidate = { ...defaultPlans[1]!, name: "全身基础训练（已调整）" };
    savePlanForMode(candidate, "edit-candidate");
    expect(hengdongState.activePlanId).toBe(newPlan.id);
    expect(
      hengdongState.plans.find((plan) => plan.id === candidate.id)?.name,
    ).toBe("全身基础训练（已调整）");
    resetHengdongData();
  });

  it("returns the previous plan when adopting so the change can be undone", () => {
    resetHengdongData();
    const previousPlanId = hengdongState.activePlanId;
    expect(adoptPlan("full-body-basic")).toBe(previousPlanId);
    expect(hengdongState.activePlanId).toBe("full-body-basic");
    expect(setActivePlan(previousPlanId)).toBe(true);
    expect(hengdongState.activePlanId).toBe(previousPlanId);
    expect(adoptPlan("missing-plan")).toBeNull();
    resetHengdongData();
  });

  it("derives week, month, year, and custom ranges from one anchor", () => {
    expect(progressRange("week", "2026-08-13")).toEqual({
      start: "2026-08-10",
      end: "2026-08-16",
    });
    expect(progressRange("month", "2026-08-13")).toEqual({
      start: "2026-08-01",
      end: "2026-08-31",
    });
    expect(progressRange("year", "2026-08-13")).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
    });
    expect(
      progressRange("custom", "2026-08-13", {
        start: "2026-07-19",
        end: "2026-08-06",
      }),
    ).toEqual({ start: "2026-07-19", end: "2026-08-06" });
  });

  it("shifts each standard period without hard-coded calendar fixtures", () => {
    expect(shiftProgressAnchor("week", "2026-08-13", -1)).toBe("2026-08-06");
    expect(shiftProgressAnchor("month", "2026-08-13", -1)).toBe("2026-07-01");
    expect(shiftProgressAnchor("year", "2026-08-13", -1)).toBe("2025-01-01");
  });

  it("keeps summaries and the latest-five list on the same activity facts", () => {
    const august = recordsInRange(defaultRecords, {
      start: "2026-08-01",
      end: "2026-08-31",
    });
    expect(august).toHaveLength(5);
    expect(activeDayCount(august)).toBe(5);
    expect(totalMinutes(august)).toBe(101);
    expect(latestRecords(defaultRecords, 5).map((record) => record.id)).toEqual(
      [
        "record-20260812",
        "record-20260810",
        "record-20260809",
        "record-20260806",
        "record-20260802",
      ],
    );
  });

  it("normalizes local identities and preserves device activity facts", () => {
    const recordIds = hengdongState.records.map((record) => record.id);
    expect(normalizeHengdongUsername("  Zhou_Ning ")).toBe("zhou_ning");
    expect(isValidHengdongUsername("zhou_ning")).toBe(true);
    expect(isValidHengdongUsername("周宁")).toBe(false);

    registerHengdong(
      {
        id: "user-zhou_ning",
        name: "周宁",
        username: " Zhou_Ning ",
        password: "123456",
      },
      4,
    );

    expect(hengdongState.profile.username).toBe("zhou_ning");
    expect(hengdongState.goals.weeklySessions).toBe(4);
    expect(hengdongState.records.map((record) => record.id)).toEqual(recordIds);
    resetHengdongData();
  });

  it("picks session glyphs from plan goals instead of the shared 训练 type", () => {
    const recent = latestRecords(defaultRecords, 5).map((record) =>
      recordGlyph(record, defaultPlans),
    );
    expect(recent.map((glyph) => glyph.icon)).toEqual([
      "sparkles",
      "dumbbell",
      "person-standing",
      "footprints",
      "sparkles",
    ]);
    expect(recent.map((glyph) => glyph.kind)).toEqual([
      "wake",
      "strength",
      "stretch",
      "walk",
      "free",
    ]);
  });
});
