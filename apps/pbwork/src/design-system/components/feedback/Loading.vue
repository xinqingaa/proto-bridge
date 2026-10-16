<script setup lang="ts">
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { computed, nextTick, toRefs, watch } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const props = defineProps<{
  modelValue?: boolean;
  label?: string;
  contained?: boolean;
  /** CSS selector for overlay host; Runtime defaults to .runtime-app */
  attach?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.loading`. */
  inspectId?: string;
}>();

defineEmits<{ "update:modelValue": [boolean] }>();

const rootRef = usePbInspectRef();
const { modelValue, label, contained, attach, inspectId } = toRefs(props);

const attachTarget = computed(() => attach.value ?? ".runtime-app");
const sizePx = useTokenNumber("size.icon-prominent");
const strokePx = useTokenNumber("size.indicator");

const { resync } = usePbInspect({
  element: rootRef,
  pbId: "ds.loading",
  instanceId: inspectId,
  componentId: "loading",
  getProps: () => ({
    modelValue: modelValue.value ?? false,
    label: label.value ?? "",
    contained: contained.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.scrim",
    "color.primary",
    "color.on-surface",
    "size.icon-prominent",
    "size.indicator",
    "motion.duration-long",
    "typography.caption",
  ],
  getTokenBindings: () => ({
    scrim: "color.scrim",
    active: "color.primary",
    text: "color.on-surface",
    size: "size.icon-prominent",
    stroke: "size.indicator",
    motion: "motion.duration-long",
    label: "typography.caption",
  }),
});

watch(modelValue, async (value) => {
  if (!value) return;
  await nextTick();
  resync();
});
</script>

<template>
  <span class="loading-host">
    <v-overlay
      :model-value="modelValue ?? false"
      :attach="attachTarget"
      :absolute="contained ?? true"
      class="pb-loading-overlay"
      persistent
      :close-on-content-click="false"
      :close-on-back="false"
      scrim="scrim"
      @update:model-value="$emit('update:modelValue', Boolean($event))"
    >
      <div
        ref="rootRef"
        class="pb-loading"
        data-pb-id="ds.loading"
        data-pb-role="loading-state"
        role="status"
        aria-live="polite"
        :aria-label="label || '正在加载'"
      >
        <v-progress-circular
          indeterminate
          color="primary"
          :size="sizePx"
          :width="strokePx"
          aria-hidden="true"
        />
        <span v-if="label">{{ label }}</span>
      </div>
    </v-overlay>
  </span>
</template>

<style scoped>
.loading-host {
  display: contents;
}
.pb-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-sm);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-caption);
}
</style>

<style>
.pb-loading-overlay .v-overlay__scrim {
  background: var(--pb-color-scrim) !important;
  opacity: var(--pb-opacity-visible);
}
.pb-loading-overlay .v-overlay__content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--pb-layout-fill);
  height: var(--pb-layout-fill);
}
</style>
