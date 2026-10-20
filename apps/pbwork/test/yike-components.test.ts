import Heatmap from "@/design-system/components/display/Heatmap.vue";
import YikeHabitYear from "@/prototypes/yike/components/YikeHabitYear.vue";
import YikeMonthCalendar from "@/prototypes/yike/components/YikeMonthCalendar.vue";
import {
  parseThemeColor,
  compositeOver,
  contrastRatio,
} from "@proto-bridge/core/v2";
import { describe, expect, it } from "vitest";
import { createVuetify } from "vuetify";
import { mount, shallowMount } from "@vue/test-utils";
import { shallowRef, defineComponent, h } from "vue";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import YikeDial from "@/prototypes/yike/components/YikeDial.vue";
import YikeHabitCard from "@/prototypes/yike/components/YikeHabitCard.vue";
import {
  emptyHabitDraft,
  habitNameError,
  reminderTimeError,
} from "@/prototypes/yike/components/habit-form";
import WheelPicker from "@/design-system/components/input/WheelPicker.vue";
import YikeHabitForm from "@/prototypes/yike/components/YikeHabitForm.vue";
import YikeWeekChart from "@/prototypes/yike/components/YikeWeekChart.vue";
import YikeDurationPicker from "@/prototypes/yike/components/YikeDurationPicker.vue";

describe("表盘与打卡", () => {
  describe("一刻正式资源", () => {
    it("习惯名称与今日操作各自发出事件，未来日期不出现完成标记或补签按钮", async () => {
      const table = shallowRef(
        resolveRuntimeTheme("yike", "mechanical", "light"),
      );
      const wrapper = mount(YikeHabitCard, {
        props: {
          inspectId: "test.habit",
          face: "mechanical",
          habit: { id: "read", name: "读书", icon: "book", meta: "每天" },
          today: "2026-10-16",
          days: [
            { date: "2026-10-16", completed: false },
            { date: "2026-10-17", completed: true },
          ],
        },
        global: { provide: { [ThemeTableKey as symbol]: table } },
      });
      expect(wrapper.findAll("button")).toHaveLength(2);
      expect(wrapper.get(".is-future").classes()).not.toContain("is-on");
      await wrapper.get(".habit-name").trigger("click");
      expect(wrapper.emitted("open")).toEqual([["read"]]);
      expect(wrapper.emitted("toggleToday")).toBeUndefined();
      await wrapper.get(".today").trigger("click");
      expect(wrapper.emitted("toggleToday")).toEqual([["read"]]);
      await wrapper.setProps({ disabled: true });
      await wrapper.get(".today").trigger("click");
      expect(wrapper.emitted("toggleToday")).toHaveLength(1);
      wrapper.unmount();
    });

    it("机械盘使用60分钟尺度，整小时为满圈，超小时以余量与小时说明共同读数", async () => {
      const table = shallowRef(
        resolveRuntimeTheme("yike", "mechanical", "light"),
      );
      const wrapper = mount(YikeDial, {
        props: {
          face: "mechanical",
          fraction: 0,
          digits: "00:00",
          caption: "剩余",
          inspectId: "test.dial",
        },
        global: { provide: { [ThemeTableKey as symbol]: table } },
      });
      expect(wrapper.find("g.wedge").exists()).toBe(false);
      await wrapper.setProps({ fraction: 25 / 60 });
      const arc = wrapper
        .findAll("clipPath")
        .at(-1)!
        .get("path")
        .attributes("d");
      await wrapper.setProps({ fraction: 25 / 60 });
      expect(
        wrapper.findAll("clipPath").at(-1)!.get("path").attributes("d"),
      ).toBe(arc);
      await wrapper.setProps({ tone: "paused" });
      expect(wrapper.get(".caption").attributes("data-pb-token-color")).toBe(
        "color.primary",
      );
      await wrapper.setProps({ tone: "done" });
      expect(wrapper.get(".digits").attributes("data-pb-token-color")).toBe(
        "color.primary",
      );
      await wrapper.setProps({ fraction: 1 });
      expect(wrapper.findAll("clipPath").at(-1)!.find("circle").exists()).toBe(
        true,
      );
      await wrapper.setProps({ fraction: 1 / 60 });
      expect(wrapper.findAll("clipPath").at(-1)!.find("circle").exists()).toBe(
        false,
      );
      await wrapper.setProps({ note: "另有 30 分钟" });
      expect(wrapper.attributes("aria-label")).toBe(
        "剩余 · 另有 30 分钟 00:00",
      );
      wrapper.unmount();
    });

    it("水位反色副本不重复读屏，裁切随进度变化且多个实例不共享SVG id", async () => {
      const table = shallowRef(resolveRuntimeTheme("yike", "water", "dark"));
      const options = {
        props: {
          face: "water" as const,
          fraction: 0.5,
          digits: "12:30",
          caption: "专注中",
          inspectId: "test.water",
        },
        global: { provide: { [ThemeTableKey as symbol]: table } },
      };
      const first = mount(YikeDial, options);
      const pair = mount(
        defineComponent({
          render: () =>
            h("div", [
              h(YikeDial, { ...options.props, inspectId: "test.first" }),
              h(YikeDial, { ...options.props, inspectId: "test.second" }),
            ]),
        }),
        { global: options.global },
      );
      expect(first.get(".submerged").attributes("aria-hidden")).toBe("true");
      expect(first.get("clipPath rect").attributes("height")).toBe("184");
      const ids = pair.findAll("clipPath").map((node) => node.attributes("id"));
      expect(new Set(ids).size).toBe(ids.length);
      await first.setProps({ fraction: 0 });
      expect(first.get("clipPath rect").attributes("height")).toBe("0");
      first.unmount();
      pair.unmount();
    });
  });
});

