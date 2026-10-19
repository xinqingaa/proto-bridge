import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import { shallowRef, reactive } from "vue";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import {
  emptyHabitDraft,
  habitNameError,
  reminderTimeError,
} from "@/prototypes/yike/components/habit-form";
import WheelPicker from "@/design-system/components/input/WheelPicker.vue";
import YikeHabitForm from "@/prototypes/yike/components/YikeHabitForm.vue";
import CompositionPreview from "@/prototypes/yike/previews/CompositionPreview.vue";
import { createPreviewDevice } from "@/workbench/preview/model";
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
  it("编辑不污染已保存值，设置拒绝越界值并能确认合法值", async () => {
    const device = reactive(
      createPreviewDevice("A", {
        contextId: "prototype:yike",
        theme: "water",
        mode: "dark",
      }),
    );
    device.demo.session = { saved: { ...emptyHabitDraft(), name: "读书" } };
    const wrapper = mount(CompositionPreview, {
      props: {
        device,
        attach: ".test-host",
        states: [{ id: "edit", label: "编辑" }],
      },
      global,
    });
    await wrapper.findAllComponents({ name: "Button" })[0]!.vm.$emit("click");
    expect(device.demo.session?.draft).toMatchObject({ name: "读书" });
    (device.demo.session!.draft as { name: string }).name = "未保存";
    expect(device.demo.session?.saved).toMatchObject({ name: "读书" });
    wrapper
      .findComponent({ name: "GroupedList" })
      .vm.$emit("select", { groupId: "focus", itemId: "focus" });
    await wrapper.vm.$nextTick();
    device.demo.session!.settingDraft = 181;
    await wrapper.vm.$nextTick();
    expect(device.demo.session?.settingKey).toBe("focus");
    wrapper
      .findAllComponents({ name: "YikeAction" })
      .find((action) => action.props("inspectId") === "preview.A.setting-save")!
      .vm.$emit("click");
    await wrapper.vm.$nextTick();
    expect(device.demo.session?.panel).toBe("setting");
    expect(device.demo.session?.settingError).toContain("1–180");
    expect(device.demo.session?.focus).toBeUndefined();
    device.demo.session!.settingDraft = 180;
    await wrapper.vm.$nextTick();
    wrapper
      .findAllComponents({ name: "YikeAction" })
      .find((action) => action.props("inspectId") === "preview.A.setting-save")!
      .vm.$emit("click");
    await wrapper.vm.$nextTick();
    expect(device.demo.session?.focus).toBe(180);
    expect(device.demo.session?.panel).toBe("");
    wrapper.unmount();
  });
});
