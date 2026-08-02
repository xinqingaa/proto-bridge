<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label: string;
  tone?: "primary" | "error" | "success" | "warning";
  /** Page-unique inspect / comment anchor; falls back to `ds.badge`. */
  inspectId?: string;
  /** Required when multiple badges share the same inspectId on one Screen. */
  pbKey?: string;
}>();

const rootRef = usePbInspectRef();
const { label, tone, inspectId, pbKey } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.badge",
  instanceId: inspectId,
  pbKey,
  componentId: "badge",
  getProps: () => ({
    label: label.value,
    tone: tone.value ?? "error",
    inspectId: inspectId.value,
    pbKey: pbKey.value,
  }),
  getTokens: () => [
    `color.${tone.value ?? "error"}`,
    `color.on-${tone.value ?? "error"}`,
    "radius.full",
    "typography.caption-strong",
  ],
  getTokenBindings: () => ({
    background: `color.${tone.value ?? "error"}`,
    text: `color.on-${tone.value ?? "error"}`,
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
    data-pb-role="badge"
    :color="tone ?? 'error'"
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
