import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import YikeWeekChart from "@/prototypes/yike/components/YikeWeekChart.vue";
const props = {
  inspectId: "test.week",
  face: "mechanical" as const,
  weekStart: "2026-10-14",
  today: "2026-10-16",
  days: [
    { date: "2026-10-12", minutes: 80 },
    { date: "2026-10-13", minutes: 500 },
    { date: "2026-10-14", minutes: NaN },
    { date: "2026-10-15", minutes: -2 },
    { date: "2026-10-17", minutes: 9999 },
  ],
};
describe("日期驱动的回顾周图", () => {
  it("归一到周一，保持25分钟块尺度，按真实最大值扩展而非固定125", () => {
    const wrapper = mount(YikeWeekChart, { props });
    expect(wrapper.findAll("button")).toHaveLength(7);
    expect(wrapper.findAll("button")[0]!.attributes("data-pb-key")).toBe(
      "2026-10-12",
    );
    expect(wrapper.get(".scale").text()).toContain("500 分钟");
    expect(wrapper.findAll("button")[0]!.findAll("svg > rect")).toHaveLength(4);
    expect(wrapper.findAll("button")[2]!.attributes("aria-label")).toContain(
      "0 分钟",
    );
    expect(wrapper.findAll("button")[5]!.findAll("svg > rect")).toHaveLength(0);
    wrapper.unmount();
  });
  it("未来禁用、选中再点收起，日期输入无效时不伪造一周", async () => {
    const wrapper = mount(YikeWeekChart, { props });
    await wrapper.findAll("button")[5]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["2026-10-12"]]);
    await wrapper.setProps({ modelValue: "2026-10-12" });
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[1]).toEqual([""]);
    await wrapper.setProps({ weekStart: "2026-02-30" });
    expect(wrapper.findAll("button")).toHaveLength(0);
    expect(wrapper.get('[role="status"]').text()).toBe("日期无效");
    wrapper.unmount();
  });
  it("水位裁切与日影渐隐保留真实高度和独立SVG引用", async () => {
    const wrapper = mount(YikeWeekChart, {
      props: { ...props, face: "water" },
    });
    const rects = wrapper.findAll("button")[1]!.findAll("svg > rect");
    expect(rects[1]!.attributes("height")).toBe("148");
    expect(rects[1]!.attributes("clip-path")).toContain("2026-10-13-tube");
    await wrapper.setProps({ face: "sundial" });
    expect(
      wrapper.findAll("button")[0]!.get("svg > rect").attributes("fill"),
    ).toContain("url(#review-");
    expect(wrapper.findAll("button")[2]!.find(".ink-cap").exists()).toBe(false);
    wrapper.unmount();
  });
});
