<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label?: string;
  size?: "sm" | "md" | "lg";
}>();

const rootRef = usePbInspectRef();
const { label, size } = toRefs(props);

/** Pixel sizes aligned with sizing.icon-* tokens (Vuetify needs a number). */
const sizePx = computed(() => {
  if (size.value === "sm") return 16;
  if (size.value === "lg") return 24;
  return 20;
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
    "color.on-surface-muted",
    `sizing.icon-${size.value ?? "md"}`,
    "motion.duration-slow",
    "typography.caption",
  ],
  getTokenBindings: () => ({
    active: "color.primary",
    text: "color.on-surface-muted",
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
