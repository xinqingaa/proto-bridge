import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import WeeklyGoalRing from "@/prototypes/hengdong/components/WeeklyGoalRing.vue";
import WeeklyRhythm from "@/prototypes/hengdong/components/WeeklyRhythm.vue";

describe("Hengdong Today interactions", () => {
  it("makes the weekly goal ring a named, keyboard-native action", async () => {
    const wrapper = mount(WeeklyGoalRing, {
      props: {
        completed: 2,
        target: 3,
        progress: 67,
        inspectId: "hengdong.today.goal-ring",
        actionLabel: "继续训练",
        actionId: "activate-ring",
      },
    });

    const ring = wrapper.get("button");
    expect(ring.attributes("type")).toBe("button");
    expect(ring.attributes("data-pb-action")).toBe("activate-ring");
    expect(ring.attributes("aria-label")).toContain("继续训练");

    await ring.trigger("click");
    expect(wrapper.emitted("activate")).toHaveLength(1);
  });

  it("keeps all seven rhythm days aligned as buttons and emits stable dates", async () => {
    const items = [
      ["2026-08-10", "一", 12, true, false],
      ["2026-08-11", "二", 0, false, false],
      ["2026-08-12", "三", 18, true, false],
      ["2026-08-13", "四", 0, false, true],
      ["2026-08-14", "五", 0, false, false],
      ["2026-08-15", "六", 0, false, false],
      ["2026-08-16", "日", 0, false, false],
    ].map(([date, label, minutes, active, today]) => ({
      date: date as string,
      label: label as string,
      minutes: minutes as number,
      active: active as boolean,
      today: today as boolean,
    }));
    const wrapper = mount(WeeklyRhythm, {
      props: {
        items,
        totalMinutes: 30,
        summary: "已经活动 2 天",
        inspectId: "hengdong.today.week-rhythm",
      },
    });

    const days = wrapper.findAll("button.hd-week-day");
    expect(days).toHaveLength(7);
    expect(days.every((day) => day.attributes("type") === "button")).toBe(true);
    expect(days.every((day) => day.attributes("role") === undefined)).toBe(true);
    expect(wrapper.get(".hd-week-days").attributes("role")).toBe("group");
    expect(days.map((day) => day.attributes("data-pb-key"))).toEqual(
      items.map((item) => `day-${item.date}`),
    );

    await days[2]!.trigger("click");
    expect(wrapper.emitted("select")).toEqual([["2026-08-12"]]);
  });
});
