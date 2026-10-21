import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PrimaryTabs from "@/design-system/components/navigation/PrimaryTabs.vue";

describe("PrimaryTabs selection-only mode", () => {
  it("does not mount a viewport, retains controlled selection, and blocks disabled input", async () => {
    const wrapper = mount(PrimaryTabs, {
      props: {
        viewport: false,
        swipe: false,
        modelValue: "week",
        label: "范围",
        items: [
          { value: "week", label: "周" },
          { value: "month", label: "月" },
        ],
      },
    });
    expect(wrapper.find(".pb-tab-window").exists()).toBe(false);
    expect(wrapper.get('[role="tablist"]').attributes("aria-label")).toBe(
      "范围",
    );
    expect(wrapper.findAll("[aria-controls]")).toHaveLength(0);
    await wrapper.findAll("button")[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["month"]]);
    expect(wrapper.findAll("button")[0]!.attributes("aria-selected")).toBe(
      "true",
    );
    await wrapper.setProps({ modelValue: "month", disabled: true });
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
    expect(
      wrapper
        .findAll("button")
        .every((button) => button.attributes("disabled") !== undefined),
    ).toBe(true);
    wrapper.unmount();
  });
});
