<script setup lang="ts">
import SurfaceMaterial from "@/design-system/components/_shared/SurfaceMaterial.vue";
import { useToken } from "@/design-system/theme/runtime-theme";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { computed, toRefs, type Component } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const TAB_ICON_SIZE = useTokenNumber("size.icon");

export type TabbarItem = {
  value: string;
  label: string;
  /** Caller-supplied icon component (e.g. Lucide). Not resolved inside this component. */
  icon: Component;
};

const surfaceTreatment = useToken("tabbar.surface-treatment");
const props = withDefaults(
  defineProps<{
    /** Required. Count, labels, and icons are owned by the caller — no built-in destinations. */
    items: TabbarItem[];
    modelValue?: string;
    /** Equal-width destinations when true; content-width destinations when false. */
    grow?: boolean;
    /** Page-unique inspect / comment anchor; falls back to `ds.tabbar`. */
    inspectId?: string;
  }>(),
  { grow: true },
);
const emit = defineEmits<{ "update:modelValue": [string] }>();
const rootRef = usePbInspectRef();
const { modelValue, items, grow, inspectId } = toRefs(props);

const normalizedItems = computed(() => items.value ?? []);

const activeItem = computed({
  get: () => modelValue.value ?? normalizedItems.value[0]?.value ?? "",
  set: (value: string) => emit("update:modelValue", value),
});

usePbInspect({
  element: rootRef,
  pbId: "ds.tabbar",
  instanceId: inspectId,
  componentId: "tabbar",
  getProps: () => ({
    modelValue: activeItem.value,
    items: normalizedItems.value.map(({ value, label }) => ({ value, label })),
    grow: grow.value,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.surface-raised",
    "tabbar.active",
    "color.on-surface-muted",
    "border.hairline",
    "size.touch",
    "size.navigation-bar",
    "typography.caption",
    "typography.subtitle",
    "radius.pill",
    "border.focus",
    "typography.caption-strong",
    "size.icon",
  ],
  getTokenBindings: () => ({
    materialOpacity: "opacity.translucent",
    materialBackdrop: "surface.glass-backdrop",
    materialBorder: "border.default",
    surface: "color.surface-raised",
    active: "tabbar.active",
    inactive: "color.on-surface-muted",
    border: "border.hairline",
    target: "size.touch",
    height: "size.navigation-bar",
    label: "typography.caption",
    selectedLabel: "typography.caption-strong",
    focusOutline: "border.focus",
    iconSize: "size.icon",
  }),
});
</script>

<template>
  <section
    ref="rootRef"
    class="pb-tabbar-shell bottom-bar tabbar tab-bar"
    data-pb-id="ds.tabbar"
    data-pb-role="bottom-bar"
  >
    <nav
      class="pb-tabbar"
      :class="{ 'is-material': surfaceTreatment !== 'solid' }"
      aria-label="应用主导航"
    >
      <SurfaceMaterial
        v-if="surfaceTreatment !== 'solid'"
        treatment-key="tabbar.surface-treatment"
      />
      <v-tabs
        class="pb-tabbar-tabs"
        color="primary"
        :grow="grow"
        mandatory
        v-model="activeItem"
      >
        <v-tab
          v-for="item in normalizedItems"
          :key="item.value"
          class="pb-tabbar-item"
          :value="item.value"
          :aria-label="item.label"
          :ripple="false"
          stacked
        >
          <component
            :is="item.icon"
            v-if="item.icon"
            :size="TAB_ICON_SIZE"
            aria-hidden="true"
          />
          <span>{{ item.label }}</span>
        </v-tab>
      </v-tabs>
    </nav>
  </section>
</template>

<style scoped>
.pb-tabbar-shell {
  position: relative !important;
  display: flex;
  flex-direction: column;
  flex: none;
  width: var(--pb-layout-fill);
  background: var(--pb-color-background);
  z-index: var(--pb-layer-content);
}
.pb-tabbar {
  --pb-bottom-nav-safe: max(
    var(--pb-safe-bottom, var(--pb-layout-zero)),
    env(safe-area-inset-bottom, var(--pb-layout-zero))
  );
  border-top: var(--pb-border-hairline);
  background: var(--pb-color-surface-raised);
  padding-bottom: var(--pb-bottom-nav-safe);
}
.pb-tabbar.is-material {
  position: relative;
  background: transparent;
}
.pb-tabbar.is-material .pb-tabbar-tabs {
  position: relative;
  z-index: var(--pb-layer-content);
}
.pb-tabbar-tabs {
  --v-tabs-height: var(--pb-size-navigation-bar);
  height: var(--v-tabs-height);
}
.pb-tabbar :deep(.v-slide-group__content) {
  height: var(--pb-layout-fill);
}
.pb-tabbar-item {
  box-sizing: border-box;
  min-width: var(--pb-size-touch);
  height: var(--v-tabs-height);
  min-height: var(--v-tabs-height);
  padding-bottom: var(--pb-layout-zero);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  text-transform: none;
  letter-spacing: normal;
}
.pb-tabbar-item :deep(.v-btn__content) {
  gap: var(--pb-spacing-xs);
}
.pb-tabbar-item :deep(.v-btn__overlay) {
  opacity: var(--pb-opacity-hidden) !important;
}
.pb-tabbar-item:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
}
.pb-tabbar :deep(.v-tab--selected) {
  color: var(--pb-tabbar-active);
  font: var(--pb-typography-caption-strong);
}
.pb-tabbar :deep(.v-tab__slider) {
  display: none !important;
}
</style>
