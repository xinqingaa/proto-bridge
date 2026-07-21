<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label?: string;
  size?: "sm" | "md" | "lg";
}>();

const rootRef = usePbInspectRef();
const { label, size } = toRefs(props);

const sizePx = computed(() => {
  return `var(--pb-sizing-icon-${size.value ?? "md"})`;
});

usePbInspect({
  element: rootRef,
  pbId: "ds.spinner",
  componentId: "spinner",
  getProps: () => ({
    label: label.value ?? "",
    size: size.value ?? "md",
  }),
  getTokens: () => [
    "color.primary",
    `sizing.icon-${size.value ?? "md"}`,
    "typography.caption",
  ],
  getTokenBindings: () => ({
    active: "color.primary",
    track: "color.primary-soft",
    size: `sizing.icon-${size.value ?? "md"}`,
    motion: "motion.duration-slow",
    label: "typography.caption",
  }),
});
</script>

<template>
  <div ref="rootRef" class="pb-spinner" data-pb-id="ds.spinner">
    <v-progress-circular
      indeterminate
      color="primary"
      :size="sizePx"
      :width="3"
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
