<script setup lang="ts">
import GlassMaterial from "../_shared/GlassMaterial.vue";
import SurfaceMaterial from "@/design-system/components/_shared/SurfaceMaterial.vue";
import { useToken } from "@/design-system/theme/runtime-theme";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import GlassSelection from "../_shared/GlassSelection.vue";
import { useSlidingSelection } from "../_shared/useSlidingSelection";
import { computed, ref, toRefs, type Component } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const TAB_ICON_SIZE = useTokenNumber("size.icon");

export type TabbarItem = {
  value: string;
  label: string;
  /** Caller-supplied icon component (e.g. Lucide). Not resolved inside this component. */
  icon: Component;
};

const surfaceTreatment = useToken("tabbar.surface-treatment");
const props = defineProps<{
  /** Required. Count, labels, and icons are owned by the caller — no built-in destinations. */
  items: TabbarItem[];
  modelValue?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.tabbar`. */
  inspectId?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [string] }>();
const rootRef = usePbInspectRef();
const { modelValue, items, inspectId } = toRefs(props);

const normalizedItems = computed(() => items.value ?? []);

const activeItem = computed({
  get: () => modelValue.value ?? normalizedItems.value[0]?.value ?? "",
  set: (value: string) => emit("update:modelValue", value),
});

const trackRef = ref<HTMLElement | null>(null);
const selection = useSlidingSelection(
  trackRef,
  activeItem,
  [items],
  (value) => {
    activeItem.value = value;
  },
);

usePbInspect({
  element: rootRef,
  pbId: "ds.tabbar",
  instanceId: inspectId,
  componentId: "tabbar",
  getProps: () => ({
    modelValue: activeItem.value,
    items: normalizedItems.value.map(({ value, label }) => ({ value, label })),
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
    "radius.surface",
    "radius.control",
    "border.focus",
    "typography.caption-strong",
    "size.icon",
  ],
  getTokenBindings: () => ({
    selectionTint: "tabbar.selection-tint",
    radius: "radius.surface",
    selectionRadius: "radius.control",
    inset: "spacing.xs",
    outerInset: "spacing.md",
    duration: "motion.duration-long",
    easing: "motion.easing-standard",
    glassTint: "color.glass-tint",
    glassClear: "color.glass-clear",
    glassEdge: "border.glass",
    glassLight: "elevation.glass",
    glassFallback: "color.surface",
    glassFallbackBorder: "border.default",

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
      <GlassMaterial v-if="surfaceTreatment === 'glass'" />
      <SurfaceMaterial v-else treatment-key="tabbar.surface-treatment" />
      <div
        ref="trackRef"
        class="pb-tabbar-tabs"
        :class="{ 'is-animated': selection.animated.value }"
        role="tablist"
        aria-label="应用主导航"
        @keydown="selection.onKeydown"
      >
        <div
          class="pb-tabbar-selection"
          :class="{ 'is-ready': selection.ready.value }"
          :style="selection.style.value"
        >
          <GlassSelection />
        </div>
        <button
          v-for="item in normalizedItems"
          :key="item.value"
          type="button"
          class="pb-tabbar-item"
          role="tab"
          :aria-selected="activeItem === item.value"
          :tabindex="activeItem === item.value ? 0 : -1"
          :data-selection-key="item.value"
          @click="activeItem = item.value"
        >
          <component
            :is="item.icon"
            v-if="item.icon"
            :size="TAB_ICON_SIZE"
            aria-hidden="true"
          />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </nav>
  </section>
</template>

<style scoped>
.pb-tabbar-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: none;
  box-sizing: border-box;
  width: var(--pb-layout-fill);
  min-width: var(--pb-layout-zero);
  padding: var(--pb-spacing-sm) var(--pb-spacing-md);
  padding-bottom: max(
    var(--pb-spacing-sm),
    var(--pb-safe-bottom, var(--pb-layout-zero)),
    env(safe-area-inset-bottom, var(--pb-layout-zero))
  );
  background: transparent;
  z-index: var(--pb-layer-content);
}
.pb-tabbar {
  position: relative;
  isolation: isolate;
  border-radius: var(--pb-radius-surface);
}
.pb-tabbar-tabs {
  position: relative;
  z-index: var(--pb-layer-content);
  transform: translateZ(var(--pb-layout-zero));
  display: flex;
  padding: var(--pb-spacing-xs);
  overflow-x: auto;
  scrollbar-width: none;
  border-radius: inherit;
  --pb-glass-selection-tint: var(--pb-tabbar-selection-tint);
}
.pb-tabbar-selection {
  position: absolute;
  top: var(--pb-spacing-xs);
  bottom: var(--pb-spacing-xs);
  left: var(--pb-layout-zero);
  width: var(--pb-selection-width);
  transform: translateX(var(--pb-selection-left));
  border-radius: var(--pb-radius-control);
  pointer-events: none;
  opacity: var(--pb-opacity-hidden);
}
.pb-tabbar-selection.is-ready {
  opacity: var(--pb-opacity-visible);
}
.is-animated .pb-tabbar-selection {
  transition:
    transform var(--pb-motion-duration-long) var(--pb-motion-easing-standard),
    width var(--pb-motion-duration-long) var(--pb-motion-easing-standard);
}
.pb-tabbar-item {
  position: relative;
  z-index: var(--pb-layer-content);
  transform: translateZ(var(--pb-layout-zero));
  display: flex;
  flex-direction: column;
  flex: var(--pb-layout-flex-fill);
  align-items: center;
  justify-content: center;
  gap: var(--pb-spacing-xs);
  min-width: var(--pb-size-touch);
  min-height: var(--pb-size-navigation-bar);
  padding: var(--pb-spacing-xs) var(--pb-spacing-md);
  border: none;
  border-radius: var(--pb-radius-control);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--pb-motion-duration-short)
    var(--pb-motion-easing-standard);
}
.pb-tabbar-item[aria-selected="true"] {
  color: var(--pb-tabbar-active);
  font: var(--pb-typography-caption-strong);
}
.pb-tabbar-item:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
}
@media (prefers-reduced-motion: reduce) {
  .is-animated .pb-tabbar-selection,
  .pb-tabbar-item {
    transition: none;
  }
}
</style>
