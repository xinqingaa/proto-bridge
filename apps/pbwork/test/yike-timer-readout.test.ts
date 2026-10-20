import { describe, expect, it } from "vitest";
import {
  DIAL_SPAN_MINUTES,
  dialReading,
  formatClock,
  formatDurationLabel,
  formatMinuteSpan,
} from "@/prototypes/yike/timer-readout";

describe("Yike 表盘读数：一圈 = 60 分钟", () => {
  it("数字在一小时前后切换 mm:ss / h:mm:ss", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(65_000)).toBe("01:05");
    expect(formatClock(3_600_000)).toBe("1:00:00");
    expect(formatClock(5_400_000)).toBe("1:30:00");
    expect(formatClock(86_399_000)).toBe("23:59:59");
    expect(formatClock(-5_000)).toBe("00:00");
  });

  it("补充文案按小时+分钟表达", () => {
    expect(formatMinuteSpan(30)).toBe("30 分钟");
    expect(formatMinuteSpan(60)).toBe("1 小时");
    expect(formatMinuteSpan(90)).toBe("1 小时 30 分钟");
  });

  it("番茄按剩余分钟占 60 分钟成比例", () => {
    const pomodoro = dialReading({
      mode: "pomodoro",
      elapsedMs: 0,
      totalMs: 25 * 60_000,
    });
    expect(pomodoro.fraction).toBeCloseTo(25 / DIAL_SPAN_MINUTES, 6);
    expect(pomodoro.direction).toBe("remaining");
    expect(pomodoro.note).toBe("");
  });

  it("倒计时一圈就是所选时长：几秒也满圈", () => {
    const fiveSeconds = dialReading({
      mode: "countdown",
      elapsedMs: 0,
      totalMs: 5_000,
    });
    expect(fiveSeconds.fraction).toBe(1);
    expect(fiveSeconds.note).toBe("");

    const half = dialReading({
      mode: "countdown",
      elapsedMs: 2_500,
      totalMs: 5_000,
    });
    expect(half.fraction).toBeCloseTo(0.5, 6);

    const minute = dialReading({
      mode: "countdown",
      elapsedMs: 0,
      totalMs: 60_000,
    });
    expect(minute.fraction).toBe(1);

    const ninetyMinutes = dialReading({
      mode: "countdown",
      elapsedMs: 0,
      totalMs: 90 * 60_000,
    });
    expect(ninetyMinutes.fraction).toBe(1);
    expect(ninetyMinutes.note).toBe("");

    const done = dialReading({
      mode: "countdown",
      elapsedMs: 5_000,
      totalMs: 5_000,
    });
    expect(done.fraction).toBe(0);
  });

  it.each([
    [0, "0秒"],
    [45, "45秒"],
    [60, "1分"],
    [90, "1分30秒"],
    [300, "5分"],
    [3599, "59分59秒"],
    [3600, "1小时"],
    [3601, "1小时1秒"],
    [5400, "1小时30分"],
    [86399, "23小时59分59秒"],
  ])("常用时长 %i 秒统一标注单位：%s", (seconds, label) => {
    expect(formatDurationLabel(seconds)).toBe(label);
  });

  it("番茄超过一小时显示满圈而不是取模", () => {
    const ninety = dialReading({
      mode: "pomodoro",
      elapsedMs: 0,
      totalMs: 90 * 60_000,
    });
    expect(ninety.fraction).toBe(1);
    expect(ninety.note).toBe("另有 30 分钟");

    const twoHours = dialReading({
      mode: "pomodoro",
      elapsedMs: 0,
      totalMs: 120 * 60_000,
    });
    expect(twoHours.fraction).toBe(1);
    expect(twoHours.note).toBe("另有 1 小时");

    const halfLeft = dialReading({
      mode: "pomodoro",
      elapsedMs: 30 * 60_000,
      totalMs: 120 * 60_000,
    });
    expect(halfLeft.note).toBe("另有 30 分钟");

    const below = dialReading({
      mode: "pomodoro",
      elapsedMs: 70 * 60_000,
      totalMs: 120 * 60_000,
    });
    expect(below.fraction).toBeCloseTo(50 / 60, 6);
    expect(below.note).toBe("");
  });

  it("正计时从 0 累加、满一小时回绕并标记已满", () => {
    const start = dialReading({ mode: "stopwatch", elapsedMs: 0, totalMs: 0 });
    expect(start.fraction).toBe(0);
    expect(start.direction).toBe("elapsed");
    expect(start.note).toBe("");

    const halfHour = dialReading({
      mode: "stopwatch",
      elapsedMs: 30 * 60_000,
      totalMs: 0,
    });
    expect(halfHour.fraction).toBeCloseTo(0.5, 6);

    const oneHour = dialReading({
      mode: "stopwatch",
      elapsedMs: 60 * 60_000,
      totalMs: 0,
    });
    expect(oneHour.fraction).toBe(1);
    expect(oneHour.note).toBe("已满 1 小时");

    const over = dialReading({
      mode: "stopwatch",
      elapsedMs: 61 * 60_000,
      totalMs: 0,
    });
    expect(over.fraction).toBeCloseTo(1 / 60, 6);
    expect(over.note).toBe("已满 1 小时");
  });
});
