import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DurationPicker from "@/prototypes/yike/components/YikeDurationPicker.vue";

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
