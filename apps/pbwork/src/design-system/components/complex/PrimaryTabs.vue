<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toRefs,
  watch,
} from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { usePointerSwipe } from "@/design-system/components/_shared/usePointerSwipe";
import LiquidGlass from "@/design-system/components/_shared/LiquidGlass.vue";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const SLIDE_DURATION_MS = tokenDefaultNumber("motion.duration-slow");

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
  "--pb-tabs-track-background": "var(--pb-color-surface-recessed)",
  "--pb-tabs-selection-surface": "var(--pb-color-surface-selected)",
  "--pb-tabs-selection-opacity": "var(--pb-opacity-glass)",
  "--pb-tabs-selection-elevation": "var(--pb-elevation-glass)",
  "--pb-tabs-selection-radius": "var(--pb-radius-full)",
  "--pb-tabs-selection-bridge-height": "var(--pb-spacing-xs)",
  "--pb-tabs-selection-arc-inset": "var(--pb-spacing-xs)",
  "--pb-tabs-selection-arc-radius": "var(--pb-radius-full)",
  "--pb-tabs-track-radius": "var(--pb-radius-lg)",
  "--pb-tabs-active-color": "var(--pb-color-section-tab-active)",
  "--pb-tabs-inactive-color": "var(--pb-color-on-surface-muted)",
  "--pb-tabs-typography": "var(--pb-typography-label)",
  "--pb-tabs-radius": "var(--pb-radius-full)",
  "--pb-tabs-height": `var(--pb-sizing-control-${size.value ?? "md"})`,
  "--pb-tabs-pill-duration": "var(--pb-motion-duration-slow)",
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

const pill = ref({ left: 0, width: 0, ready: false });
const pillTransitionReady = ref(false);

function measurePill() {
  const track = trackRef.value;
  if (!track) return;
  const active = Array.from(
    track.querySelectorAll<HTMLElement>(".pb-tab"),
  ).find((el) => el.getAttribute("data-pb-key") === tab.value);
  if (!active) return;
  const trackBox = track.getBoundingClientRect();
  const tabBox = active.getBoundingClientRect();
  pill.value = {
    left: tabBox.left - trackBox.left + track.scrollLeft,
    width: tabBox.width,
    ready: true,
  };
}

let resizeObserver: ResizeObserver | null = null;
let pillTransitionFrame: number | null = null;

onMounted(() => {
  measurePill();
  if (trackRef.value && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => measurePill());
    resizeObserver.observe(trackRef.value);
  }
  pillTransitionFrame = requestAnimationFrame(() => {
    pillTransitionFrame = requestAnimationFrame(() => {
      pillTransitionReady.value = true;
      pillTransitionFrame = null;
    });
  });
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (pillTransitionFrame !== null) {
    cancelAnimationFrame(pillTransitionFrame);
    pillTransitionFrame = null;
  }
});

watch(
  [tab, items, grow, size, align],
  async () => {
    await nextTick();
    measurePill();
  },
  { flush: "post" },
);

const pillStyle = computed(() => ({
  transform: `translateX(${pill.value.left}px)`,
  width: `${pill.value.width}px`,
  opacity: pill.value.ready ? 1 : 0,
}));