describe("习惯表单", () => {
  const table = shallowRef(resolveRuntimeTheme("yike", "water", "dark"));
  const global = {
    plugins: [createVuetify()],
    provide: { [ThemeTableKey as symbol]: table },
    stubs: {
      VExpandTransition: { template: "<slot />" },
      TextField: true,
      SegmentedControl: true,
      SwitchControl: true,
      Spinner: true,
      BottomSheet: {
        template: '<section><slot /><slot name="actions" /></section>',
      },
      GroupedList: true,
      Toast: true,
      Button: true,
    },
  };
  describe("习惯资源的输入和会话边界", () => {
    it("按可见字素计数，拒绝空白和不可见名称，提醒仅接受合法本地时间", () => {
      for (const name of ["", "  ", "\u200b\u200d", "\u0301"])
        expect(habitNameError(name)).not.toBe("");
      expect(habitNameError("👨‍👩‍👧‍👦".repeat(30))).toBe("");
      expect(habitNameError("读".repeat(31))).not.toBe("");
      expect(
        reminderTimeError({
          ...emptyHabitDraft(),
          reminder: true,
          reminderTime: "24:00",
        }),
      ).not.toBe("");
      expect(
        reminderTimeError({
          ...emptyHabitDraft(),
          reminder: true,
          reminderTime: "23:59",
        }),
      ).toBe("");
    });
    it("无效提交不保存，合法提交去首尾空白；等待中阻止再次保存", async () => {
      const wrapper = mount(YikeHabitForm, {
        props: { modelValue: emptyHabitDraft(), inspectId: "test.form" },
        global,
      });
      await wrapper.get("form").trigger("submit");
      expect(wrapper.emitted("save")).toBeUndefined();
      await wrapper.setProps({
        modelValue: { ...emptyHabitDraft(), name: "  读书  ", reminder: true },
      });
      const clock = wrapper.findComponent(WheelPicker);
      expect(clock.props("modelValue")).toEqual([21, 0]);
      await clock.vm.$emit("update:modelValue", [0, 0]);
      expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toMatchObject({
        reminderTime: "00:00",
      });
      await wrapper.get("form").trigger("submit");
      expect(wrapper.emitted("save")?.[0]?.[0]).toMatchObject({
        name: "读书",
        reminderTime: "21:00",
      });
      await wrapper.setProps({ submitting: true });
      await wrapper.get("form").trigger("submit");
      expect(wrapper.emitted("save")).toHaveLength(1);
      wrapper.unmount();
    });
  });
});

