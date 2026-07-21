<script setup lang="ts">
import { toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { elevationStyle } from "@/design-system/components/_shared/appearance";

const props = defineProps<{
  label: string;
  tone?: "primary" | "secondary" | "success" | "warning" | "error";
  elevated?: boolean;
}>();

const rootRef = usePbInspectRef();
const { label, tone, elevated } = toRefs(props);

function softTokenForTone(value: string | undefined): `color.${string}-soft` {
  const t = value ?? "primary";
  return `color.${t}-soft`;
}

usePbInspect({
  element: rootRef,
  pbId: "ds.chip",
  componentId: "chip",
  getProps: () => ({
    label: label.value,
    tone: tone.value ?? "primary",
    elevated: elevated.value ?? false,
  }),
  getTokenBindings: () => ({
    background: softTokenForTone(tone.value),
    color: `color.${tone.value ?? "primary"}`,
    radius: "radius.full",
    elevation: "elevation.card",
    typography: "typography.caption",
  }),
  getTokens: () => [
    softTokenForTone(tone.value),
    `color.${tone.value ?? "primary"}`,
    "radius.full",
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
    :color="tone ?? 'primary'"
    variant="tonal"
    size="small"
    :elevation="0"
    rounded="pill"
    :style="[radiusStyle('full'), elevationStyle(elevated ? 'card' : 'none')]"
  >
    {{ label }}
  </v-chip>
</template>

<style scoped>
.pb-chip {
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
  text-transform: none;
  letter-spacing: normal;
  box-shadow: var(--pb-component-shadow, none) !important;
}
</style>
