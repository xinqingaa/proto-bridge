import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { shallowRef } from "vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import ConfirmDialog from "@/design-system/components/feedback/ConfirmDialog.vue";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";

const pass = { template: "<div><slot /></div>" };
const stubs = {
  VBtn: { template: "<button><slot /></button>" },
  VBottomSheet: pass,
  VDialog: pass,
  VCard: pass,
  VCardText: pass,
  VCardTitle: pass,
  Icon: true,
};
const contexts = [
  ["pbwork-base", "default", "light"],
  ["pbwork-base", "default", "dark"],
  ["pbwork-sample", "garden", "light"],
  ["pbwork-sample", "garden", "dark"],
  ...["mechanical", "water", "sundial"].flatMap((theme) =>
    ["light", "dark"].map((mode) => ["yike", theme, mode]),
  ),
];
describe("共享面板材质与原有行为", () => {
  it.each(contexts)(
    "%s/%s/%s 的玻璃不改变受控关闭",
    async (pack, theme, mode) => {
      const global = {
        provide: {
          [ThemeTableKey as symbol]: shallowRef(
            resolveRuntimeTheme(pack!, theme!, mode!),
          ),
        },
        stubs,
      };
      const sheet = mount(BottomSheet, {
        props: { title: "配置", material: "glass", modelValue: true },
        global,
      });
      expect(sheet.findAll(".glass-material")).toHaveLength(1);
      await sheet.get('[aria-label="关闭"]').trigger("click");
      expect(sheet.emitted("update:modelValue")).toEqual([[false]]);
      await sheet.setProps({ material: "solid" });
      expect(sheet.find(".glass-material").exists()).toBe(false);
      sheet.unmount();
    },
  );
  it("确认默认保留取消按钮；取消不确认", async () => {
    const wrapper = mount(ConfirmDialog, {
      props: { title: "确认操作", modelValue: true },
      global: { stubs },
    });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("confirm")).toBeUndefined();
    await wrapper.findAll("button").at(-1)!.trigger("click");
    expect(wrapper.emitted("confirm")).toHaveLength(1);
    expect(wrapper.emitted("update:modelValue")).toEqual([[false], [false]]);
    wrapper.unmount();
  });
});
