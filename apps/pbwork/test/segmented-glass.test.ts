import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { shallowRef } from "vue";
import SegmentedControl from "@/design-system/components/input/SegmentedControl.vue";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";

describe("公共单选的玻璃材质", () => {
  for (const theme of ["mechanical", "water", "sundial"])
    for (const mode of ["light", "dark"]) {
      it(`${theme}/${mode} 保留单选、禁用和键盘行为`, async () => {
        const wrapper = mount(SegmentedControl, {
          props: {
            material: "glass",
            inspectId: "test.modes",
            label: "计时模式",
            items: [
              { id: "pomodoro", label: "番茄钟" },
              { id: "stopwatch", label: "正计时", disabled: true },
              { id: "countdown", label: "倒计时" },
            ],
            modelValue: "pomodoro",
          },
          global: {
            provide: {
              [ThemeTableKey as symbol]: shallowRef(
                resolveRuntimeTheme("yike", theme, mode),
              ),
            },
          },
        });
        expect(wrapper.find(".glass-material").exists()).toBe(true);
        expect(
          wrapper.get('[data-value="pomodoro"]').attributes("tabindex"),
        ).toBe("0");
        await wrapper
          .get('[data-value="pomodoro"]')
          .trigger("keydown", { key: "ArrowRight" });
        expect(wrapper.emitted("update:modelValue")).toEqual([["countdown"]]);
        await wrapper.get('[data-value="stopwatch"]').trigger("click");
        expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
        await wrapper.setProps({ disabled: true });
        await wrapper.get('[data-value="countdown"]').trigger("click");
        expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
        await wrapper.setProps({ material: "solid" });
        expect(wrapper.find(".glass-material").exists()).toBe(false);
        wrapper.unmount();
      });
    }
});
