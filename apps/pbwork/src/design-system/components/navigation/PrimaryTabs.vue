<script setup lang="ts">
import { sizeToken } from "@/design-system/components/_shared/appearance";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { computed, ref, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { usePointerSwipe } from "@/design-system/components/_shared/usePointerSwipe";
import { useToken } from "@/design-system/theme/runtime-theme";
import SurfaceMaterial from "../_shared/SurfaceMaterial.vue";
import GlassMaterial from "../_shared/GlassMaterial.vue";
import GlassSelection from "../_shared/GlassSelection.vue";
import { useSlidingSelection } from "../_shared/useSlidingSelection";
const selectionTreatment = useToken("primary-tabs.selection-treatment");
const SLIDE_DURATION_MS = useTokenNumber("motion.duration-long");

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    items: Array<{ value: string; label: string }>;
    showIndicator?: boolean;
    showDivider?: boolean;
    grow?: boolean;
    align?: "start" | "center";
    size?: "sm" | "md" | "lg";
    swipe?: boolean;
    mouseSwipe?: boolean;
    fill?: boolean;
    /** Page-unique inspect / comment anchor; falls back to `ds.primary-tabs`. */
    inspectId?: string;
  }>(),
  {
    swipe: true,
    mouseSwipe: true,
    fill: false,
  },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const rootRef = usePbInspectRef();
const trackRef = ref<HTMLElement | null>(null);
const {
  modelValue,
  items,
  showIndicator,
  showDivider,
  grow,
  align,
  size,
  swipe: swipeEnabled,
  mouseSwipe,
  fill,
  inspectId,
} = toRefs(props);

const indicatorVisible = computed(() => showIndicator.value ?? false);

const tabStyle = computed(() => ({
  "--pb-tabs-selection-surface": "var(--pb-color-surface-selected)",
  "--pb-tabs-selection-opacity": "var(--pb-opacity-translucent)",
  "--pb-tabs-selection-elevation": "var(--pb-elevation-floating)",
  "--pb-tabs-selection-radius": "var(--pb-radius-control-compact)",
  "--pb-tabs-track-radius": "var(--pb-radius-control)",
  "--pb-tabs-active-color": "var(--pb-primary-tabs-active-color)",
  "--pb-tabs-inactive-color": "var(--pb-color-on-surface-muted)",
  "--pb-tabs-typography": "var(--pb-typography-label)",
  "--pb-tabs-radius": "var(--pb-radius-control-compact)",
  "--pb-tabs-height": `var(--pb-${sizeToken(size.value ?? "md").replaceAll(".", "-")})`,
  "--pb-tabs-pill-duration": "var(--pb-motion-duration-long)",
  "--pb-tabs-pill-easing": "var(--pb-motion-easing-standard)",
}));

const tab = computed({
  get: () => modelValue.value ?? items.value[0]?.value ?? "",
  set: (value: unknown) => {
    if (typeof value === "string") emit("update:modelValue", value);
  },
});
const tabValues = computed(() => items.value.map((item) => item.value));
const swipe = usePointerSwipe(
  tabValues,
  tab,
  (value) => emit("update:modelValue", value),
  { swipe: swipeEnabled, mouseSwipe },
);

const selection = useSlidingSelection(
  trackRef,
  tab,
  [items, grow, size, align],
  (value) => {
    tab.value = value;
  },
);
usePbInspect({
  semanticParts: [
    { suffix: "tab", role: "tab" },
    { suffix: "panel", role: "tab-panel" },
  ],
  element: rootRef,
  pbId: "ds.primary-tabs",
  instanceId: inspectId,
  componentId: "primary-tabs",
  getProps: () => ({
    modelValue: modelValue.value,
    itemCount: items.value.length,
    hasPanels: true,
    showIndicator: indicatorVisible.value,
    showDivider: showDivider.value ?? false,
    grow: grow.value ?? false,
    align: align.value ?? "start",
    size: size.value ?? "md",
    swipe: swipeEnabled.value,
    mouseSwipe: mouseSwipe.value,
    fill: fill.value,
    inspectId: inspectId.value,
  }),
  getState: () => ({ selected: tab.value }),
  getTokenBindings: () => ({
    glassTint: "color.glass-tint",
    glassClear: "color.glass-clear",
    glassEdge: "border.glass",
    glassLight: "elevation.glass",
    glassFallback: "color.surface",
    glassFallbackBorder: "border.default",

    materialOpacity: "opacity.translucent",
    materialBackdrop: "surface.glass-backdrop",
    materialBorder: "border.default",
    selectionTint: "primary-tabs.selection-tint",
    selectionSurface: "color.surface-selected",
    selectionOpacity: "opacity.translucent",
    selectionElevation: "elevation.floating",
    activeColor: "primary-tabs.active-color",
    inactiveColor: "color.on-surface-muted",
    border: showDivider.value ? "border.hairline" : "transparent",
    trackRadius: "radius.control",
    radius: "radius.control-compact",
    height: sizeToken(size.value ?? "md"),
    target: "size.touch",
    typography: "typography.label",
    panel: "typography.caption",
    trackInset: "spacing.xs",
    panelGap: "spacing.sm-plus",
    indicatorInset: "spacing.sm-plus",
    indicatorOffset: "spacing.xxs",
    indicatorThickness: "size.indicator",
    glassBackdrop: "surface.glass-backdrop",
    duration: "motion.duration-long",
    easing: "motion.easing-standard",
  }),
  getTokens: () => [
    "color.surface-recessed",
    "color.surface-selected",
    "opacity.translucent",
    "primary-tabs.active-color",
    "color.on-surface-muted",
    "border.hairline",
    "elevation.floating",
    "radius.control",
    "radius.control-compact",
    sizeToken(size.value ?? "md"),
    "size.touch",
    "typography.label",
    "typography.caption",
    "spacing.xxs",
    "spacing.xs",
    "spacing.sm",
    "spacing.sm-plus",
    "size.indicator",
    "surface.glass-backdrop",
    "motion.duration-short",
    "motion.duration-long",
    "motion.easing-standard",
  ],
});
</script>