usePbInspect({
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
    trackSurface: "color.surface-recessed",
    selectionSurface: "color.surface-selected",
    selectionOpacity: "opacity.glass",
    selectionElevation: "elevation.glass",
    activeColor: "color.section-tab-active",
    inactiveColor: "color.on-surface-muted",
    border: showDivider.value ? "border.hairline" : "transparent",
    trackRadius: "radius.lg",
    radius: "radius.full",
    height: `sizing.control-${size.value ?? "md"}`,
    target: "sizing.touch",
    typography: "typography.label",
    panel: "typography.caption",
    trackInset: "spacing.xs",
    panelGap: "spacing.sm-plus",
    indicatorInset: "spacing.sm-plus",
    indicatorOffset: "spacing.xxs",
    indicatorThickness: "sizing.indicator-thickness",
    fill: "layout.fill",
    selectionLayer: "layer.content",
    glassBackdrop: "effect.glass-backdrop",
    reducedDuration: "motion.duration-instant",
    duration: "motion.duration-slow",
    easing: "motion.easing-standard",
  }),
  getTokens: () => [
    "color.surface-recessed",
    "color.surface-selected",
    "opacity.glass",
    "color.section-tab-active",
    "color.on-surface-muted",
    "border.hairline",
    "elevation.glass",
    "radius.lg",
    "radius.full",
    `sizing.control-${size.value ?? "md"}`,
    "sizing.touch",
    "typography.label",
    "typography.caption",
    "spacing.xxs",
    "spacing.xs",
    "spacing.sm",
    "spacing.sm-plus",
    "sizing.indicator-thickness",
    "layout.fill",
    "layer.base",
    "layer.content",
    "effect.glass-backdrop",
    "opacity.hidden",
    "motion.duration-fast",
    "motion.duration-instant",
    "motion.duration-slow",
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
      'is-pill-transition-ready': pillTransitionReady,
    }"
    :style="tabStyle"
    data-pb-role="tab-bar"
  >
    <div ref="trackRef" class="pb-tabs-track" role="tablist">
      <div class="pb-tabs-pill" aria-hidden="true" :style="pillStyle">
        <LiquidGlass :active="true" />
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
          v-if="tab === item.value"
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
  min-width: 0;
  background: transparent;
}
.pb-tabs-track {
  position: relative;
  display: inline-flex;
  max-width: var(--pb-layout-fill);
  align-items: stretch;
  gap: 0;
  min-height: var(--pb-tabs-height, var(--pb-sizing-control-md));
  padding: var(--pb-spacing-xs);
  overflow: auto;
  border-radius: var(--pb-tabs-track-radius, var(--pb-radius-lg));
  background: var(--pb-tabs-track-background);
  scrollbar-width: none;
}
.pb-tabs-track::-webkit-scrollbar {
  display: none;
}
.pb-tabs.is-grow .pb-tabs-track {
  display: flex;
  width: var(--pb-layout-fill);
}
.pb-tabs.align-center .pb-tabs-track {
  align-self: center;
}
.pb-tabs.has-divider .pb-tabs-track {
  border-bottom: var(--pb-border-hairline);
}
.pb-tabs-pill {
  position: absolute;
  top: var(--pb-spacing-xs);
  bottom: var(--pb-spacing-xs);
  left: 0;
  z-index: var(--pb-layer-base);
  border-radius: var(--pb-tabs-selection-radius);
  overflow: visible;
  transition: none;
  pointer-events: none;
}
.pb-tabs.is-pill-transition-ready .pb-tabs-pill {
  transition:
    transform var(--pb-tabs-pill-duration) var(--pb-tabs-pill-easing),
    width var(--pb-tabs-pill-duration) var(--pb-tabs-pill-easing),
    opacity var(--pb-motion-duration-fast)
      var(--pb-motion-easing-standard);
}
.pb-tab {
  position: relative;
  z-index: var(--pb-layer-content);
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-height: calc(
    var(--pb-tabs-height, var(--pb-sizing-control-md)) - var(--pb-spacing-xs) - var(--pb-spacing-xs)
  );
  padding: 0 var(--pb-spacing-md);
  border: 0;
  border-radius: var(--pb-tabs-radius, var(--pb-radius-full));
  background: transparent;
  color: var(--pb-tabs-inactive-color, var(--pb-color-on-surface-muted));
  font: var(--pb-tabs-typography, var(--pb-typography-label));
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--pb-motion-duration-fast)
    var(--pb-motion-easing-standard);
}
.pb-tabs.is-grow .pb-tab {
  flex: 1 1 0;
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
  height: var(--pb-sizing-indicator-thickness);
  border-radius: var(--pb-radius-full) var(--pb-radius-full) 0 0;
  background: var(--pb-tabs-active-color, var(--pb-color-primary));
}
.pb-tab-window {
  min-width: 0;
  touch-action: pan-y;
  --v-window-transition-duration: var(--pb-motion-duration-slow);
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
  min-height: 0;
}
.pb-tabs.is-fill .pb-tab-window,
.pb-tabs.is-fill .pb-tab-window :deep(.v-window__container),
.pb-tabs.is-fill .pb-tab-window :deep(.v-window-item),
.pb-tabs.is-fill .pb-tab-panel {
  height: var(--pb-layout-fill);
  min-height: 0;
}
.pb-tabs.is-fill .pb-tab-window {
  flex: 1 1 0;
}
.pb-tabs.is-fill .pb-tab-panel {
  align-content: start;
}
.pb-tab-window :deep(.v-window__container),
.pb-tab-window :deep(.v-window-x-transition-enter-active),
.pb-tab-window :deep(.v-window-x-transition-leave-active),
.pb-tab-window :deep(.v-window-x-reverse-transition-enter-active),
.pb-tab-window :deep(.v-window-x-reverse-transition-leave-active) {
  transition-duration: var(--pb-motion-duration-slow);
  transition-timing-function: var(--pb-motion-easing-standard);
}
.pb-tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm-plus);
  min-width: 0;
}
.pb-tab-panel-empty {
  margin: 0;
  padding: var(--pb-spacing-sm) 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
@media (prefers-reduced-motion: reduce) {
  .pb-tabs-pill {
    transition-duration: var(--pb-motion-duration-instant);
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
