import { describe, expect, it } from "vitest";
import {
  activeDayCount,
  defaultRecords,
  latestRecords,
  isValidHengdongUsername,
  normalizeHengdongUsername,
  progressRange,
  recordsInRange,
  shiftProgressAnchor,
  totalMinutes,
} from "@/prototypes/hengdong/model";
import {
  hengdongState,
  registerHengdong,
  resetHengdongData,
} from "@/prototypes/hengdong/storage";

describe("Hengdong activity ranges", () => {
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
    expect(latestRecords(defaultRecords, 5).map((record) => record.id)).toEqual([
      "record-20260812",
      "record-20260810",
      "record-20260809",
      "record-20260806",
      "record-20260802",
    ]);
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
});
