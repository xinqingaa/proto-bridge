<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label?: string;
  inset?: boolean;
}>();

const rootRef = usePbInspectRef();
const { label, inset } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.divider",
  componentId: "divider",
  getProps: () => ({
    label: label.value ?? "",
    inset: inset.value ?? false,
  }),
  getTokens: () => ["color.divider", "spacing.md", "typography.caption"],
  getTokenBindings: () => ({
    line: "color.divider",
    inset: "spacing.md",
    label: "typography.caption",
  }),
});
</script>

<template>
  <div
    ref="rootRef"
    class="pb-divider"
    data-pb-id="ds.divider"
    :class="{ 'is-inset': inset }"
  >
    <v-divider />
    <span v-if="label" class="pb-divider-label">{{ label }}</span>
    <v-divider v-if="label" />
  </div>
</template>

<style scoped>
.pb-divider {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  width: 100%;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.pb-divider.is-inset {
  padding-inline: var(--pb-spacing-md);
}
.pb-divider :deep(.v-divider) {
  border-color: var(--pb-color-divider);
  opacity: 1;
}
.pb-divider-label {
  flex-shrink: 0;
}
</style>
