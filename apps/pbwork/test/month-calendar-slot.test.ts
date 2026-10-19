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
  it.each([
    ["pbwork-base", "default", "light"],
    ["pbwork-base", "default", "dark"],
    ["pbwork-sample", "garden", "light"],
    ["pbwork-sample", "garden", "dark"],
  ] as const)(
    "%s/%s/%s 外部周期导航不复制日期选择与键盘机制",
    async (pack, theme, mode) => {
      const wrapper = mount(MonthCalendar, {
        props: {
          month: "2024-02",
          showHeader: false,
          dayAppearance: "custom",
          modelValue: "2024-02-27",
          disabledDates: ["2024-02-29"],
        },
        global: {
          provide: {
            [ThemeTableKey as symbol]: shallowRef(
              resolveRuntimeTheme(pack, theme, mode),
            ),
          },
          stubs: { Icon: true },
        },
      });
      expect(wrapper.find("header").exists()).toBe(false);
      expect(wrapper.classes()).toContain("custom-days");
      expect(wrapper.findAll("[data-date]")).toHaveLength(29);
      expect(
        wrapper.get('[data-date="2024-02-29"]').attributes("disabled"),
      ).toBeDefined();
      await wrapper.get('[data-date="2024-02-28"]').trigger("click");
      expect(wrapper.emitted("update:modelValue")).toEqual([["2024-02-28"]]);
      await wrapper
        .get('[data-date="2024-02-28"]')
        .trigger("keydown", { key: "Home" });
      await wrapper.setProps({ month: "2024-03" });
      expect(wrapper.findAll("[data-date]")).toHaveLength(31);
      expect(wrapper.emitted("update:month")).toBeUndefined();
      wrapper.unmount();
    },
  );
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

describe("一刻月历组合", () => {
  it("选中日期保留数据前景，空记录也可选择并再次收起，未来日期不可选", async () => {
    const { default: YikeMonthCalendar } =
      await import("@/prototypes/yike/components/YikeMonthCalendar.vue");
    const wrapper = mount(YikeMonthCalendar, {
      props: {
        inspectId: "review.month",
        face: "water",
        month: "2024-02",
        today: "2024-02-28",
        days: [
          { date: "2024-02-28", minutes: 25 },
          { date: "2024-02-29", minutes: 500 },
        ],
        modelValue: "2024-02-27",
      },
      global,
    });
    const selected = wrapper.get('[data-date="2024-02-27"]');
    expect(selected.get(".number").attributes("data-pb-token-color")).toBe(
      "color.on-surface-muted",
    );
    expect(selected.get(".date-artwork").classes()).toContain("is-selected");
    await selected.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[""]]);
    await wrapper.get('[data-date="2024-02-28"]').trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      "2024-02-28",
    ]);
    const future = wrapper.get('[data-date="2024-02-29"]');
    expect(future.attributes("disabled")).toBeDefined();
    expect(future.attributes("aria-label")).toContain("未来日期");
    await future.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toHaveLength(2);
    expect(
      wrapper.get('[data-date="2024-02-28"] rect').attributes("height"),
    ).not.toBe(
      wrapper.get('[data-date="2024-02-28"] rect').attributes("width"),
    );
    await wrapper.setProps({ today: "invalid" });
    expect(wrapper.findAll("[data-date]")).toHaveLength(0);
    wrapper.unmount();
  });
});

it.each(
  ["mechanical", "water", "sundial"].flatMap((theme) =>
    ["light", "dark"].map((mode) => [theme, mode]),
  ),
)("一刻%s/%s的最大量和半量日期保持可读前景", async (theme, mode) => {
  const { default: Calendar } =
    await import("@/prototypes/yike/components/YikeMonthCalendar.vue");
  const wrapper = mount(Calendar, {
    props: {
      inspectId: "review.month",
      face: theme as "mechanical" | "water" | "sundial",
      month: "2026-10",
      today: "2026-10-16",
      days: [
        { date: "2026-10-15", minutes: 125 },
        { date: "2026-10-14", minutes: 62.5 },
      ],
    },
    global: {
      provide: {
        [ThemeTableKey as symbol]: shallowRef(
          resolveRuntimeTheme("yike", theme!, mode!),
        ),
      },
      stubs: { Icon: true },
    },
  });
  expect(
    wrapper
      .get('[data-date="2026-10-15"] .number')
      .attributes("data-pb-token-color"),
  ).toBe(theme === "water" ? "color.on-surface" : "color.on-primary");
  if (theme === "water") {
    for (const date of ["2026-10-14", "2026-10-15"]) {
      expect(
        wrapper
          .get(`[data-date="${date}"] .number`)
          .attributes("data-pb-token-background"),
      ).toBeUndefined();
      expect(
        wrapper
          .get(`[data-date="${date}"] .submerged-number`)
          .attributes("clip-path"),
      ).toContain("water-");
    }
  }
  wrapper.unmount();
});

