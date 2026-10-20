import { createInitialYikeState } from "./model";
import {
  createTimerSession,
  startTimer,
  pauseTimer,
  advanceTimer,
  shouldPersistFocusRecord,
} from "./timer-engine";
import { shiftDay } from "@/design-system/components/_shared/calendar";

/** Authored fixtures use the installed Capture clock, never random/sample first-use history. */
export function createYikeDemo(variant: string, now: Date) {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const data = createInitialYikeState(day);
  const timerVariants = [
    "running",
    "paused",
    "finished",
    "countdown-running",
    "countdown-paused",
    "countdown-due",
    "stopwatch-running",
    "stopwatch-paused",
    "short-break",
    "short-break-paused",
    "short-break-finished",
    "long-break",
    "long-break-paused",
    "long-break-finished",
    "recovery",
    "cross-day",
    "short-record",
    "abandon-confirm",
    "switch-confirm",
  ];
  if (timerVariants.includes(variant)) {
    const mode = variant.startsWith("countdown")
      ? "countdown"
      : variant.startsWith("stopwatch") ||
          variant === "cross-day" ||
          variant === "short-record"
        ? "stopwatch"
        : "pomodoro";
    const phase = variant.startsWith("short-break")
      ? "short-break"
      : variant.startsWith("long-break")
        ? "long-break"
        : "focus";
    const targetMs =
      (phase === "short-break" ? 5 : phase === "long-break" ? 15 : 25) * 60_000;
    const finished =
      variant === "finished" ||
      variant.endsWith("-finished") ||
      variant === "countdown-due";
    const elapsed = finished
      ? targetMs
      : variant === "short-record"
        ? 5_000
        : phase !== "focus"
          ? 60_000
          : 5 * 60_000;
    const at =
      variant === "cross-day"
        ? new Date(`${day}T00:02:00`).getTime()
        : now.getTime();
    const timer = startTimer(
      createTimerSession({
        id: `demo-${variant}`,
        mode,
        now: at - elapsed,
        targetMs,
        phase,
        breakAfter: "short-break",
      }),
      at - elapsed,
    );
    const paused = pauseTimer(timer, at);
    data.session = finished
      ? advanceTimer(timer, at)
      : variant.endsWith("paused") ||
          variant === "paused" ||
          variant === "recovery" ||
          variant === "cross-day" ||
          variant === "short-record" ||
          variant === "abandon-confirm" ||
          variant === "switch-confirm"
        ? paused
        : { ...paused, status: "running", startedAt: at };
    if (mode === "stopwatch" && variant !== "short-record")
      data.session.laps = [60_000, 180_000];
    if (phase !== "focus")
      data.completedRounds = phase === "long-break" ? 4 : 1;
  }
  if (data.session && shouldPersistFocusRecord(data.session)) {
    data.focusRecords.push({
      id: data.session.id,
      mode: data.session.mode,
      startedAt: new Date(data.session.sessionStartedAt).toISOString(),
      durationSeconds: data.session.accumulatedMs / 1000,
      intervals: data.session.intervals.map((interval) => ({
        date: interval.date,
        durationSeconds: interval.durationMs / 1000,
      })),
    });
    if (data.session.mode === "pomodoro") data.completedRounds = 1;
  }
  if (
    variant === "partial" ||
    variant === "completed" ||
    variant === "with-records" ||
    variant === "day-detail" ||
    variant === "only-checkins"
  ) {
    for (const habit of variant === "partial"
      ? data.habits.slice(0, 1)
      : data.habits)
      data.checkins.push({
        id: `${habit.id}:${day}`,
        habitId: habit.id,
        date: day,
        createdAt: now.toISOString(),
      });
  }
  if (
    variant === "only-focus" ||
    variant === "with-records" ||
    variant === "month"
  ) {
    data.focusRecords.push({
      id: "demo-review-focus",
      mode: "pomodoro",
      startedAt: new Date(now.getTime() - 25 * 60_000).toISOString(),
      durationSeconds: 1500,
      intervals: [{ date: day, durationSeconds: 1500 }],
    });
  }
  if (variant === "day-detail") {
    for (const [index, time] of [
      "08:50",
      "09:20",
      "09:50",
      "10:30",
    ].entries()) {
      const mode =
        index < 2 ? "pomodoro" : index === 2 ? "countdown" : "stopwatch";
      const durationSeconds = (index === 3 ? 45 : 25) * 60;
      data.focusRecords.push({
        id: `day-detail-${index}`,
        mode,
        startedAt: new Date(`${day}T${time}:00`).toISOString(),
        durationSeconds,
        intervals: [{ date: day, durationSeconds }],
      });
    }
  }
  if (variant === "intensity-levels") {
    data.initializedOn = shiftDay(day, -3)!;
    for (const [index, minutes] of [25, 60, 120].entries()) {
      const date = shiftDay(day, index - 3)!;
      data.focusRecords.push({
        id: `intensity-${date}`,
        mode: "pomodoro",
        startedAt: `${date}T02:00:00.000Z`,
        durationSeconds: minutes * 60,
        intervals: [{ date, durationSeconds: minutes * 60 }],
      });
    }
  }
  if (variant === "empty") data.habits = [];
  if (variant === "habit-records" || variant === "weekly") {
    data.initializedOn = shiftDay(day, -90)!;
    for (const habit of data.habits) habit.createdOn = data.initializedOn;
    const habitId = variant === "weekly" ? "habit-running" : "habit-water";
    for (const offset of [0, -2, -5, -12, -28, -60]) {
      const date = shiftDay(day, offset)!;
      data.checkins.push({
        id: `${habitId}:${date}`,
        habitId,
        date,
        createdAt: `${date}T04:00:00.000Z`,
      });
    }
  }
  if (variant === "history") {
    data.initializedOn = shiftDay(day, -35)!;
    for (const offset of [0, -2, -7, -20, -35]) {
      const date = shiftDay(day, offset)!;
      data.focusRecords.push({
        id: `review-${date}`,
        mode: "pomodoro",
        startedAt: `${date}T02:00:00.000Z`,
        durationSeconds: 1500,
        intervals: [{ date, durationSeconds: 1500 }],
      });
    }
  }
  if (variant === "archived-detail") data.habits[0]!.archivedOn = day;
  if (variant === "archived")
    for (const habit of data.habits) habit.archivedOn = day;
  return data;
}
