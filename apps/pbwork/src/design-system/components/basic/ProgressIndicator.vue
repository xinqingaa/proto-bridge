<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label?: string;
  value?: number;
  indeterminate?: boolean;
}>();

const rootRef = usePbInspectRef();
const { label, value, indeterminate } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.progress",
  componentId: "progress",
  getProps: () => ({
    label: label.value ?? "",
    value: value.value ?? 0,
    indeterminate: indeterminate.value ?? false,
  }),
  getTokens: () => [
    "color.primary",
    "color.primary-soft",
    "radius.full",
    "typography.caption",
    "motion.duration-normal",
  ],
  getTokenBindings: () => ({
    fill: "color.primary",
    track: "color.primary-soft",
    radius: "radius.full",
    motion: "motion.duration-normal",
  }),
});
</script>

<template>
  <div ref="rootRef" class="pb-progress-wrap" data-pb-id="ds.progress">
    <span v-if="label" class="pb-progress-label">{{ label }}</span>
    <v-progress-linear
      class="pb-progress"
      color="primary"
      bg-color="primary"
      :bg-opacity="0.16"
      height="6"
      rounded
      :model-value="indeterminate ? 0 : (value ?? 0)"
      :indeterminate="indeterminate ?? false"
    />
  </div>
</template>

<style scoped>
.pb-progress-wrap {
  display: grid;
  gap: 6px;
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-caption);
}
.pb-progress {
  border-radius: var(--pb-radius-full);
  overflow: hidden;
}
</style>