describe("周统计图", () => {
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
        "day-2026-10-12",
      );
      expect(wrapper.get(".scale").text()).toContain("500 分钟");
      expect(wrapper.findAll("button")[0]!.findAll("svg > rect")).toHaveLength(
        4,
      );
      expect(wrapper.findAll("button")[2]!.attributes("aria-label")).toContain(
        "0 分钟",
      );
      expect(wrapper.findAll("button")[5]!.findAll("svg > rect")).toHaveLength(
        0,
      );
      wrapper.unmount();
    });
    it("未来禁用、选中再点收起，日期输入无效时不伪造一周", async () => {
      const wrapper = mount(YikeWeekChart, { props });
      await wrapper.findAll("button")[5]!.trigger("click");
      expect(wrapper.emitted("update:modelValue")).toBeUndefined();
      await wrapper.findAll("button")[0]!.trigger("click");
      expect(wrapper.emitted("update:modelValue")).toEqual([["2026-10-12"]]);
      await wrapper.setProps({ modelValue: "2026-10-12" });
      expect(
        wrapper
          .findAll("button")[0]!
          .get(".value")
          .attributes("data-pb-token-color"),
      ).toBe("color.on-surface");
      expect(wrapper.findAll("button")[0]!.attributes("data-pb-id")).toBe(
        "test.week.day",
      );
      await wrapper.findAll("button")[0]!.trigger("click");
      expect(wrapper.emitted("update:modelValue")?.[1]).toEqual([""]);
      await wrapper.setProps({ weekStart: "2026-02-30" });
      expect(wrapper.findAll("button")).toHaveLength(0);
      expect(wrapper.get('[role="status"]').text()).toBe("日期无效");
      wrapper.unmount();
    });
    it("formats fractional minutes without changing plotted values", () => {
      const wrapper = mount(YikeWeekChart, {
        props: {
          ...props,
          days: [
            { date: "2026-10-12", minutes: 19 / 60 },
            { date: "2026-10-13", minutes: 65 / 60 },
          ],
        },
      });
      expect(
        wrapper
          .findAll(".value")
          .slice(0, 2)
          .map((el) => el.text()),
      ).toEqual(["19秒", "1.1"]);
      expect(wrapper.text()).not.toContain("666666");
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
      expect(wrapper.findAll("button")[2]!.find(".ink-cap").exists()).toBe(
        false,
      );
      wrapper.unmount();
    });
  });
});

