<script setup lang="ts">
import { iconSizeToken } from "@/design-system/components/_shared/appearance";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const props = defineProps<{
  label?: string;
  size?: "sm" | "md" | "lg";
  /** Page-unique inspect / comment anchor; falls back to `ds.spinner`. */
  inspectId?: string;
}>();

const rootRef = usePbInspectRef();
const { label, size, inspectId } = toRefs(props);

const sizeTokenId = computed(() => iconSizeToken(size.value ?? "md"));
const sizePx = useTokenNumber(() => sizeTokenId.value);
const strokePx = useTokenNumber("size.indicator");

usePbInspect({
  element: rootRef,
  pbId: "ds.spinner",
  instanceId: inspectId,
  componentId: "spinner",
  getProps: () => ({
    label: label.value ?? "",
    size: size.value ?? "md",
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.primary",
    "color.on-surface-muted",
    sizeTokenId.value,
    "size.indicator",
    "motion.duration-long",
    "typography.caption",
  ],
  getTokenBindings: () => ({
    active: "color.primary",
    text: "color.on-surface-muted",
    size: sizeTokenId.value,
    stroke: "size.indicator",
    motion: "motion.duration-long",
    label: "typography.caption",
  }),
});
</script>

<template>
  <div
    ref="rootRef"
    class="pb-spinner"
    data-pb-id="ds.spinner"
    data-pb-role="loading-state"
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
</template>

<style scoped>
.pb-spinner {
  display: inline-flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
</style>
