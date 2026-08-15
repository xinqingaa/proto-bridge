<script setup lang="ts">
import { computed, toRefs, watch } from "vue";
import Button from "@/design-system/components/action/Button.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { usePointerSwipe } from "@/design-system/components/_shared/usePointerSwipe";

const props = withDefaults(
  defineProps<{
    title: string;
    modelValue?: boolean;
    step?: number;
    stepCount?: number;
    /** Page-unique inspect / comment anchor; falls back to `ds.flow-sheet`. */
    inspectId?: string;
    attach?: string;
    swipe?: boolean;
  }>(),
  {
    modelValue: false,
    step: 0,
    stepCount: 3,
    swipe: true,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:step": [value: number];
}>();

const sheetRef = usePbInspectRef();
const { title, modelValue, step, stepCount, inspectId, attach, swipe } =
  toRefs(props);

const attachTarget = computed(() => attach.value ?? ".runtime-app");
const safeStep = computed(() =>
  Math.min(Math.max(0, step.value), Math.max(0, stepCount.value - 1)),
);
const stepKeys = computed(() =>
  Array.from({ length: Math.max(1, stepCount.value) }, (_, index) =>
    String(index),
  ),
);
const currentStepKey = computed(() => String(safeStep.value));
const swipeEnabled = swipe;
const mouseSwipe = swipe;

const swipeGesture = usePointerSwipe(
  stepKeys,
  currentStepKey,
  (value) => emit("update:step", Number(value)),
  { swipe: swipeEnabled, mouseSwipe },
);

usePbInspect({
  element: sheetRef,
  pbId: "ds.flow-sheet",
  instanceId: inspectId,
  componentId: "flow-sheet",
  getProps: () => ({
    title: title.value,
    modelValue: modelValue.value ?? false,
    step: safeStep.value,
    stepCount: stepCount.value,
    inspectId: inspectId.value,
  }),
  getState: () => ({
    open: Boolean(modelValue.value),
    step: safeStep.value,
  }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    description: "color.on-surface-muted",
    inactiveIndicator: "color.outline",
    activeIndicator: "color.primary",
    radius: "radius.lg",
    elevation: "elevation.raised",
    title: "typography.subtitle",
    body: "typography.content",
    stepLabel: "typography.micro",
    headerGap: "spacing.sm-plus",
    dotGap: "spacing.xs-plus",
    dotSize: "sizing.step-dot",
    fill: "layout.fill",
    trackTranslation: "layout.translate-full-negative",
    maxHeight: "layout.sheet-max-height",
    duration: "motion.duration-sheet",
    easing: "motion.easing-gentle",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface-muted",
    "color.outline",
    "color.primary",
    "radius.lg",
    "elevation.raised",
    "typography.subtitle",
    "typography.content",
    "typography.micro",
    "spacing.xxs",
    "spacing.xs-plus",
    "spacing.sm",
    "spacing.sm-plus",
    "spacing.md",
    "sizing.step-dot",
    "sizing.icon-sm",
    "layout.fill",
    "layout.translate-full-negative",
    "layout.sheet-max-height",
    "motion.duration-sheet",
    "motion.easing-gentle",
  ],
});

watch(stepCount, (count) => {
  if (step.value >= count) emit("update:step", Math.max(0, count - 1));
});
</script>

<template>
  <v-bottom-sheet
    :model-value="modelValue ?? false"
    class="pb-flow-sheet-host"
    scrim
    :attach="attachTarget"
    absolute
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  >
    <v-card
      ref="sheetRef"
      class="pb-flow-sheet sheet"
      data-pb-id="ds.flow-sheet"
      data-pb-role="sheet"
      data-pb-shell="sheet"
      role="dialog"
      aria-modal="true"
      color="surface"
      variant="flat"
    >
      <v-card-title class="pb-flow-sheet-header">
        <div>
          <span>{{ title }}</span>
          <small v-if="stepCount > 1"
            >{{ safeStep + 1 }} / {{ stepCount }}</small
          >
        </div>
        <Button
          label="关闭"
          bg-color="transparent"
          border-color="transparent"
          text-color="color.on-surface-muted"
          @click="$emit('update:modelValue', false)"
        />
      </v-card-title>
      <div class="pb-flow-sheet-dots" aria-hidden="true">
        <span
          v-for="index in stepCount"
          :key="index"
          :class="{ active: index - 1 === safeStep }"
        />
      </div>
      <v-card-text
        class="pb-flow-sheet-body"
        :class="{
          'allows-swipe': swipe,
          'is-dragging': swipeGesture.dragging.value,
        }"
        @pointerdown="swipeGesture.onPointerDown"
        @pointermove="swipeGesture.onPointerMove"
        @pointerup="swipeGesture.onPointerUp"
        @pointercancel="swipeGesture.onPointerCancel"
        @touchstart="swipeGesture.onTouchStart"
        @touchmove="swipeGesture.onTouchMove"
        @touchend="swipeGesture.onTouchEnd"
        @touchcancel="swipeGesture.onTouchCancel"
        @click.capture="swipeGesture.onClickCapture"
      >
        <div
          class="pb-flow-sheet-track"
          :style="{ '--pb-flow-step-index': safeStep }"
        >
          <slot />
        </div>
      </v-card-text>
      <footer v-if="$slots.actions" class="pb-flow-sheet-actions">
        <slot name="actions" />
      </footer>
    </v-card>
  </v-bottom-sheet>
