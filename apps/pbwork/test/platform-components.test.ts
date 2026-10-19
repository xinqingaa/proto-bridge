import { mount } from "@vue/test-utils";
import { nextTick, shallowRef, type Component } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import SegmentedControl from "@/design-system/components/input/SegmentedControl.vue";
import Stepper from "@/design-system/components/input/Stepper.vue";
import DurationPicker from "@/design-system/components/input/DurationPicker.vue";
import RingProgress from "@/design-system/components/display/RingProgress.vue";
import Metric from "@/design-system/components/display/Metric.vue";
import Heatmap from "@/design-system/components/display/Heatmap.vue";
import MiniBars from "@/design-system/components/display/MiniBars.vue";
import MonthCalendar from "@/design-system/components/display/MonthCalendar.vue";
import ListCell from "@/design-system/components/data/ListCell.vue";
import GroupedList from "@/design-system/components/data/GroupedList.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import ActionSheet from "@/design-system/components/feedback/ActionSheet.vue";
import BrandMark from "@/design-system/components/navigation/BrandMark.vue";
import LaunchScreen from "@/design-system/components/navigation/LaunchScreen.vue";
import {
  monthDays,
  parseDay,
  shiftMonth,
  heatmapWeeks,
} from "@/design-system/components/_shared/calendar";
import { getInspectRegistration } from "@/runtime/inspect/registry";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import { componentRecords } from "@/design-system/components/registry";
import { loadComponentContracts } from "@/design-system/loaders";