it.each(["mechanical", "water", "sundial"] as const)(
  "%s: three stable minute bands do not renormalize after a large record",
  async (face) => {
    const { default: Calendar } =
      await import("@/prototypes/yike/components/YikeMonthCalendar.vue");
    const wrapper = mount(Calendar, {
      props: {
        inspectId: "review.tiers",
        face,
        month: "2026-10",
        today: "2026-10-19",
        days: [
          { date: "2026-10-16", minutes: 25 },
          { date: "2026-10-17", minutes: 60 },
          { date: "2026-10-18", minutes: 120 },
        ],
      },
      global,
    });
    for (const [date, band] of [
      ["16", "low"],
      ["17", "medium"],
      ["18", "high"],
    ]) {
      const cell = wrapper.get(`[data-date="2026-10-${date}"]`);
      expect(cell.get(".date-artwork").attributes("data-intensity")).toBe(band);
      expect(cell.get("svg").attributes("data-pb-token-opacity")).toBe(
        `opacity.data-${band}`,
      );
    }
    const before = wrapper.get('[data-date="2026-10-16"] svg').html();
    await wrapper.setProps({
      days: [
        { date: "2026-10-16", minutes: 25 },
        { date: "2026-10-19", minutes: 1000 },
      ],
      modelValue: "2026-10-16",
    });
    expect(
      wrapper
        .get('[data-date="2026-10-16"] .date-artwork')
        .attributes("data-intensity"),
    ).toBe("low");
    expect(wrapper.find('[data-date="2026-10-16"] .selection').exists()).toBe(
      true,
    );
    expect(before).toContain('fill-opacity="0.3"');
    expect(wrapper.get('[data-date="2026-10-16"] svg').html()).toContain(
      'fill-opacity="0.3"',
    );
    wrapper.unmount();
  },
);

it.each(["mechanical", "water", "sundial"] as const)(
  "%s has a theme-specific today glyph independent from selection",
  async (face) => {
    const { default: Calendar } =
      await import("@/prototypes/yike/components/YikeMonthCalendar.vue");
    const wrapper = mount(Calendar, {
      props: {
        inspectId: "review.today",
        face,
        month: "2026-10",
        today: "2026-10-19",
        modelValue: "2026-10-18",
        days: [],
      },
      global,
    });
    expect(wrapper.findAll(".today-mark")).toHaveLength(1);
    expect(wrapper.get(".today-mark").attributes("data-face")).toBe(face);
    expect(
      wrapper.get('[data-date="2026-10-19"]').attributes("aria-label"),
    ).toContain("今天");
    expect(wrapper.find('[data-date="2026-10-19"] .selection').exists()).toBe(
      false,
    );
    expect(wrapper.find('[data-date="2026-10-18"] .today-mark').exists()).toBe(
      false,
    );
    wrapper.unmount();
  },
);
it("sundial shadows deepen through increasing Gaussian blur while numbers remain outside the filter", async () => {
  const { default: Calendar } =
    await import("@/prototypes/yike/components/YikeMonthCalendar.vue");
  const wrapper = mount(Calendar, {
    props: {
      inspectId: "review.shadow",
      face: "sundial",
      month: "2026-10",
      today: "2026-10-19",
      days: [
        { date: "2026-10-16", minutes: 25 },
        { date: "2026-10-17", minutes: 60 },
        { date: "2026-10-18", minutes: 120 },
      ],
    },
    global,
  });
  const blur = [16, 17, 18].map((day) =>
    Number(
      wrapper
        .get(`[data-date="2026-10-${day}"] feGaussianBlur`)
        .attributes("stdDeviation"),
    ),
  );
  expect(blur[0]).toBeGreaterThan(0);
  expect(blur[1]).toBeGreaterThan(blur[0]!);
  expect(blur[2]).toBeGreaterThan(blur[1]!);
  expect(
    wrapper.get('[data-date="2026-10-18"] .number').attributes("filter"),
  ).toBeUndefined();
  wrapper.unmount();
});
