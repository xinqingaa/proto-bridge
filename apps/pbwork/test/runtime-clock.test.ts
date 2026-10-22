import { effectScope, watch } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { synchronizeRuntimeClock, useClock } from "@/runtime/useClock";

afterEach(() => vi.useRealTimers());

it("synchronizes a fixed Capture instant before the next interval without scheduling duplicate updates", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-16T02:24:00.000Z"));
  const scope = effectScope();
  try {
    const clock = scope.run(() => useClock())!;
    let updates = 0;
    scope.run(() => watch(clock, () => updates++, { flush: "sync" }));
    const fixed = new Date("2026-10-16T02:24:00.350Z");
    vi.setSystemTime(fixed);
    expect(clock.value.getTime()).toBe(fixed.getTime() - 350);
    expect(updates).toBe(0);
    const timers = vi.getTimerCount();
    synchronizeRuntimeClock();
    expect(clock.value.getTime()).toBe(fixed.getTime());
    expect(updates).toBe(1);
    synchronizeRuntimeClock();
    expect(updates).toBe(1);
    expect(vi.getTimerCount()).toBe(timers);
  } finally {
    scope.stop();
  }
  expect(vi.getTimerCount()).toBe(0);
});