<template>
  <div
    ref="rootRef"
    class="pb-tabs tab-bar style-pill"
    :class="{
      'has-indicator': indicatorVisible,
      'has-divider': showDivider ?? false,
      'is-fill': fill,
      'is-grow': grow ?? false,
      'align-center': align === 'center',
      'is-pill-transition-ready': selection.animated.value,
    }"
    :style="tabStyle"
    data-pb-role="tab-bar"
  >
    <div
      ref="trackRef"
      class="pb-tabs-track"
      role="tablist"
      @keydown="selection.onKeydown"
    >
      <GlassMaterial />
      <div
        class="pb-tabs-pill"
        :class="{ 'is-ready': selection.ready.value }"
        aria-hidden="true"
        :style="selection.style.value"
      >
        <GlassSelection v-if="selectionTreatment === 'glass'" />
        <SurfaceMaterial
          v-else
          active
          selection
          treatment-key="primary-tabs.selection-treatment"
        />
      </div>
      <button
        v-for="item in items"
        :id="`${inspectId ?? 'ds.primary-tabs'}-tab-${item.value}`"
        :key="item.value"
        type="button"
        class="pb-tab"
        role="tab"
        :aria-selected="tab === item.value"
        :tabindex="tab === item.value ? 0 : -1"
        :data-pb-id="`${inspectId ?? 'ds.primary-tabs'}.tab`"
        :data-pb-key="item.value"
        :data-selection-key="item.value"
        data-pb-role="tab"
        @click="tab = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <v-window
      v-model="tab"
      class="pb-tab-window"
      :class="{
        'allows-mouse-swipe': mouseSwipe,
        'is-dragging': swipe.dragging.value,
      }"
      direction="horizontal"
      :transition-duration="SLIDE_DURATION_MS"
      :touch="false"
      @pointerdown="swipe.onPointerDown"
      @pointermove="swipe.onPointerMove"
      @pointerup="swipe.onPointerUp"
      @pointercancel="swipe.onPointerCancel"
      @touchstart="swipe.onTouchStart"
      @touchmove="swipe.onTouchMove"
      @touchend="swipe.onTouchEnd"
      @touchcancel="swipe.onTouchCancel"
      @click.capture="swipe.onClickCapture"
    >
      <v-window-item
        v-for="item in items"
        :key="item.value"
        :value="item.value"
      >
        <div
          class="pb-tab-panel"
          :data-pb-id="`${inspectId ?? 'ds.primary-tabs'}.panel`"
          :data-pb-key="item.value"
          data-pb-role="tab-panel"
          role="tabpanel"
          :aria-labelledby="`${inspectId ?? 'ds.primary-tabs'}-tab-${item.value}`"
        >
          <slot :name="item.value">
            <p class="pb-tab-panel-empty">{{ item.label }}</p>
          </slot>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>

