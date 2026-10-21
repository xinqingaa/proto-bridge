import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { shallowRef } from "vue";
import { createVuetify } from "vuetify";
import { VBtn, VProgressCircular } from "vuetify/components";
import Button from "@/design-system/components/action/Button.vue";
import YikeAction from "@/prototypes/yike/components/YikeAction.vue";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import { resolveButtonColorsFromKind } from "@/design-system/components/_shared/colorTokens";
const global = {
  stubs: { VProgressCircular: true },
  plugins: [createVuetify({ components: { VBtn, VProgressCircular } })],
  provide: {
    [ThemeTableKey as symbol]: shallowRef(
      resolveRuntimeTheme("yike", "mechanical", "light"),
    ),
  },
};
describe("公共按钮操作层级", () => {
  it.each([
    ["pbwork-base", "default", "light"],
    ["pbwork-base", "default", "dark"],
    ["yike", "mechanical", "light"],
    ["yike", "mechanical", "dark"],
  ])(
    "%s/%s/%s更新标签后保持当前操作名称及禁用语义",
    async (pack, theme, mode) => {
      const wrapper = mount(Button, {
        global: {
          ...global,
          provide: {
            [ThemeTableKey as symbol]: shallowRef(
              resolveRuntimeTheme(pack!, theme!, mode as "light" | "dark"),
            ),
          },
        },
        props: { label: "开始", kind: "accent" },
      });
      await wrapper.setProps({ label: "暂停" });
      expect(wrapper.get("button").attributes("aria-label")).toBe("暂停");
      await wrapper.setProps({ label: "完成", disabled: true });
      expect(wrapper.get("button").attributes("aria-label")).toBe("完成");
      await wrapper.get("button").trigger("click");
      expect(wrapper.emitted("click")).toBeUndefined();
      wrapper.unmount();
    },
  );
  it("保留中性默认，品牌/危险/轻量使用固定语义配对", () => {
    expect(resolveButtonColorsFromKind().bgColor).toBe("color.action");
    expect(resolveButtonColorsFromKind("accent")).toEqual({
      bgColor: "color.primary",
      borderColor: "color.primary",
      textColor: "color.on-primary",
    });
    expect(resolveButtonColorsFromKind("danger").textColor).toBe("color.error");
    expect(resolveButtonColorsFromKind("quiet").bgColor).toBe("transparent");
  });
  it("真实Button保留提交语义，等待保留文案并阻止重复触发，禁用可恢复", async () => {
    const wrapper = mount(Button, {
      global,
      props: {
        label: "保存习惯",
        kind: "accent",
        type: "submit",
        material: "glass",
      },
    });
    expect(wrapper.get("button").attributes("type")).toBe("submit");
    expect(wrapper.find(".glass-material").exists()).toBe(true);
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
    await wrapper.setProps({ loading: true });
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
    expect(wrapper.get("button").attributes("aria-busy")).toBe("true");
    expect(wrapper.text()).toContain("保存习惯");
    expect(wrapper.find(".pb-button__loader").exists()).toBe(true);
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
    await wrapper.setProps({ loading: false, disabled: true });
    expect(wrapper.find(".pb-button__loader").exists()).toBe(false);
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
    await wrapper.setProps({ disabled: false });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(2);
    wrapper.unmount();
  });
  it("yike局部操作只组合DS，没有另一套按钮机制", async () => {
    const wrapper = mount(YikeAction, {
      global,
      props: { label: "开始", inspectId: "focus.start" },
    });
    expect(wrapper.findAllComponents(Button)).toHaveLength(1);
    expect(wrapper.findComponent(Button).props("kind")).toBe("accent");
    expect(wrapper.findComponent(Button).props("shape")).toBe("pill");
    await wrapper.setProps({ kind: "danger" });
    expect(wrapper.findComponent(Button).props("kind")).toBe("danger");
    expect(wrapper.findComponent(Button).props("material")).toBe("glass");
    wrapper.unmount();
  });
});