const ids = [
  "segmented-control",
  "stepper",
  "duration-picker",
  "ring-progress",
  "metric",
  "tag",
  "mini-bars",
  "heatmap",
  "month-calendar",
  "list-cell",
  "grouped-list",
  "toast",
  "action-sheet",
  "brand-mark",
  "launch-screen",
];
const modules = import.meta.glob<{ default: Component }>(
  "../src/design-system/components/{input,display,data,feedback,navigation}/*.vue",
  { eager: true },
);
const wrappers: Array<{ unmount(): void }> = [];
const stubs = {
  TransientNotice: {
    props: ["modelValue"],
    template: '<div v-if="modelValue"><slot /></div>',
  },
  BottomSheet: {
    props: ["modelValue"],
    template: '<div v-if="modelValue"><slot /><slot name="actions" /></div>',
  },
  DataList: { template: "<div><slot /></div>" },
  SwitchControl: true,
  Button: {
    props: ["label", "loading"],
    emits: ["click"],
    template:
      '<button :disabled="loading" @click="$emit(\'click\')">{{label}}</button>',
  },
};
function render(
  component: Component,
  props: Record<string, unknown> = {},
  global: Record<string, unknown> = {},
) {
  const wrapper = mount(component, { props, global: { stubs, ...global } });
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

for (const [pack, theme] of [
  ["pbwork-base", "default"],
  ["pbwork-sample", "garden"],
] as const)
  for (const mode of ["light", "dark"] as const) {
    describe(`${pack}/${mode}`, () => {
      for (const id of ids)
        it(`${id} renders its real registered semantic root`, async () => {
          const record = componentRecords.find((item) => item.id === id)!;
          const contract = loadComponentContracts().find(
            (item) => item.id === id,
          )!;
          const component = Object.entries(modules).find(([file]) =>
            file.endsWith("/" + record.view),
          )![1].default;
          const wrapper = render(
            component,
            {
              ...contract.defaultProps,
              ...(["toast", "action-sheet"].includes(id)
                ? { modelValue: true }
                : {}),
              inspectId: `test.home.${id}`,
            },
            {
              provide: {
                [ThemeTableKey as symbol]: shallowRef(
                  resolveRuntimeTheme(pack, theme, mode),
                ),
              },
            },
          );
          await nextTick();
          const root = wrapper.find(`[data-pb-id="test.home.${id}"]`);
          expect(root.exists()).toBe(true);
          const registration = getInspectRegistration(
            root.element as HTMLElement,
          )!;
          expect(registration.componentId).toBe(id);
          expect(Object.keys(registration.getTokenBindings!()).sort()).toEqual(
            Object.keys(contract.tokenBindings).sort(),
          );
        });
    });
  }
it("segments skip disabled options and preserve radio keyboard semantics", async () => {
  const wrapper = render(SegmentedControl, {
    modelValue: "a",
    items: [
      { id: "a", label: "A" },
      { id: "b", label: "B", disabled: true },
      { id: "c", label: "C" },
    ],
  });
  await wrapper
    .get('[data-value="a"]')
    .trigger("keydown", { key: "ArrowRight" });
  expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["c"]);
  await wrapper.setProps({ disabled: true });
  await wrapper.get('[data-value="c"]').trigger("click");
  expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
});
it("stepper clamps edits and suppresses disabled/boundary actions", async () => {
  const wrapper = render(Stepper, { modelValue: 10, min: 0, max: 10, step: 2 });
  expect(wrapper.findAll("button")[1]!.attributes("disabled")).toBeDefined();
  const input = wrapper.get("input");
  await input.setValue("19");
  await input.trigger("change");
  expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([10]);
  const emitted = wrapper.emitted("update:modelValue")!.length;
  await wrapper.setProps({ disabled: true });
  await wrapper.findAll("button")[0]!.trigger("click");
  expect(wrapper.emitted("update:modelValue")).toHaveLength(emitted);
});
it("duration keyboard edits total minutes and responds to external values", async () => {
  const wrapper = render(DurationPicker, { modelValue: 90, minuteStep: 15 });
  await wrapper
    .get('[aria-label="分钟"]')
    .trigger("keydown", { key: "ArrowDown" });
  expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([105]);
  await wrapper.setProps({ modelValue: 125 });
  expect(
    wrapper.get('[aria-label="小时"]').attributes("aria-activedescendant"),
  ).toContain("hour-2");
  await wrapper.setProps({ disabled: true });
  await wrapper.get('[aria-label="小时"]').trigger("keydown", { key: "End" });
  expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
});
it("ring exposes clamped actual progress, including invalid maximum", () => {
  expect(
    render(RingProgress, { value: 150, max: 100 }).attributes("aria-valuenow"),
  ).toBe("100");
  expect(
    render(RingProgress, { value: 50, max: 0 }).attributes("aria-valuenow"),
  ).toBe("0");
});
it("metric distinguishes omitted change from zero and MiniBars preserves zero", () => {
  expect(render(Metric, { change: 0 }).text()).toContain("持平");
  expect(render(Metric).find('[data-pb-role="status"]').exists()).toBe(false);
  const bars = render(MiniBars, {
    items: [{ id: "zero", label: "零", value: 0 }],
  });
  expect(bars.get("i").attributes("style")).toContain("--pb-bar-height: 0%");
});
it("calendar arithmetic covers leap years, padding and missing heatmap dates without a clock", () => {
  expect(parseDay("2025-02-29")).toBeNull();
  expect(monthDays("2024-02").flat().filter(Boolean)).toHaveLength(29);
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  expect(monthDays("bad")).toEqual([]);
  const weeks = heatmapWeeks([
    { date: "2026-07-01", value: 0 },
    { date: "2026-07-03", value: 4 },
  ]);
  expect(weeks.every((week) => week.length === 7)).toBe(true);
  expect(
    weeks.flat().find((day) => day.date === "2026-07-02")?.value,
  ).toBeNull();
  expect(weeks.flat().find((day) => day.date === "2026-07-01")?.value).toBe(0);
});
it("calendar blocks disabled dates and emits explicit month navigation", async () => {
  const wrapper = render(MonthCalendar, {
    month: "2026-12",
    disabledDates: ["2026-12-02"],
  });
  await wrapper.get('[data-date="2026-12-02"]').trigger("click");
  expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  await wrapper.get('[aria-label="下个月"]').trigger("click");
  expect(wrapper.emitted("update:month")?.[0]).toEqual(["2027-01"]);
});
it("ListCell never nests a Switch inside a navigation button", () => {
  const row = render(ListCell, { navigation: true, modelValue: true });
  expect(row.find("button.main").exists()).toBe(false);
  expect(row.find("switch-control-stub").exists()).toBe(true);
});
it("GroupedList forwards stable group/item identities", async () => {
  const wrapper = render(GroupedList, {
    groups: [
      {
        id: "settings",
        title: "设置",
        items: [{ id: "reminder", title: "提醒", navigation: true }],
      },
    ],
  });
  await wrapper.get("button.main").trigger("click");
  expect(wrapper.emitted("select")?.[0]).toEqual([
    { groupId: "settings", itemId: "reminder" },
  ]);
});
it("Toast undo fires once per opening and closes after the business event", async () => {
  const wrapper = render(Toast, {
    modelValue: true,
    message: "记录已删除",
    actionLabel: "撤销",
  });
  await wrapper.get("button").trigger("click");
  await wrapper.get("button").trigger("click");
  expect(wrapper.emitted("undo")).toHaveLength(1);
  expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
  await wrapper.setProps({ modelValue: false });
  await wrapper.setProps({ modelValue: true });
  await wrapper.get("button").trigger("click");
  expect(wrapper.emitted("undo")).toHaveLength(2);
});
it("ActionSheet ignores disabled choices and returns the action id before closing", async () => {
  const wrapper = render(ActionSheet, {
    modelValue: true,
    items: [
      { id: "blocked", label: "不可用", disabled: true },
      { id: "edit", label: "编辑" },
    ],
  });
  const buttons = wrapper.findAll("section button");
  await buttons[0]!.trigger("click");
  expect(wrapper.emitted("select")).toBeUndefined();
  await buttons[1]!.trigger("click");
  expect(wrapper.emitted("select")?.[0]).toEqual(["edit"]);
  expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([false]);
});
it("BrandMark responds to theme assets and LaunchScreen leaves navigation to its caller", async () => {
  const table = shallowRef(
    resolveRuntimeTheme("pbwork-base", "default", "light"),
  );
  const brand = render(
    BrandMark,
    { name: "名字" },
    { provide: { [ThemeTableKey as symbol]: table } },
  );
  expect(brand.find("img").exists()).toBe(false);
  table.value = resolveRuntimeTheme("pbwork-sample", "garden", "light");
  await nextTick();
  expect(brand.find("img").exists()).toBe(true);
  const launch = render(LaunchScreen);
  await launch.get("button").trigger("click");
  expect(launch.emitted("start")).toHaveLength(1);
});

