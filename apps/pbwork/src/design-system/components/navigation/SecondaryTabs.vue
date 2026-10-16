<script setup lang="ts">
import { sizeToken } from "@/design-system/components/_shared/appearance";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { usePointerSwipe } from "@/design-system/components/_shared/usePointerSwipe";
const SLIDE_DURATION_MS = useTokenNumber("motion.duration-long");

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    items: Array<{ value: string; label: string }>;
    showDivider?: boolean;
    grow?: boolean;
    align?: "start" | "center";
    size?: "sm" | "md" | "lg";
    swipe?: boolean;
    mouseSwipe?: boolean;
    fill?: boolean;
    /** Page-unique inspect / comment anchor; falls back to `ds.secondary-tabs`. */
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
  showDivider,
  grow,
  align,
  size,
  swipe: swipeEnabled,
  mouseSwipe,
  fill,
  inspectId,
} = toRefs(props);

const tabStyle = computed(() => ({
  "--pb-tabs-active-background": "transparent",
  "--pb-tabs-active-color": "var(--pb-secondary-tabs-active-color)",
  "--pb-tabs-inactive-color": "var(--pb-color-on-surface-muted)",
  "--pb-tabs-typography": "var(--pb-typography-label)",
  "--pb-tabs-radius": "var(--pb-radius-control)",
  "--pb-tabs-height": `var(--pb-${sizeToken(size.value ?? "md").replaceAll(".", "-")})`,
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
  pbId: "ds.secondary-tabs",
  instanceId: inspectId,
  componentId: "secondary-tabs",
  getProps: () => ({
    modelValue: modelValue.value,
    itemCount: items.value.length,
    hasPanels: true,
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
    indicator: "secondary-tabs.active-color",
    activeBackground: "transparent",
    activeColor: "secondary-tabs.active-color",
    inactiveColor: "color.on-surface-muted",
    border: showDivider.value ? "border.hairline" : "transparent",
    radius: "radius.control",
    height: sizeToken(size.value ?? "md"),
    target: "size.touch",
    typography: "typography.label",
    panel: "typography.caption",
    trackGap: "spacing.sm-plus",
    caretSize: "size.caret",
    duration: "motion.duration-long",
    easing: "motion.easing-standard",
  }),
  getTokens: () => [
    "secondary-tabs.active-color",
    "color.on-surface-muted",
    "border.hairline",
    "radius.control",
    sizeToken(size.value ?? "md"),
    "size.touch",
    "typography.label",
    "typography.caption",
    "spacing.sm-plus",
    "size.caret",
    "motion.duration-long",
    "motion.easing-standard",
  ],
});
</script>

<template>
  <div
    ref="rootRef"
    class="pb-tabs tab-bar"
    :class="{
      'has-divider': showDivider ?? false,
      'is-fill': fill,
    }"
    :style="tabStyle"
    data-pb-role="tab-bar"
  >
    <v-tabs
      v-model="tab"
      class="pb-tab-bar"
      :align-tabs="align ?? 'start'"
      :grow="grow ?? false"
    >
      <v-tab
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        class="pb-tab"
        :ripple="false"
        :data-pb-id="`${inspectId ?? 'ds.secondary-tabs'}.tab`"
        :data-pb-key="item.value"
        data-pb-role="tab"
      >
        <span class="pb-tab-label">{{ item.label }}</span>
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
      transition="v-window-x-transition"
      reverse-transition="v-window-x-reverse-transition"
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
          :data-pb-id="`${inspectId ?? 'ds.secondary-tabs'}.panel`"
          :data-pb-key="item.value"
          data-pb-role="tab-panel"
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
  min-width: var(--pb-layout-zero);
  background: transparent;
}
.pb-tab-bar {
  --v-tabs-height: var(--pb-tabs-height, var(--pb-size-control));
  flex: none;
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
  padding: var(--pb-layout-zero) var(--pb-spacing-md);
  border-radius: var(--pb-tabs-radius, var(--pb-radius-control));
  color: var(--pb-tabs-inactive-color, var(--pb-color-on-surface-muted));
  font: var(--pb-tabs-typography, var(--pb-typography-label));
  letter-spacing: normal;
  text-transform: none;
}
.pb-tab-bar.v-tabs--grow :deep(.v-tab) {
  min-width: var(--pb-layout-zero);
  flex: var(--pb-layout-flex-fill);
  padding-inline: var(--pb-spacing-xs);
}
.pb-tab-bar :deep(.v-tab--selected) {
  color: var(
    --pb-tabs-active-color,
    var(--pb-secondary-tabs-active-color)
  ) !important;
}
.pb-tab-bar :deep(.v-tabs-slider),
.pb-tab-bar :deep(.v-tab__slider) {
  display: none;
}
.pb-tab-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pb-tab-bar :deep(.v-tab--selected .pb-tab-label)::after {
  position: absolute;
  bottom: var(--pb-layout-inset-sm-negative);
  left: var(--pb-layout-half);
  width: var(--pb-layout-zero);
  height: var(--pb-layout-zero);
  border-bottom: var(--pb-size-caret) solid
    var(--pb-tabs-active-color, var(--pb-secondary-tabs-active-color));
  border-right: var(--pb-size-caret) solid transparent;
  border-left: var(--pb-size-caret) solid transparent;
  border-top: var(--pb-layout-zero) solid transparent;
  content: "";
  transform: translateX(var(--pb-layout-half-negative));
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
  .pb-tab-window :deep(.v-window__container),
  .pb-tab-window :deep(.v-window-x-transition-enter-active),
  .pb-tab-window :deep(.v-window-x-transition-leave-active),
  .pb-tab-window :deep(.v-window-x-reverse-transition-enter-active),
  .pb-tab-window :deep(.v-window-x-reverse-transition-leave-active) {
    transition-duration: var(--pb-motion-duration-instant);
  }
}
</style>
