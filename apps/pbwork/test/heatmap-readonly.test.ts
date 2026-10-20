import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { h, shallowRef } from "vue";
import Heatmap from "@/design-system/components/display/Heatmap.vue";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
const global = {
  provide: {
    [ThemeTableKey as symbol]: shallowRef(
      resolveRuntimeTheme("pbwork-base", "default", "light"),
    ),
  },
};
const records = [
  { date: "2024-02-28", value: 1 },
  { date: "2024-03-01", value: 0 },
];
describe("Heatmap只读展示", () => {
  it("默认仍可选择日期，交互模式不使用整图替换插槽", async () => {
    const wrapper = mount(Heatmap, {
      global,
      props: { days: records, modelValue: "" },
      slots: { plot: () => h("p", "不应替换交互图") },
    });
    expect(wrapper.text()).not.toContain("不应替换交互图");
    await wrapper
      .get('button[aria-label="2024-02-29：无记录"]')
      .trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["2024-02-29"]]);
    wrapper.unmount();
  });
  it("只读保留闰日、缺失与业务标签，格子没有按钮或选择事件", async () => {
    const wrapper = mount(Heatmap, {
      global,
      props: {
        days: records,
        readonly: true,
        dayLabels: { "2024-02-29": "闰日：数据缺失" },
      },
    });
    expect(wrapper.findAll("button")).toHaveLength(0);
    expect(wrapper.findAll("[aria-pressed]")).toHaveLength(0);
    const leap = wrapper.get('[aria-label="闰日：数据缺失"]');
    await leap.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.text()).not.toContain("选择日期查看记录");
    wrapper.unmount();
  });
  it("只读plot接收公共日期排列且保留null，图例可替换", () => {
    const wrapper = mount(Heatmap, {
      global,
      props: { days: records, readonly: true },
      slots: {
        plot: ({
          weeks,
          max,
        }: {
          weeks: Array<Array<{ date: string; value: number | null }>>;
          max: number;
        }) => h("pre", JSON.stringify({ weeks, max })),
        legend: () => h("p", "业务图例"),
      },
    });
    const result = JSON.parse(wrapper.get("pre").text());
    expect(result.weeks[0][0].date).toBe("2024-02-26");
    expect(
      result.weeks.flat().find((d: { date: string }) => d.date === "2024-02-29")
        .value,
    ).toBeNull();
    expect(result.max).toBe(1);
    expect(wrapper.text()).toContain("业务图例");
    expect(wrapper.find(".legend").exists()).toBe(false);
    wrapper.unmount();
  });
});
