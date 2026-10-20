import { describe, expect, it } from "vitest";
import { shallowMount } from "@vue/test-utils";
import YikeDurationPicker from "@/prototypes/yike/components/YikeDurationPicker.vue";
import WheelPicker from "@/design-system/components/input/WheelPicker.vue";
import { createYikeStore } from "@/prototypes/yike/model";
import { createYikeSession } from "@/prototypes/yike/session";
import {
  durationLabel,
  preciseDurationLabel,
  reviewSummary,
} from "@/prototypes/yike/statistics";

describe("second precision in Yike", () => {
  it("completes a five-second countdown below the threshold, appends to the same record and never duplicates it", () => {
    let at = new Date("2026-10-20T12:00:00+08:00").getTime();
    const store = createYikeStore({ storage: null, now: () => new Date(at) });
    const timer = createYikeSession(store, () => at);
    timer.requestMode("countdown");
    timer.countdownSeconds.value = 5;
    timer.toggle();
    expect(store.data.session?.targetMs).toBe(5000);
    at += 5000;
    timer.tick();
    expect(timer.pendingRecord.value).toBeNull();
    expect(store.data.focusRecords).toHaveLength(1);
    expect(store.data.focusRecords[0]?.durationSeconds).toBe(5);
    timer.tick();
    timer.append();
    at += 60_000;
    timer.tick();
    timer.finish();
    timer.finish();
    expect(store.data.focusRecords).toHaveLength(1);
    expect(store.data.focusRecords[0]?.durationSeconds).toBe(65);
    expect(timer.countdownSeconds.value).toBe(5);
  });

  it("still asks before an early short finish; cancelling preserves the paused session", () => {
    let at = new Date("2026-10-20T12:00:00+08:00").getTime();
    const store = createYikeStore({ storage: null, now: () => new Date(at) });
    const timer = createYikeSession(store, () => at);
    timer.requestMode("countdown");
    timer.countdownSeconds.value = 30;
    timer.toggle();
    at += 2000;
    timer.finish();
    expect(timer.pendingRecord.value?.kind).toBe("finish");
    expect(store.data.focusRecords).toHaveLength(0);
    timer.resolveRecord(false);
    expect(store.data.session?.status).toBe("paused");
    expect(store.data.session?.accumulatedMs).toBe(2000);
    timer.finish();
    timer.resolveRecord(true);
    expect(store.data.focusRecords[0]?.durationSeconds).toBe(2);
  });

  it("records one second correctly across midnight without rounding either day's share", () => {
    let at = new Date(2026, 9, 20, 23, 59, 59, 500).getTime();
    const store = createYikeStore({ storage: null, now: () => new Date(at) });
    const timer = createYikeSession(store, () => at);
    timer.requestMode("countdown");
    timer.countdownSeconds.value = 1;
    timer.toggle();
    at += 1000;
    timer.tick();
    expect(timer.pendingRecord.value).toBeNull();
    expect(store.data.focusRecords[0]?.intervals).toEqual([
      { date: "2026-10-20", durationSeconds: 0.5 },
      { date: "2026-10-21", durationSeconds: 0.5 },
    ]);
    expect(reviewSummary(store.data, "2026-10-20", "2026-10-21").seconds).toBe(
      1,
    );
  });

  it("shows precise day durations while keeping period summaries compact", () => {
    expect(preciseDurationLabel(5)).toBe("5 秒");
    expect(preciseDurationLabel(95)).toBe("1 分 35 秒");
    expect(preciseDurationLabel(3665)).toBe("1 小时 1 分 5 秒");
    expect(preciseDurationLabel(1500)).toBe("25 分钟");
    expect(preciseDurationLabel(7200)).toBe("2 小时 0 分钟");
    expect(durationLabel(95)).toBe("1 分钟");
  });

  it("offers a valid 1-second lower bound and 23:59:59 upper bound through the existing wheel", async () => {
    const wrapper = shallowMount(YikeDurationPicker, {
      props: {
        precision: "second",
        modelValue: 1,
        min: 1,
        max: 86399,
        inspectId: "test.seconds",
      },
    });
    const wheel = () => wrapper.findComponent(WheelPicker);
    expect(wheel().props("modelValue")).toEqual([0, 0, 1]);
    expect(
      wheel()
        .props("columns")
        .map((column) => column.label),
    ).toEqual(["小时", "分钟", "秒"]);
    expect(wheel().props("columns")[2]!.options[0]!.value).toBe(1);
    await wrapper.setProps({ modelValue: 95 });
    expect(wheel().props("modelValue")).toEqual([0, 1, 35]);
    wheel().vm.$emit("update:modelValue", [0, 0, 35]);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([35]);
    await wrapper.setProps({ modelValue: 86399 });
    expect(wheel().props("modelValue")).toEqual([23, 59, 59]);
    wrapper.unmount();
  });

  it("keeps minute-only configurations bounded and preserves their minute step", () => {
    const wrapper = shallowMount(YikeDurationPicker, {
      props: {
        modelValue: 180,
        min: 1,
        max: 180,
        minuteStep: 5,
        inspectId: "test.minutes",
      },
    });
    const wheel = wrapper.findComponent(WheelPicker);
    expect(wheel.props("modelValue")).toEqual([3, 0]);
    expect(wheel.props("columns")).toHaveLength(2);
    expect(
      wheel.props("columns")[1]!.options.map((option) => option.value),
    ).toEqual([0]);
    wheel.vm.$emit("update:modelValue", [0, 0]);
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([5]);
    wrapper.unmount();
  });
});
