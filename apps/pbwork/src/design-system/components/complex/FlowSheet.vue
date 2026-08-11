<script setup lang="ts">
import { computed, toRefs, watch } from "vue";
import Button from "@/design-system/components/basic/Button.vue";
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
const offsetPercent = computed(() => `-${safeStep.value * 100}%`);
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
          variant="text"
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
          :style="{ transform: `translateX(${offsetPercent})` }"
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
  border-radius: var(--pb-radius-lg, 16px) var(--pb-radius-lg, 16px) 0 0;
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-elevation-raised);
}
.pb-flow-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: var(--pb-spacing-md, 16px);
  border-bottom: var(--pb-border-hairline);
  font: var(
    --pb-typography-subtitle,
    600 16px/1.4 Inter,
    system-ui,
    sans-serif
  );
}
.pb-flow-sheet-header small {
  display: block;
  margin-top: 2px;
  color: var(--pb-color-on-surface-muted);
  font-size: 0.72rem;
  font-weight: 500;
}
.pb-flow-sheet-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 8px 0 0;
}
.pb-flow-sheet-dots span {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--pb-color-outline);
}
.pb-flow-sheet-dots span.active {
  width: 16px;
  background: var(--pb-color-primary);
}
.pb-flow-sheet-body {
  overflow: hidden;
  padding: 0;
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
  width: 100%;
  transition: transform 220ms ease;
}
.pb-flow-sheet-track > :deep(*) {
  flex: 0 0 100%;
  min-width: 100%;
  max-height: min(62vh, 560px);
  overflow: auto;
  padding: var(--pb-spacing-md, 16px);
  box-sizing: border-box;
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
}
.pb-flow-sheet-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px 18px;
  border-top: var(--pb-border-hairline);
}
</style>

<style>
.pb-flow-sheet-host.v-bottom-sheet > .v-overlay__content,
.pb-flow-sheet-host.v-bottom-sheet > .v-bottom-sheet__content {
  width: 100% !important;
  max-width: 100% !important;
  margin-inline: 0 !important;
}
</style>
