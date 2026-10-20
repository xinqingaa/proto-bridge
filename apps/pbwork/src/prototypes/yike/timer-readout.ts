import type { YikeTimerMode } from "./timer-engine";

/**
 * One full dial revolution is one real hour on every face: the mechanical dial
 * is printed 0–60, and the water level and sundial shadow follow the same ruler
 * so switching themes never changes the amount a session covers.
 */
export const DIAL_SPAN_MINUTES = 60;
const MINUTE_MS = 60_000;

/** `h:mm:ss` from one hour up, `mm:ss` below it. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const tail = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${tail}` : tail;
}

/** Spoken span used to complete the dial beyond one revolution. */
export function formatMinuteSpan(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (hours === 0) return `${rest} 分钟`;
  return rest === 0 ? `${hours} 小时` : `${hours} 小时 ${rest} 分钟`;
}

export type DialReading = {
  /** 0–1 of one 60-minute revolution. */
  fraction: number;
  /** Remaining dials empty; the stopwatch fills. */
  direction: "remaining" | "elapsed";
  /** Extra line for stages longer than one revolution; empty otherwise. */
  note: string;
};

export function dialReading(input: {
  mode: YikeTimerMode;
  elapsedMs: number;
  totalMs: number;
}): DialReading {
  if (input.mode === "countdown") {
    // 倒计时的一圈就是这一杯：满圈起、倒空为止，几秒也看得见。
    const remaining = Math.max(0, input.totalMs - input.elapsedMs);
    const fraction = input.totalMs > 0 ? remaining / input.totalMs : 0;
    return {
      fraction: Math.min(1, fraction),
      direction: "remaining",
      note: "",
    };
  }
  if (input.mode === "stopwatch") {
    const minutes = Math.max(0, input.elapsedMs) / MINUTE_MS;
    const within = minutes % DIAL_SPAN_MINUTES;
    const fraction =
      minutes > 0 && within === 0 ? 1 : within / DIAL_SPAN_MINUTES;
    const hours = Math.floor(minutes / DIAL_SPAN_MINUTES);
    return {
      fraction,
      direction: "elapsed",
      note: hours >= 1 ? `已满 ${hours} 小时` : "",
    };
  }
  const minutes = Math.max(0, input.totalMs - input.elapsedMs) / MINUTE_MS;
  return {
    fraction: Math.min(1, minutes / DIAL_SPAN_MINUTES),
    direction: "remaining",
    note:
      minutes > DIAL_SPAN_MINUTES
        ? `另有 ${formatMinuteSpan(minutes - DIAL_SPAN_MINUTES)}`
        : "",
  };
}

/** Shared duration label for settings and countdown presets; omit zero units. */
export function formatDurationLabel(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return (
    [
      hours ? `${hours}小时` : "",
      minutes ? `${minutes}分` : "",
      rest ? `${rest}秒` : "",
    ].join("") || "0秒"
  );
}