describe("时长输入", () => {
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

describe("日期与历史", () => {
  const global = {
    provide: {
      [ThemeTableKey as symbol]: shallowRef(
        resolveRuntimeTheme("yike", "water", "light"),
      ),
    },
    stubs: { Icon: true },
  };
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
  it("yike年度图组合公共Heatmap，完成优先于归档，边界与缺失各自表达", () => {
    const wrapper = mount(YikeHabitYear, {
      global,
      props: {
        inspectId: "habit.year",
        face: "water",
        today: "2024-03-01",
        createdOn: "2024-02-27",
        completeness: "partial",
        days: [{ date: "2024-02-28", completed: true }],
        archived: [{ from: "2024-02-28", to: "2024-02-29" }],
      },
    });
    expect(wrapper.findComponent(Heatmap).exists()).toBe(true);
    expect(
      wrapper.get('[data-date="2024-02-26"]').attributes("data-state"),
    ).toBe("before");
    expect(
      wrapper.get('[data-date="2024-02-28"]').attributes("data-state"),
    ).toBe("done");
    expect(
      wrapper.get('[data-date="2024-02-29"]').attributes("data-state"),
    ).toBe("archived");
    expect(
      wrapper.get('[data-date="2024-03-01"]').attributes("data-state"),
    ).toBe("missing");
    expect(
      wrapper.get('[data-date="2024-03-02"]').attributes("data-state"),
    ).toBe("future");
    expect(wrapper.findAll("button")).toHaveLength(0);
    expect(wrapper.text()).toContain("最近365天完成 1 次");
    expect(wrapper.get(".axis span").text()).toBe("2023-03-03");
    wrapper.unmount();
  });
});

describe("时长键盘边界", () => {
  const DurationPicker = YikeDurationPicker;
  describe("duration range selection", () => {
    it("offers only valid combinations at both boundaries", async () => {
      const wrapper = mount(DurationPicker, {
        props: {
          inspectId: "test.duration",
          modelValue: 25,
          min: 1,
          max: 180,
          minuteStep: 1,
        },
      });
      const wheels = () => wrapper.findAll('[role="listbox"]');
      expect(
        wheels()[0]!
          .findAll('[role="option"]')
          .map((el) => el.text()),
      ).toEqual(["0", "1", "2", "3"]);
      expect(
        wheels()[1]!
          .findAll('[role="option"]')
          .map((el) => el.text()),
      ).not.toContain("00");
      await wheels()[0]!.trigger("keydown", { key: "End" });
      expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([180]);
      await wrapper.setProps({ modelValue: 180 });
      expect(
        wheels()[1]!
          .findAll('[role="option"]')
          .map((el) => el.text()),
      ).toEqual(["00"]);
      await wheels()[0]!.trigger("keydown", { key: "Home" });
      expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([1]);
      wrapper.unmount();
    });
    it("keeps a full-day countdown range while preventing zero", async () => {
      const wrapper = mount(DurationPicker, {
        props: {
          inspectId: "test.duration",
          modelValue: 1439,
          min: 1,
          max: 1439,
          minuteStep: 1,
        },
      });
      expect(
        wrapper.findAll('[aria-selected="true"]').map((el) => el.text()),
      ).toEqual(["23", "59"]);
      await wrapper.setProps({ disabled: true });
      await wrapper
        .findAll('[role="listbox"]')[0]!
        .trigger("keydown", { key: "Home" });
      expect(wrapper.emitted("update:modelValue")).toBeUndefined();
      wrapper.unmount();
    });
  });
});

it.each(
  ["mechanical", "water", "sundial"].flatMap((face) =>
    ["light", "dark"].map((mode) => [face, mode] as const),
  ),
)("%s/%s 月历档位不重归一化并选取对比更高的前景", async (face, mode) => {
  const table = resolveRuntimeTheme("yike", face!, mode!);
  const values = table.values;
  const days = [
    { date: "2026-10-16", minutes: 25 },
    { date: "2026-10-17", minutes: 60 },
    { date: "2026-10-18", minutes: 120 },
  ];
  const wrapper = mount(YikeMonthCalendar, {
    props: {
      inspectId: "review.month",
      face: face as "mechanical" | "water" | "sundial",
      month: "2026-10",
      today: "2026-10-19",
      days,
    },
    global: {
      provide: { [ThemeTableKey as symbol]: shallowRef(table) },
      stubs: { Icon: true },
    },
  });
  const primary = parseThemeColor(String(values["color.primary"]))!;
  const background = parseThemeColor(String(values["color.background"]))!;
  for (const [day, band] of [
    [16, "low"],
    [17, "medium"],
    [18, "high"],
  ] as const) {
    const cell = wrapper.get(`[data-date="2026-10-${day}"]`);
    expect(cell.get(".date-artwork").attributes("data-intensity")).toBe(band);
    const opacity = Number(
      cell.get("svg [fill-opacity]").attributes("fill-opacity"),
    );
    expect(opacity).toBe(values[`opacity.data-${band}`]);
    const token = cell
      .get(face === "water" ? ".submerged-number" : ".number")
      .attributes("data-pb-token-color");
    const foreground = parseThemeColor(String(values[token!]))!;
    const surface = compositeOver(
      { ...primary, a: primary.a * opacity },
      background,
    );
    const alternativeToken =
      token === "color.on-primary" ? "color.on-surface" : "color.on-primary";
    const alternative = parseThemeColor(String(values[alternativeToken]))!;
    expect(contrastRatio(foreground, surface)).toBeGreaterThanOrEqual(
      contrastRatio(alternative, surface),
    );
  }
  const fill = () =>
    wrapper
      .get('[data-date="2026-10-16"] svg [fill-opacity]')
      .attributes("fill-opacity");
  const before = fill();
  await wrapper.setProps({
    days: [...days, { date: "2026-10-19", minutes: 1000 }],
    modelValue: "2026-10-16",
  });
  expect(fill()).toBe(before);
  expect(wrapper.find('[data-date="2026-10-16"] .selection').exists()).toBe(
    true,
  );
  wrapper.unmount();
});
