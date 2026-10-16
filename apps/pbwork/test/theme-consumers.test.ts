import { expect, it } from "vitest";
import { shallowRef, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import Spinner from "@/design-system/components/display/Spinner.vue";
import SurfaceMaterial from "@/design-system/components/_shared/SurfaceMaterial.vue";
import { resolveRuntimeTheme, ThemeTableKey } from "@/design-system/theme/runtime-theme";
import { isAllowedTokenBindingValue } from "@/design-system/theme/bindings";

it("updates real component JS dimensions when the provided theme table changes", async () => {
  const table = shallowRef(resolveRuntimeTheme("pbwork-base", "default", "light"));
  const wrapper = mount(Spinner, { global: { provide: { [ThemeTableKey as symbol]: table }, stubs: { "v-progress-circular": true } } });
  const circle = () => wrapper.get("v-progress-circular-stub");
  expect(circle().attributes("size")).toBe(String(table.value.values["size.icon"]));
  table.value = { ...table.value, values: { ...table.value.values, "size.icon": 28, "size.indicator": 4 } };
  await nextTick();
  expect(circle().attributes("size")).toBe("28");
  expect(circle().attributes("width")).toBe("4");
  wrapper.unmount();
});

it("applies the component material override independently of the global material", async () => {
  const table = shallowRef(resolveRuntimeTheme("pbwork-base", "default", "light"));
  const wrapper = mount(SurfaceMaterial, { props: { treatmentKey: "primary-tabs.selection-treatment", selection: true }, global: { provide: { [ThemeTableKey as symbol]: table } } });
  expect(wrapper.classes()).toContain("is-glass");
  table.value = { ...table.value, values: { ...table.value.values, "primary-tabs.selection-treatment": "outlined" } };
  await nextTick();
  expect(wrapper.classes()).toContain("is-outlined");
  expect(wrapper.classes()).not.toContain("is-glass");
  wrapper.unmount();
});

it("keeps constants, enum controls and derived typography parts out of Evidence bindings", () => {
  for (const id of ["layout.fill", "layer.base", "density", "primary-tabs.selection-treatment", "typography.title.size"]) expect(isAllowedTokenBindingValue(id), id).toBe(false);
  expect(isAllowedTokenBindingValue("tabbar.active")).toBe(true);
  expect(isAllowedTokenBindingValue("none")).toBe(true);
});
