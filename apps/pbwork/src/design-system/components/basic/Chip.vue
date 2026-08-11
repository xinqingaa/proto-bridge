<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { elevationStyle } from "@/design-system/components/_shared/appearance";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const NO_ELEVATION = tokenDefaultNumber("layer.base");

const props = defineProps<{
  label: string;
  tone?: "primary" | "secondary" | "success" | "warning" | "error";
  elevated?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.chip`. */
  inspectId?: string;
  /** Required when multiple chips share the same inspectId on one Screen. */
  pbKey?: string;
}>();

const rootRef = usePbInspectRef();
const { label, tone, elevated, inspectId, pbKey } = toRefs(props);

function softTokenForTone(value: string | undefined): `color.${string}-soft` {
  const t = value ?? "primary";
  return `color.${t}-soft`;
}

usePbInspect({
  element: rootRef,
  pbId: "ds.chip",
  instanceId: inspectId,
  pbKey,
  componentId: "chip",
  getProps: () => ({
    label: label.value,
    tone: tone.value ?? "primary",
    elevated: elevated.value ?? false,
    inspectId: inspectId.value,
    pbKey: pbKey.value,
  }),
  getTokenBindings: () => ({
    background: softTokenForTone(tone.value),
    color: `color.${tone.value ?? "primary"}`,
    radius: "radius.sm",
    elevation: "elevation.card",
    typography: "typography.caption",
  }),
  getTokens: () => [
    softTokenForTone(tone.value),
    `color.${tone.value ?? "primary"}`,
    "radius.sm",
    "elevation.card",
    "typography.caption",
    "spacing.sm",
  ],
});
</script>

<template>
  <v-chip
    ref="rootRef"
    class="pb-chip"
    data-pb-id="ds.chip"
    data-pb-role="chip"
    :color="tone ?? 'primary'"
    variant="tonal"
    size="small"
    :elevation="NO_ELEVATION"
    rounded="md"
    :style="[radiusStyle('sm'), elevationStyle(elevated ? 'card' : 'none')]"
  >
    {{ label }}
  </v-chip>
</template>

<style scoped>
.pb-chip {
  font: var(--pb-typography-caption);
  text-transform: none;
  letter-spacing: normal;
  box-shadow: var(--pb-component-shadow, var(--pb-elevation-none)) !important;
}
</style>
