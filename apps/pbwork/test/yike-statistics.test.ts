import { describe, expect, it } from "vitest";
import { createInitialYikeState } from "@/prototypes/yike/model";
import {
  durationLabel,
  reviewPeriod,
  reviewSummary,
  shiftReviewPeriod,
  preciseDurationLabel,
} from "@/prototypes/yike/statistics";
import { reviewIntensity } from "@/prototypes/yike/components/review-intensity";

describe("日期与周期汇总", () => {
  describe("Yike real record statistics", () => {
    it("starts with no invented history and groups local calendar periods", () => {
      const state = createInitialYikeState("2026-10-18");
      expect(reviewPeriod("2026-10-18", "week")).toEqual({
        start: "2026-10-12",
        end: "2026-10-18",
      });
      expect(reviewPeriod("2026-02-10", "month")).toEqual({
        start: "2026-02-01",
        end: "2026-02-28",
      });
      expect(shiftReviewPeriod("2026-01-01", "month", -1)).toBe("2025-12-01");
      expect(reviewSummary(state, "2026-10-12", "2026-10-18")).toMatchObject({
        minutes: 0,
        seconds: 0,
        focusCount: 0,
        checkinCount: 0,
      });
    });
    it("sums seconds before rounding and deduplicates sessions spanning days", () => {
      const state = createInitialYikeState("2026-10-18");
      state.focusRecords = [
        {
          id: "cross-day",
          mode: "stopwatch",
          startedAt: "2026-10-17T23:59:30+08:00",
          durationSeconds: 90,
          intervals: [
            { date: "2026-10-17", durationSeconds: 30 },
            { date: "2026-10-18", durationSeconds: 60 },
          ],
        },
        {
          id: "other",
          mode: "countdown",
          startedAt: "2026-10-18T10:00:00+08:00",
          durationSeconds: 90,
          intervals: [{ date: "2026-10-18", durationSeconds: 90 }],
        },
      ];
      const week = reviewSummary(state, "2026-10-12", "2026-10-18");
      expect(week.seconds).toBe(180);
      expect(week.minutes).toBe(3);
      expect(week.focusCount).toBe(2);
      expect(week.focusDays).toBe(2);
      const firstDay = reviewSummary(state, "2026-10-17", "2026-10-17");
      expect(firstDay.focusCount).toBe(1);
      expect(durationLabel(firstDay.seconds)).toBe("30 秒");
    });
  });
});

describe("专注量分档", () => {
  it("keeps zero separate and uses inclusive 30/90 minute boundaries", () => {
    for (const value of [NaN, Infinity, -2, 0])
      expect(reviewIntensity(value)).toBe("none");
    for (const [value, band] of [
      [0.1, "low"],
      [30, "low"],
      [30.1, "medium"],
      [90, "medium"],
      [90.1, "high"],
      [500, "high"],
    ] as const)
      expect(reviewIntensity(value)).toBe(band);
  });
});

describe("精确用时", () => {
  it("shows precise day durations while keeping period summaries compact", () => {
    expect(preciseDurationLabel(5)).toBe("5 秒");
    expect(preciseDurationLabel(95)).toBe("1 分 35 秒");
    expect(preciseDurationLabel(3665)).toBe("1 小时 1 分 5 秒");
    expect(preciseDurationLabel(1500)).toBe("25 分钟");
    expect(preciseDurationLabel(7200)).toBe("2 小时 0 分钟");
    expect(durationLabel(95)).toBe("1 分钟");
  });
});
