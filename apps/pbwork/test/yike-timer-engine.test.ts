import { describe, expect, it } from "vitest";
import {
  advanceTimer,
  appendCountdownMinute,
  completeTimer,
  createTimerSession,
  elapsedMs,
  lapTimer,
  pauseTimer,
  resumeTimer,
  restoreTimerAfterReload,
  shouldPersistFocusRecord,
} from "@/prototypes/yike/timer-engine";

describe("Yike deterministic timer transitions", () => {
  it("pause/resume accumulates disjoint intervals without double counting", () => {
    const idle = createTimerSession({ id: "s1", mode: "pomodoro", now: 0, targetMs: 25 * 60_000 });
    const first = pauseTimer({ ...idle, ...resumeTimer({ ...idle, status: "paused" }, 0) }, 90_000);
    expect(first.accumulatedMs).toBe(90_000);
    const resumed = resumeTimer(first, 200_000);
    expect(elapsedMs(resumed, 230_000)).toBe(120_000);
    const pausedAgain = pauseTimer(resumed, 230_000);
    expect(pausedAgain.accumulatedMs).toBe(120_000);
    expect(elapsedMs(resumeTimer(pausedAgain, 500_000), 560_000)).toBe(180_000);
  });

  it("does not advance paused time on reload and restores a running session paused", () => {
    const running = { ...createTimerSession({ id: "s1", mode: "stopwatch", now: 0, targetMs: 0 }), status: "running" as const, startedAt: 10_000, accumulatedMs: 45_000 };
    const restored = restoreTimerAfterReload(running);
    expect(restored.status).toBe("paused");
    expect(restored.startedAt).toBeNull();
    expect(elapsedMs(restored, 900_000)).toBe(45_000);
  });

  it("clamps at due, appends repeated countdown minutes to the same elapsed session", () => {
    const timer = createTimerSession({ id: "s1", mode: "countdown", now: 0, targetMs: 60_000 });
    const due = advanceTimer({ ...timer, status: "running", startedAt: 0 }, 75_000);
    expect(due.status).toBe("due");
    expect(due.accumulatedMs).toBe(60_000);
    expect(advanceTimer(due, 90_000)).toBe(due);
    const appended = appendCountdownMinute(due, 100_000);
    expect(appended.id).toBe("s1");
    expect(appended.targetMs).toBe(120_000);
    expect(elapsedMs(appended, 130_000)).toBe(90_000);
    const dueAgain = advanceTimer(appended, 160_000);
    expect(dueAgain.status).toBe("due");
    expect(dueAgain.accumulatedMs).toBe(120_000);
    expect(shouldPersistFocusRecord(dueAgain)).toBe(true);
  });

  it("does not create short records and completes a running stage at its target", () => {
    const short = completeTimer({ ...createTimerSession({ id: "s2", mode: "stopwatch", now: 0, targetMs: 0 }), status: "running", startedAt: 0 }, 59_999);
    expect(short.status).toBe("finished");
    expect(shouldPersistFocusRecord(short)).toBe(false);
    const finished = advanceTimer({ ...createTimerSession({ id: "s3", mode: "pomodoro", now: 0, targetMs: 60_000 }), status: "running", startedAt: 0 }, 60_000);
    expect(finished.status).toBe("finished");
    expect(shouldPersistFocusRecord(finished)).toBe(true);
  });

  it("splits only active time across local midnight and excludes pause duration", () => {
    const start = new Date(2026, 9, 18, 23, 59, 30).getTime();
    const idle = createTimerSession({ id: "cross-day", mode: "stopwatch", now: start, targetMs: 0 });
    const paused = pauseTimer({ ...idle, status: "running", startedAt: start }, start + 90_000);
    expect(paused.intervals).toEqual([
      { date: "2026-10-18", durationMs: 30_000 },
      { date: "2026-10-19", durationMs: 60_000 },
    ]);
    const resumed = resumeTimer(paused, start + 180_000);
    const ended = completeTimer(resumed, start + 210_000);
    expect(ended.accumulatedMs).toBe(120_000);
    expect(ended.intervals[1]?.durationMs).toBe(90_000);
  });

  it("laps retain cumulative active time and cannot be created while paused", () => {
    const idle = createTimerSession({ id: "laps", mode: "stopwatch", now: 0, targetMs: 0 });
    const first = lapTimer({ ...idle, status: "running", startedAt: 0 }, 30_000);
    const paused = pauseTimer(first, 40_000);
    expect(lapTimer(paused, 90_000)).toBe(paused);
    const second = lapTimer(resumeTimer(paused, 100_000), 120_000);
    expect(second.laps).toEqual([30_000, 60_000]);
    expect(lapTimer(second, 120_000)).toBe(second);
  });
});
