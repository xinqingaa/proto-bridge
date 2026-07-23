<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { usePointerSwipe } from "@/design-system/components/_shared/usePointerSwipe";

/** Matches `motion.duration-slow` (320ms) for v-window's numeric prop. */
const SLIDE_DURATION_MS = 320;

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    items: Array<{ value: string; label: string }>;
    selectionStyle?: "pill" | "underline" | "text";
    showIndicator?: boolean;
    showDivider?: boolean;
    grow?: boolean;
    align?: "start" | "center";
    size?: "sm" | "md" | "lg";
    swipe?: boolean;
    mouseSwipe?: boolean;
    fill?: boolean;
    /** Page-unique inspect / comment anchor; falls back to `ds.tabs`. */
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
const {
  modelValue,
  items,
  selectionStyle,
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

const resolvedSelectionStyle = computed(() => selectionStyle.value ?? "pill");
const indicatorVisible = computed(
  () => showIndicator.value ?? resolvedSelectionStyle.value === "underline",
);

const tabStyle = computed(() => ({
  "--pb-tabs-active-background":
    resolvedSelectionStyle.value === "pill"
      ? "var(--pb-color-primary-soft)"
      : "transparent",
  "--pb-tabs-active-color": "var(--pb-color-primary)",
  "--pb-tabs-inactive-color": "var(--pb-color-on-surface-muted)",
  "--pb-tabs-typography": "var(--pb-typography-label)",
  "--pb-tabs-radius":
    resolvedSelectionStyle.value === "pill"
      ? "var(--pb-radius-full)"
      : "var(--pb-radius-md)",
  "--pb-tabs-height": `var(--pb-sizing-control-${size.value ?? "md"})`,
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

usePbInspect({
  element: rootRef,
  pbId: "ds.tabs",
  instanceId: inspectId,
  componentId: "tabs",
  getProps: () => ({
    modelValue: modelValue.value,
    itemCount: items.value.length,
    hasPanels: true,
    selectionStyle: resolvedSelectionStyle.value,
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
  getTokenBindings: () => ({
    indicator: "color.primary",
    activeBackground:
      resolvedSelectionStyle.value === "pill"
        ? "color.primary-soft"
        : "transparent",
    activeColor: "color.primary",
    inactiveColor: "color.on-surface-muted",
    border: showDivider.value ? "border.hairline" : "transparent",
    radius:
      resolvedSelectionStyle.value === "pill" ? "radius.full" : "radius.md",
    height: `sizing.control-${size.value ?? "md"}`,
    target: "sizing.touch",
    typography: "typography.label",
    panel: "typography.caption",
    duration: "motion.duration-slow",
    easing: "motion.easing-standard",
  }),
  getTokens: () => [
    "color.primary",
    "color.primary-soft",
    "color.on-surface-muted",
    "border.hairline",
    "radius.full",
    "radius.md",
    `sizing.control-${size.value ?? "md"}`,
    "sizing.touch",
    "typography.label",
    "typography.caption",
    "motion.duration-slow",
    "motion.easing-standard",
  ],
});
</script>

<template>
  <div
    ref="rootRef"
    data-pb-id="ds.tabs"
    data-pb-role="tab-bar"
    class="pb-tabs tab-bar"
    :class="{
      'has-indicator': indicatorVisible,
      'has-divider': showDivider ?? false,
      'style-pill': resolvedSelectionStyle === 'pill',
      'style-underline': resolvedSelectionStyle === 'underline',
      'style-text': resolvedSelectionStyle === 'text',
      'is-fill': fill,
    }"
    :style="tabStyle"
  >
    <v-tabs
      v-model="tab"
      class="pb-tab-bar"
      color="primary"
      :align-tabs="align ?? 'start'"
      :grow="grow ?? false"
    >
      <v-tab
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        class="pb-tab"
      >
        {{ item.label }}
      </v-tab>
    </v-tabs>

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
        <div class="pb-tab-panel" data-pb-role="tab-panel">
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
  display: grid;
  gap: var(--pb-spacing-sm-plus, 12px);
  min-width: 0;
  background: transparent;
}
.pb-tab-bar {
  --v-tabs-height: var(--pb-tabs-height, var(--pb-sizing-control-md, 40px));
  height: var(--v-tabs-height);
  background: transparent;
  overflow: visible;
}
.pb-tabs.has-divider .pb-tab-bar {
  border-bottom: var(--pb-border-hairline);
}
.pb-tab-bar :deep(.v-slide-group__container),
.pb-tab-bar :deep(.v-slide-group__content) {
  overflow: visible;
}
.pb-tab-bar :deep(.v-tab) {
  height: var(--v-tabs-height);
  min-height: var(--v-tabs-height);
  padding: 0 var(--pb-spacing-md, 16px);
  border-radius: var(--pb-tabs-radius, var(--pb-radius-full));
  color: var(--pb-tabs-inactive-color, var(--pb-color-on-surface-muted));
  font: var(--pb-tabs-typography, var(--pb-typography-label));
  letter-spacing: normal;
  text-transform: none;
}
.pb-tabs.style-pill .pb-tab-bar :deep(.v-tab--selected) {
  background: var(--pb-tabs-active-background, transparent);
  color: var(--pb-tabs-active-color, var(--pb-color-primary));
  font-weight: 600;
}
.pb-tabs.style-pill .pb-tab-bar :deep(.v-tab--selected .v-btn__overlay),
.pb-tabs.style-pill .pb-tab-bar :deep(.v-tab--selected .v-btn__underlay) {
  border-radius: inherit;
}
.pb-tabs.style-underline .pb-tab-bar :deep(.v-tab--selected),
.pb-tabs.style-text .pb-tab-bar :deep(.v-tab--selected) {
  color: var(--pb-tabs-active-color, var(--pb-color-primary));
  font-weight: 600;
}
.pb-tab-bar :deep(.v-tabs-slider),
.pb-tab-bar :deep(.v-tab__slider) {
  display: none;
}
.pb-tabs.has-indicator .pb-tab-bar :deep(.v-tabs-slider),
.pb-tabs.has-indicator .pb-tab-bar :deep(.v-tab__slider) {
  display: block;
  height: 3px;
  border-radius: var(--pb-radius-full) var(--pb-radius-full) 0 0;
  background: var(--pb-tabs-active-color, var(--pb-color-primary));
}
.pb-tab-window {
  min-width: 0;
  touch-action: pan-y;
  --v-window-transition-duration: var(--pb-motion-duration-slow, 320ms);
}
.pb-tab-window.allows-mouse-swipe {
  cursor: grab;
}
.pb-tab-window.is-dragging {
  cursor: grabbing;
  user-select: none;
}
.pb-tabs.is-fill {
  height: 100%;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
}
.pb-tabs.is-fill .pb-tab-window,
.pb-tabs.is-fill .pb-tab-window :deep(.v-window__container),
.pb-tabs.is-fill .pb-tab-window :deep(.v-window-item),
.pb-tabs.is-fill .pb-tab-panel {
  height: 100%;
  min-height: 0;
}
.pb-tabs.is-fill .pb-tab-panel {
  align-content: start;
}
.pb-tab-window :deep(.v-window__container),
.pb-tab-window :deep(.v-window-x-transition-enter-active),
.pb-tab-window :deep(.v-window-x-transition-leave-active),
.pb-tab-window :deep(.v-window-x-reverse-transition-enter-active),
.pb-tab-window :deep(.v-window-x-reverse-transition-leave-active) {
  transition-duration: var(--pb-motion-duration-slow, 320ms);
  transition-timing-function: var(
    --pb-motion-easing-standard,
    cubic-bezier(0.2, 0, 0, 1)
  );
}
.pb-tab-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.pb-tab-panel-empty {
  margin: 0;
  padding: 8px 0;
  color: var(--pb-color-on-surface-muted, #1f29379e);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
@media (prefers-reduced-motion: reduce) {
  .pb-tab-window :deep(.v-window__container),
  .pb-tab-window :deep(.v-window-x-transition-enter-active),
  .pb-tab-window :deep(.v-window-x-transition-leave-active),
  .pb-tab-window :deep(.v-window-x-reverse-transition-enter-active),
  .pb-tab-window :deep(.v-window-x-reverse-transition-leave-active) {
    transition-duration: 0s;
  }
}
</style>