</template>

<style scoped>
.pb-flow-sheet {
  border-radius: var(--pb-radius-lg) var(--pb-radius-lg) var(--pb-radius-none)
    var(--pb-radius-none);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-elevation-raised);
}
.pb-flow-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-sm-plus);
  padding: var(--pb-spacing-md);
  border-bottom: var(--pb-border-hairline);
  font: var(--pb-typography-subtitle);
}
.pb-flow-sheet-header small {
  display: block;
  margin-top: var(--pb-spacing-xxs);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-micro);
}
.pb-flow-sheet-dots {
  display: flex;
  justify-content: center;
  gap: var(--pb-spacing-xs-plus);
  padding: var(--pb-spacing-sm) var(--pb-spacing-none) var(--pb-spacing-none);
}
.pb-flow-sheet-dots span {
  width: var(--pb-sizing-step-dot);
  height: var(--pb-sizing-step-dot);
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-outline);
}
.pb-flow-sheet-dots span.active {
  width: var(--pb-sizing-icon-sm);
  background: var(--pb-color-primary);
}
.pb-flow-sheet-body {
  overflow: hidden;
  padding: var(--pb-spacing-none);
  touch-action: pan-y;
}
.pb-flow-sheet-body.allows-swipe {
  cursor: grab;
}
.pb-flow-sheet-body.is-dragging {
  cursor: grabbing;
}
.pb-flow-sheet-track {
  display: flex;
  width: var(--pb-layout-fill);
  transform: translateX(
    calc(var(--pb-layout-translate-full-negative) * var(--pb-flow-step-index))
  );
  transition: transform var(--pb-motion-duration-sheet)
    var(--pb-motion-easing-gentle);
}
.pb-flow-sheet-track > :deep(*) {
  flex: none;
  min-width: var(--pb-layout-fill);
  max-height: var(--pb-layout-sheet-max-height);
  overflow: auto;
  padding: var(--pb-spacing-md);
  box-sizing: border-box;
  font: var(--pb-typography-content);
}
.pb-flow-sheet-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm-plus) var(--pb-spacing-md) var(--pb-spacing-md);
  border-top: var(--pb-border-hairline);
}
</style>

<style>
.pb-flow-sheet-host.v-bottom-sheet > .v-overlay__content,
.pb-flow-sheet-host.v-bottom-sheet > .v-bottom-sheet__content {
  width: var(--pb-layout-fill) !important;
  max-width: var(--pb-layout-fill) !important;
  margin-inline: var(--pb-spacing-none) !important;
}
.pb-flow-sheet-host.v-bottom-sheet
  > .v-bottom-sheet__content.v-overlay__content
  > .pb-flow-sheet {
  border-radius: var(--pb-radius-lg) var(--pb-radius-lg) var(--pb-radius-none)
    var(--pb-radius-none) !important;
}
.pb-flow-sheet-host.v-bottom-sheet
  > .v-bottom-sheet__content.v-overlay__content
  > .pb-flow-sheet
  > .pb-flow-sheet-body {
  min-width: var(--pb-spacing-none);
  overflow: hidden;
  padding: var(--pb-spacing-none) !important;
}
</style>
