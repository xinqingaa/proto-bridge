export type YikeTimerMode = "pomodoro" | "stopwatch" | "countdown";
export type YikeTimerStatus = "idle" | "running" | "paused" | "finished" | "due" | "abandoned";
export type YikeTimerSession = {
  id: string;
  mode: YikeTimerMode;
  status: YikeTimerStatus;
  sessionStartedAt: number;
  startedAt: number | null;
  accumulatedMs: number;
  targetMs: number;
  recordedSeconds: number;
  intervals: Array<{ date: string; durationMs: number }>;
  phase?: "focus" | "short-break" | "long-break";
  breakAfter?: "short-break" | "long-break";
  laps?: number[];
};

export const COUNTDOWN_APPEND_MS = 60_000;
export const MINIMUM_RECORD_MS = 60_000;

export function createTimerSession(input: {
  id: string;
  mode: YikeTimerMode;
  now: number;
  targetMs: number;
  phase?: "focus" | "short-break" | "long-break";
  breakAfter?: "short-break" | "long-break";
}): YikeTimerSession {
  return {
    id: input.id,
    mode: input.mode,
    status: "idle",
    sessionStartedAt: input.now,
    startedAt: null,
    accumulatedMs: 0,
    targetMs: input.mode === "stopwatch" ? 0 : input.targetMs,
    recordedSeconds: 0,
    intervals: [],
    phase: input.phase ?? "focus",
    ...(input.breakAfter ? { breakAfter: input.breakAfter } : {}),
    laps: [],
  };
}

function settledIntervals(session: YikeTimerSession, now: number) {
  const intervals = session.intervals.map((interval) => ({ ...interval }));
  if (session.status !== "running" || session.startedAt === null) return intervals;
  let from = session.startedAt;
  const to = from + elapsedMs(session, now) - session.accumulatedMs;
  while (from < to) {
    const date = new Date(from);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const end = Math.min(to, midnight);
    const existing = intervals.find((interval) => interval.date === key);
    if (existing) existing.durationMs += end - from;
    else intervals.push({ date: key, durationMs: end - from });
    from = end;
  }
  return intervals;
}

export function checkpointTimer(session: YikeTimerSession, now: number): YikeTimerSession {
  if (session.status !== "running") return session;
  const advanced = advanceTimer(session, now);
  if (advanced !== session) return advanced;
  return { ...session, accumulatedMs: elapsedMs(session, now), startedAt: now, intervals: settledIntervals(session, now) };
}

export function elapsedMs(session: YikeTimerSession, now: number) {
  const elapsed = session.accumulatedMs + (session.status === "running" && session.startedAt !== null ? Math.max(0, now - session.startedAt) : 0);
  return session.mode === "stopwatch" ? elapsed : Math.min(elapsed, session.targetMs);
}

export function startTimer(session: YikeTimerSession, now: number): YikeTimerSession {
  if (session.status !== "idle") return session;
  return { ...session, status: "running", startedAt: now };
}

export function pauseTimer(session: YikeTimerSession, now: number): YikeTimerSession {
  if (session.status !== "running") return session;
  const advanced = advanceTimer(session, now);
  if (advanced !== session) return advanced;
  return { ...session, status: "paused", startedAt: null, accumulatedMs: elapsedMs(session, now), intervals: settledIntervals(session, now) };
}

export function resumeTimer(session: YikeTimerSession, now: number): YikeTimerSession {
  if (session.status !== "paused") return session;
  return { ...session, status: "running", startedAt: now };
}

export function advanceTimer(session: YikeTimerSession, now: number): YikeTimerSession {
  if (session.status !== "running") return session;
  const elapsed = elapsedMs(session, now);
  if (session.mode === "stopwatch" || elapsed < session.targetMs) return session;
  return {
    ...session,
    status: session.mode === "countdown" ? "due" : "finished",
    startedAt: null,
    accumulatedMs: elapsed,
    intervals: settledIntervals(session, now),
  };
}

export function appendCountdownMinute(session: YikeTimerSession, now: number): YikeTimerSession {
  if (session.mode !== "countdown" || session.status !== "due") return session;
  return {
    ...session,
    status: "running",
    startedAt: now,
    targetMs: session.targetMs + COUNTDOWN_APPEND_MS,
    recordedSeconds: Math.floor(session.targetMs / 1000),
  };
}

export function completeTimer(session: YikeTimerSession, now: number): YikeTimerSession {
  if (session.status !== "running" && session.status !== "paused" && session.status !== "due" && session.status !== "finished") return session;
  const elapsed = session.status === "running" ? elapsedMs(session, now) : session.accumulatedMs;
  return { ...session, status: "finished", startedAt: null, accumulatedMs: elapsed, intervals: settledIntervals(session, now) };
}

export function abandonTimer(session: YikeTimerSession, now: number): YikeTimerSession {
  if (session.status === "idle" || session.status === "abandoned") return session;
  const elapsed = session.status === "running" ? elapsedMs(session, now) : session.accumulatedMs;
  return { ...session, status: "abandoned", startedAt: null, accumulatedMs: elapsed, intervals: settledIntervals(session, now) };
}

export function restoreTimerAfterReload(session: YikeTimerSession): YikeTimerSession {
  if (session.status !== "running") return session;
  return { ...session, status: "paused", startedAt: null };
}

export function shouldPersistFocusRecord(session: YikeTimerSession) {
  if (session.phase && session.phase !== "focus") return false;
  return session.status === "finished" || session.status === "due"
    ? session.accumulatedMs >= MINIMUM_RECORD_MS
    : false;
}

export function lapTimer(session: YikeTimerSession, now: number): YikeTimerSession {
  if (session.mode !== "stopwatch" || session.status !== "running") return session;
  const elapsed = elapsedMs(session, now);
  const laps = session.laps ?? [];
  if (elapsed <= (laps.at(-1) ?? 0)) return session;
  return { ...checkpointTimer(session, now), laps: [...laps, elapsed] };
}
