import { parseDay, shiftDay } from "@/design-system/components/_shared/calendar";
import type { YikeState } from "./model";

export function reviewPeriod(date: string, range: "week" | "month") {
  const day = parseDay(date);
  if (!day) throw new Error("INVALID_REVIEW_DATE");
  if (range === "week") {
    const start = shiftDay(date, -((day.getUTCDay() + 6) % 7))!;
    return { start, end: shiftDay(start, 6)! };
  }
  const start = `${date.slice(0, 7)}-01`;
  const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function shiftReviewPeriod(date: string, range: "week" | "month", offset: number) {
  if (range === "week") return shiftDay(date, offset * 7)!;
  const day = parseDay(date)!;
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + offset, 1)).toISOString().slice(0, 10);
}

export function reviewSummary(state: YikeState, start: string, end: string) {
  const days = new Map<string, number>();
  const recordIds = new Set<string>();
  const byMode = { pomodoro: 0, stopwatch: 0, countdown: 0 };
  for (const record of state.focusRecords) {
    for (const interval of record.intervals) {
      if (interval.date < start || interval.date > end || interval.durationSeconds <= 0) continue;
      days.set(interval.date, (days.get(interval.date) ?? 0) + interval.durationSeconds);
      recordIds.add(record.id);
      byMode[record.mode] += interval.durationSeconds;
    }
  }
  const seconds = [...days.values()].reduce((sum, value) => sum + value, 0);
  return {
    seconds,
    minutes: Math.floor(seconds / 60),
    focusCount: recordIds.size,
    focusDays: days.size,
    checkinCount: state.checkins.filter((item) => item.date >= start && item.date <= end).length,
    days: [...days].map(([date, seconds]) => ({ date, minutes: seconds / 60 })),
    byMode,
  };
}

export function durationLabel(seconds: number) {
  if (seconds > 0 && seconds < 60) return "不足 1 分钟";
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟` : `${minutes} 分钟`;
}
