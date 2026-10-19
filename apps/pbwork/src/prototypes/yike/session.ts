import { ref, inject, type InjectionKey } from "vue";
import { useYikeStore, type YikeStore } from "./model";
import {
  abandonTimer,
  appendCountdownMinute,
  checkpointTimer,
  completeTimer,
  createTimerSession,
  lapTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  type YikeTimerMode,
} from "./timer-engine";

/** One command surface for all pages; clock injection makes demos repeatable. */
export function createYikeSession(store: YikeStore, now = () => Date.now()) {
  const mode = ref<YikeTimerMode>(store.data.session?.mode ?? "pomodoro");
  const countdownMinutes = ref(5);
  const pendingMode = ref<YikeTimerMode | null>(null);
  function tick(at = now()) {
    const current = store.data.session;
    if (current?.status === "running")
      store.setSession(checkpointTimer(current, at));
  }
  function toggle() {
    const current = store.data.session;
    const at = now();
    if (!current || current.status === "idle") {
      const p = store.data.preferences;
      store.setSession(
        startTimer(
          createTimerSession({
            id: crypto.randomUUID(),
            mode: mode.value,
            now: at,
            targetMs:
              (mode.value === "pomodoro"
                ? p.pomodoroMinutes
                : countdownMinutes.value) * 60_000,
            breakAfter:
              (store.data.completedRounds + 1) % p.longBreakEvery === 0
                ? "long-break"
                : "short-break",
          }),
          at,
        ),
      );
    } else if (current.status === "running")
      store.setSession(pauseTimer(current, at));
    else if (current.status === "paused")
      store.setSession(resumeTimer(current, at));
  }
  function finish() {
    const current = store.data.session;
    if (!current) return;
    if (current.phase && current.phase !== "focus") {
      store.leaveBreak();
      return;
    }
    if (
      current.mode === "pomodoro" &&
      current.status === "finished" &&
      current.accumulatedMs >= current.targetMs
    ) {
      store.startBreak();
      return;
    }
    store.setSession(completeTimer(current, now()));
    store.setSession(null);
  }
  function abandon() {
    if (store.data.session)
      store.setSession(abandonTimer(store.data.session, now()));
    store.setSession(null);
  }
  function requestMode(next: YikeTimerMode) {
    if (next === mode.value) return true;
    if (store.data.session && store.data.session.status !== "idle") {
      pendingMode.value = next;
      return false;
    }
    mode.value = next;
    store.setSession(null);
    return true;
  }
  function resolveMode(choice: "cancel" | "record" | "discard") {
    const next = pendingMode.value;
    pendingMode.value = null;
    if (!next || choice === "cancel") return;
    const current = store.data.session;
    if (current) {
      if (current.phase && current.phase !== "focus") store.leaveBreak();
      else if (current.mode === "pomodoro" && current.status === "finished")
        store.leaveBreak();
      else
        store.setSession(
          choice === "record"
            ? completeTimer(current, now())
            : abandonTimer(current, now()),
        );
    }
    store.setSession(null);
    mode.value = next;
  }
  return {
    mode,
    countdownMinutes,
    pendingMode,
    tick,
    toggle,
    finish,
    abandon,
    requestMode,
    resolveMode,
    lap() {
      if (store.data.session)
        store.setSession(lapTimer(store.data.session, now()));
    },
    append() {
      if (store.data.session)
        store.setSession(appendCountdownMinute(store.data.session, now()));
    },
    skipBreak() {
      store.leaveBreak();
    },
    sync() {
      mode.value = store.data.session?.mode ?? "pomodoro";
      pendingMode.value = null;
    },
  };
}

export type YikeSession = ReturnType<typeof createYikeSession>;
const sessions = new WeakMap<YikeStore, YikeSession>();
export function sharedYikeSession(store: YikeStore) {
  let session = sessions.get(store);
  if (!session) {
    session = createYikeSession(store);
    sessions.set(store, session);
  }
  return session;
}
export const YikeSessionKey: InjectionKey<YikeSession> = Symbol("yike-session");
export function useYikeSession() {
  return inject(YikeSessionKey, null) ?? sharedYikeSession(useYikeStore());
}
export function focusVariant(store: YikeStore) {
  const session = store.data.session;
  if (!session) return "default";
  if (store.recoveryNeeded.value) return "recovery";
  if (session.mode === "countdown" && session.status === "due")
    return "countdown-due";
  if (session.phase === "short-break" || session.phase === "long-break")
    return `${session.phase}${session.status === "running" ? "" : `-${session.status}`}`;
  if (session.mode === "stopwatch") return `stopwatch-${session.status}`;
  if (
    session.mode === "countdown" &&
    (session.status === "running" || session.status === "paused")
  )
    return `countdown-${session.status}`;
  if (session.status === "running" || session.status === "paused")
    return session.status;
  if (session.status === "due" || session.status === "finished")
    return "finished";
  return "default";
}
