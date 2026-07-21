<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label: string;
  tone?: "primary" | "error" | "success" | "warning";
}>();

const rootRef = usePbInspectRef();
const { label, tone } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.badge",
  componentId: "badge",
  getProps: () => ({
    label: label.value,
    tone: tone.value ?? "primary",
  }),
  getTokens: () => [
    `color.${tone.value ?? "primary"}`,
    `color.on-${tone.value ?? "primary"}`,
    "radius.full",
    "typography.caption-strong",
  ],
  getTokenBindings: () => ({
    background: `color.${tone.value ?? "primary"}`,
    text: `color.on-${tone.value ?? "primary"}`,
    radius: "radius.full",
    label: "typography.caption-strong",
  }),
});
</script>

<template>
  <v-chip
    ref="rootRef"
    class="pb-badge"
    data-pb-id="ds.badge"
    :color="tone ?? 'primary'"
    size="x-small"
    variant="flat"
    label
  >
    {{ label }}
  </v-chip>
</template>

<style scoped>
.pb-badge {
  border-radius: var(--pb-radius-full, 999px);
  font: var(
    --pb-typography-caption-strong,
    600 11px/1.2 Inter,
    system-ui,
    sans-serif
  );
  text-transform: none;
  letter-spacing: normal;
}
</style>
