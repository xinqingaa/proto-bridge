import { createInitialYikeState } from "./model";
import {
  createTimerSession,
  startTimer,
  pauseTimer,
  advanceTimer,
  shouldPersistFocusRecord,
} from "./timer-engine";

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
  ];
  if (timerVariants.includes(variant)) {
    const mode = variant.startsWith("countdown")
      ? "countdown"
      : variant.startsWith("stopwatch") || variant === "cross-day"
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
          variant === "cross-day"
        ? paused
        : { ...paused, status: "running", startedAt: at };
    if (mode === "stopwatch") data.session.laps = [60_000, 180_000];
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
  if (variant === "empty") data.habits = [];
  if (variant === "archived")
    for (const habit of data.habits) habit.archivedOn = day;
  return data;
}
