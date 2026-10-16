<script setup lang="ts">
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
import { themeConstantNumber } from "@/design-system/theme/constants";

import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const TRACK_HEIGHT = useTokenNumber("progress.track-height");
const TRACK_OPACITY = themeConstantNumber("opacity.visible");

const props = defineProps<{
  label?: string;
  value?: number;
  indeterminate?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.progress`. */
  inspectId?: string;
}>();

const rootRef = usePbInspectRef();
const { label, value, indeterminate, inspectId } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.progress",
  instanceId: inspectId,
  componentId: "progress",
  getProps: () => ({
    label: label.value ?? "",
    value: value.value ?? 0,
    indeterminate: indeterminate.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.primary",
    "color.primary-soft",
    "color.on-surface",
    "radius.pill",
    "typography.caption",
    "motion.duration-medium",
    "progress.gap",
    "progress.track-height",
  ],
  getTokenBindings: () => ({
    fill: "color.primary",
    track: "color.primary-soft",
    radius: "radius.pill",
    motion: "motion.duration-medium",
    gap: "progress.gap",
    text: "color.on-surface",
    label: "typography.caption",
    trackHeight: "progress.track-height",
  }),
});
</script>

<template>
  <div
    ref="rootRef"
    class="pb-progress-wrap"
    data-pb-id="ds.progress"
    data-pb-role="loading-state"
  >
    <span v-if="label" class="pb-progress-label">{{ label }}</span>
    <v-progress-linear
      class="pb-progress"
      color="primary"
      bg-color="primary-soft"
      :bg-opacity="TRACK_OPACITY"
      :height="TRACK_HEIGHT"
      rounded
      :model-value="indeterminate ? 0 : (value ?? 0)"
      :indeterminate="indeterminate ?? false"
    />
  </div>
</template>

<style scoped>
.pb-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--pb-progress-gap);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-caption);
}
.pb-progress {
  border-radius: var(--pb-radius-pill);
  overflow: hidden;
}
</style>