it("repeated component parts preserve the owning key without duplicate local identities", async () => {
  const first = render(ListCell, {
    inspectId: "test.home.row",
    pbKey: "alpha",
    title: "A",
    modelValue: null,
  });
  const second = render(ListCell, {
    inspectId: "test.home.row",
    pbKey: "beta",
    title: "B",
    modelValue: null,
  });
  const titleA = first.get('[data-pb-id="test.home.row.title"]');
  const titleB = second.get('[data-pb-id="test.home.row.title"]');
  expect(titleA.attributes("data-pb-key")).toBe("alpha");
  expect(titleB.attributes("data-pb-key")).toBe("beta");
  await first.setProps({modelValue:true});
  await second.setProps({modelValue:true});
  expect(
    first.findComponent({ name: "SwitchControl" }).props("inspectId"),
  ).toBe("test.home.row.switch.alpha");
  expect(
    second.findComponent({ name: "SwitchControl" }).props("inspectId"),
  ).toBe("test.home.row.switch.beta");
});

it("Tag preview bindings distinguish neutral surfaces from semantic soft tones", async () => {
  const { resolveLiveTokenBindings } =
    await import("@/design-system/resolveLiveTokenBindings");
  const contract = loadComponentContracts().find(
    (contract) => contract.id === "tag",
  )!;
  const neutral = resolveLiveTokenBindings(
    contract.tokenBindings,
    { tone: "neutral" },
    "tag",
  );
  expect(neutral.background).toBe("color.surface-variant");
  expect(neutral.color).toBe("color.on-surface");
  const success = resolveLiveTokenBindings(
    contract.tokenBindings,
    { tone: "success" },
    "tag",
  );
  expect(success.background).toBe("color.success-soft");
  expect(success.color).toBe("color.success");
});

it("Heatmap gives missing dates and measured zero distinct explicit evidence", () => {
  const wrapper = render(Heatmap, {
    days: [
      { date: "2026-07-01", value: 0 },
      { date: "2026-07-03", value: 1 },
    ],
  });
  const zero = wrapper.get('[data-pb-key="day-2026-07-01"]');
  const missing = wrapper.get('[data-pb-key="day-2026-07-02"]');
  expect(zero.attributes("aria-label")).toBe("2026-07-01：0");
  expect(missing.attributes("aria-label")).toBe("2026-07-02：无记录");
  expect(zero.attributes("data-pb-token-background")).toBe(
    "color.surface-variant",
  );
  expect(missing.attributes("data-pb-token-background")).toBe("transparent");
});
