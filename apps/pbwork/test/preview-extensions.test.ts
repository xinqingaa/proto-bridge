import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { defineComponent } from "vue";
import { createPreviewDevice } from "@/workbench/preview/model";
import { resolveRuntimeTheme } from "@/design-system/theme/runtime-theme";
import {
  validatePreviewExtensions,
  extensionNavigation,
  extensionsForComponent,
  extensionApplicable,
  type PreviewExtension,
} from "@/workbench/preview/extensions/model";
const fixtures = vi.hoisted(() => ({
  modules: new Map<string, () => Promise<unknown>>(),
}));
vi.mock("@/workbench/preview/extensions/registry", () => ({
  extensionPreviewModules: fixtures.modules,
}));
import ExtensionSample from "@/workbench/preview/extensions/ExtensionSample.vue";
const env = {
  owners: [
    { id: "one", label: "原型一" },
    { id: "two", label: "原型二" },
  ],
  baseIds: ["button"],
  tokenIds: ["color.primary"],
  modulePaths: [
    "one/components/Button.vue",
    "one/previews/Button.vue",
    "two/components/Chart.vue",
    "two/previews/Chart.vue",
  ],
};
const variant: PreviewExtension = {
  id: "one.button-rounded",
  label: "圆形按钮",
  ownerPrototypeId: "one",
  kind: "variant",
  baseComponentId: "button",
  description: "获批风格变体",
  implementation: env.modulePaths[0]!,
  preview: env.modulePaths[1]!,
  states: [{ id: "default", label: "默认" }],
  tokenIds: ["color.primary"],
};
const own: PreviewExtension = {
  id: "two.chart",
  label: "趋势卡",
  ownerPrototypeId: "two",
  kind: "component",
  description: "原型自有组件",
  implementation: env.modulePaths[2]!,
  preview: env.modulePaths[3]!,
  states: [{ id: "empty", label: "空态" }],
  tokenIds: ["color.primary"],
};
describe("explicit prototype presentation registration", () => {
  it("keeps variants on their base component and only lists real own resources, without inventing production owners", () => {
    expect(validatePreviewExtensions([variant, own], env)).toEqual([]);
    expect(extensionsForComponent([variant, own], "button")).toEqual([variant]);
    expect(extensionNavigation([variant, own], env.owners)).toEqual([
      {
        id: "two.chart",
        label: "趋势卡",
        group: "原型二 · 自有组件",
        to: "/workbench/components/two.chart",
      },
    ]);
    expect(extensionNavigation([], env.owners)).toEqual([]);
    expect(extensionApplicable(own, "yike", "pbwork-base")).toBe(false);
    expect(extensionApplicable(own, "pbwork-base")).toBe(false);
    expect(extensionApplicable(own, "pbwork-base", "pbwork-base")).toBe(true);
    expect(extensionApplicable(variant, "yike", "pbwork-base")).toBe(true);
  });
  it.each([
    [{ ...variant, id: "button" }, "INVALID_OR_DUPLICATE_ID"],
    [{ ...variant, ownerPrototypeId: "missing" }, "UNKNOWN_OWNER"],
    [{ ...variant, baseComponentId: "missing" }, "UNKNOWN_BASE"],
    [{ ...own, baseComponentId: "button" }, "OWN_COMPONENT_HAS_BASE"],
    [
      { ...variant, preview: "two/previews/Chart.vue" },
      "MISSING_OR_FOREIGN_PREVIEW",
    ],
    [
      { ...variant, implementation: "one/../two/components/Chart.vue" },
      "MISSING_OR_FOREIGN_IMPLEMENTATION",
    ],
    [{ ...variant, states: [] }, "INVALID_REPRESENTATIVE_STATES"],
    [{ ...variant, tokenIds: ["unknown.key"] }, "UNKNOWN_OR_DUPLICATE_TOKEN"],
  ] as Array<[PreviewExtension, string]>)(
    "blocks invalid registration %#",
    (entry, reason) => {
      expect(validatePreviewExtensions([entry], env).join("\n")).toContain(
        reason,
      );
    },
  );
  it("rejects duplicate extension identity", () => {
    expect(
      validatePreviewExtensions([variant, variant], env).join("\n"),
    ).toContain("INVALID_OR_DUPLICATE_ID");
  });
  it("renders the explicitly associated preview inside the existing device context and diagnoses a missing counterpart", async () => {
    fixtures.modules.set(own.preview, async () => ({
      default: defineComponent({
        props: ["device", "attach", "states"],
        template:
          '<div :data-device="device.id" :data-host="attach">{{ states[0].label }}</div>',
      }),
    }));
    const device = createPreviewDevice("B", {
      contextId: "prototype:two",
      theme: "default",
      mode: "light",
    });
    const wrapper = mount(ExtensionSample, {
      props: {
        extension: own,
        ownerThemePackId: "pbwork-base",
        device,
        attach: "#device-B",
        table: resolveRuntimeTheme("pbwork-base", "default", "light"),
      },
    });
    await flushPromises();
    expect(wrapper.find('[data-device="B"]').attributes("data-host")).toBe(
      "#device-B",
    );
    expect(wrapper.text()).toContain("空态");
    await wrapper.setProps({
      table: resolveRuntimeTheme("yike", "mechanical", "light"),
      device: createPreviewDevice("A", {
        contextId: "foundation:pbwork-base",
        theme: "default",
        mode: "light",
      }),
    });
    expect(wrapper.find("[data-device]").exists()).toBe(false);
    expect(wrapper.text()).toContain("不适用");
    wrapper.unmount();
  });
  it("deep copies nested device session data when adding comparison", () => {
    const first = createPreviewDevice("A", {
      contextId: "prototype:one",
      theme: "default",
      mode: "light",
    });
    first.demo.session = { overrides: { groups: [{ modelValue: true }] } };
    const second = createPreviewDevice("B", first.selection, first.demo);
    (
      second.demo.session!.overrides as { groups: { modelValue: boolean }[] }
    ).groups[0]!.modelValue = false;
    expect(
      (first.demo.session.overrides as { groups: { modelValue: boolean }[] })
        .groups[0]!.modelValue,
    ).toBe(true);
  });
});