<style scoped>
.pb-tabs {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  width: var(--pb-layout-fill);
  min-width: var(--pb-layout-zero);
  background: transparent;
}
.pb-tabs-track {
  position: relative;
  display: flex;
  width: var(--pb-layout-fill);
  max-width: var(--pb-layout-fill);
  align-items: stretch;
  gap: var(--pb-layout-zero);
  min-height: var(--pb-tabs-height, var(--pb-size-control));
  padding: var(--pb-spacing-xs);
  overflow: auto;
  border-radius: var(--pb-tabs-track-radius, var(--pb-radius-surface));
  background: transparent;
  --pb-glass-selection-tint: var(--pb-primary-tabs-selection-tint);
  --pb-glass-selection-shadow: var(--pb-elevation-floating);
  scrollbar-width: none;
}
.pb-tabs-track::-webkit-scrollbar {
  display: none;
}
.pb-tabs.align-center .pb-tabs-track {
  justify-content: center;
}
.pb-tabs.has-divider .pb-tabs-track {
  border-bottom: var(--pb-border-hairline);
}
.pb-tabs-pill {
  position: absolute;
  top: var(--pb-spacing-xs);
  bottom: var(--pb-spacing-xs);
  left: var(--pb-layout-zero);
  z-index: var(--pb-layer-content);
  border-radius: var(--pb-tabs-selection-radius);
  overflow: visible;
  transition: none;
  pointer-events: none;
  width: var(--pb-selection-width);
  opacity: var(--pb-opacity-hidden);
  transform: translateX(var(--pb-selection-left));
}
.pb-tabs-pill.is-ready {
  opacity: var(--pb-opacity-visible);
}
.pb-tabs.is-pill-transition-ready .pb-tabs-pill {
  transition:
    transform var(--pb-tabs-pill-duration) var(--pb-tabs-pill-easing),
    width var(--pb-tabs-pill-duration) var(--pb-tabs-pill-easing),
    opacity var(--pb-motion-duration-short) var(--pb-motion-easing-standard);
}
.pb-tab {
  position: relative;
  z-index: var(--pb-layer-content);
  transform: translateZ(var(--pb-layout-zero));
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  min-height: calc(
    var(--pb-tabs-height, var(--pb-size-control)) - var(--pb-spacing-xs) -
      var(--pb-spacing-xs)
  );
  padding: var(--pb-layout-zero) var(--pb-spacing-md);
  border: none;
  border-radius: var(--pb-tabs-radius, var(--pb-radius-pill));
  background: transparent;
  color: var(--pb-tabs-inactive-color, var(--pb-color-on-surface-muted));
  font: var(--pb-tabs-typography, var(--pb-typography-label));
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--pb-motion-duration-short)
    var(--pb-motion-easing-standard);
}
.pb-tabs.is-grow .pb-tab {
  flex: var(--pb-layout-flex-fill);
}
.pb-tab[aria-selected="true"] {
  color: var(--pb-tabs-active-color, var(--pb-color-primary));
}
.pb-tabs.has-indicator .pb-tab[aria-selected="true"]::after {
  content: "";
  position: absolute;
  right: var(--pb-spacing-sm-plus);
  bottom: var(--pb-spacing-xxs);
  left: var(--pb-spacing-sm-plus);
  height: var(--pb-size-indicator);
  border-radius: var(--pb-radius-pill) var(--pb-radius-pill)
    var(--pb-layout-zero) var(--pb-layout-zero);
  background: var(--pb-tabs-active-color, var(--pb-color-primary));
}
.pb-tab-window {
  min-width: var(--pb-layout-zero);
  touch-action: pan-y;
  --v-window-transition-duration: var(--pb-motion-duration-long);
}
.pb-tab-window.allows-mouse-swipe {
  cursor: grab;
}
.pb-tab-window.is-dragging {
  cursor: grabbing;
  user-select: none;
}
.pb-tabs.is-fill {
  height: var(--pb-layout-fill);
  min-height: var(--pb-layout-zero);
}
.pb-tabs.is-fill .pb-tab-window,
.pb-tabs.is-fill .pb-tab-window :deep(.v-window__container),
.pb-tabs.is-fill .pb-tab-window :deep(.v-window-item),
.pb-tabs.is-fill .pb-tab-panel {
  height: var(--pb-layout-fill);
  min-height: var(--pb-layout-zero);
}
.pb-tabs.is-fill .pb-tab-window {
  flex: var(--pb-layout-flex-fill);
}
.pb-tabs.is-fill .pb-tab-panel {
  align-content: start;
}
.pb-tab-window :deep(.v-window__container),
.pb-tab-window :deep(.v-window-x-transition-enter-active),
.pb-tab-window :deep(.v-window-x-transition-leave-active),
.pb-tab-window :deep(.v-window-x-reverse-transition-enter-active),
.pb-tab-window :deep(.v-window-x-reverse-transition-leave-active) {
  transition-duration: var(--pb-motion-duration-long);
  transition-timing-function: var(--pb-motion-easing-standard);
}
.pb-tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  min-width: var(--pb-layout-zero);
}
.pb-tab-panel-empty {
  margin: var(--pb-layout-zero);
  padding: var(--pb-spacing-sm) var(--pb-layout-zero);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
@media (prefers-reduced-motion: reduce) {
  .pb-tabs.is-pill-transition-ready .pb-tabs-pill {
    transition: none;
  }
  .pb-tab-window :deep(.v-window__container),
  .pb-tab-window :deep(.v-window-x-transition-enter-active),
  .pb-tab-window :deep(.v-window-x-transition-leave-active),
  .pb-tab-window :deep(.v-window-x-reverse-transition-enter-active),
  .pb-tab-window :deep(.v-window-x-reverse-transition-leave-active) {
    transition-duration: var(--pb-motion-duration-instant);
  }
}
</style>
