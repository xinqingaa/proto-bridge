import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { h, shallowRef } from "vue";
import MonthCalendar from "@/design-system/components/display/MonthCalendar.vue";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
const global = {
  provide: {
    [ThemeTableKey as symbol]: shallowRef(
      resolveRuntimeTheme("yike", "water", "light"),
    ),
  },
  stubs: { Icon: true },
};
describe("公共月历的日期展示扩展", () => {
  it("插槽展示不改变闰月计算、日期禁用和受控选择", async () => {
    const wrapper = mount(MonthCalendar, {
      props: {
        month: "2024-02",
        today: "2024-02-28",
        modelValue: "2024-02-28",
        disabledDates: ["2024-02-29"],
        dayLabels: { "2024-02-28": "2024-02-28，25 分钟" },
      },
      global,
      slots: {
        day: ({ date, disabled }: { date: string; disabled: boolean }) =>
          h("span", { "data-disabled": String(disabled) }, date.slice(-2)),
      },
    });
    expect(wrapper.findAll("[data-date]")).toHaveLength(29);
    expect(
      wrapper.get('[data-date="2024-02-28"]').attributes("aria-label"),
    ).toBe("2024-02-28，25 分钟");
    expect(
      wrapper.get('[data-date="2024-02-29"] span').attributes("data-disabled"),
    ).toBe("true");
    await wrapper.get('[data-date="2024-02-29"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    await wrapper.get('[data-date="2024-02-27"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["2024-02-27"]]);
    await wrapper
      .get('[data-date="2024-02-28"]')
      .trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
    await wrapper.get('[aria-label="下个月"]').trigger("click");
    expect(wrapper.emitted("update:month")).toEqual([["2024-03"]]);
    wrapper.unmount();
  });
  it("未传插槽时保持日期数字，非法月份不伪造日期", async () => {
    const wrapper = mount(MonthCalendar, {
      props: { month: "2026-10" },
      global,
    });
    expect(wrapper.get('[data-date="2026-10-01"]').text()).toBe("1");
    await wrapper.setProps({ month: "2026-13" });
    expect(wrapper.findAll("[data-date]")).toHaveLength(0);
    wrapper.unmount();
  });
});
