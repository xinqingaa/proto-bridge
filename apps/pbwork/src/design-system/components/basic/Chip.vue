<script setup lang="ts">
import { toRefs } from "vue";
import {
  usePbInspect,
  usePbInspectRef,
} from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label: string;
  tone?: "primary" | "secondary" | "success" | "warning" | "error";
  radius?: "sm" | "md" | "lg" | "full";
  elevated?: boolean;
}>();

const rootRef = usePbInspectRef();
const { label, tone, radius, elevated } = toRefs(props);

function softTokenForTone(
  value: string | undefined,
): `color.${string}-soft` {
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
    radius: radius.value ?? "full",
    elevated: elevated.value ?? false,
  }),
  getTokenBindings: () => ({
    background: softTokenForTone(tone.value),
    color: `color.${tone.value ?? "primary"}`,
    radius: `radius.${radius.value ?? "full"}`,
    elevation: "elevation.card",
    typography: "typography.caption",
  }),
  getTokens: () => [
    softTokenForTone(tone.value),
    `color.${tone.value ?? "primary"}`,
    `radius.${radius.value ?? "full"}`,
    "elevation.card",
    "typography.caption",
    "spacing.sm",
  ],
});
</script>

<template>
  <span
    ref="rootRef"
    class="pb-chip"
    data-pb-id="ds.chip"
    :class="[
      `tone-${tone ?? 'primary'}`,
      `radius-${radius ?? 'full'}`,
      { 'is-elevated': elevated },
    ]"
  >
    {{ label }}
  </span>
</template>

<style scoped>
.pb-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 var(--pb-spacing-sm, 8px);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
.pb-chip.radius-sm {
  border-radius: var(--pb-radius-sm, 8px);
}
.pb-chip.radius-md {
  border-radius: var(--pb-radius-md, 12px);
}
.pb-chip.radius-lg {
  border-radius: var(--pb-radius-lg, 16px);
}
.pb-chip.radius-full {
  border-radius: var(--pb-radius-full, 999px);
}
.pb-chip.is-elevated {
  box-shadow: var(--pb-elevation-card, none);
}
.pb-chip.tone-primary {
  background: var(--pb-color-primary-soft, #2563eb29);
  color: var(--pb-color-primary, #2563eb);
}
.pb-chip.tone-secondary {
  background: var(--pb-color-secondary-soft, #5b6b7c29);
  color: var(--pb-color-secondary, #5b6b7c);
}
.pb-chip.tone-success {
  background: var(--pb-color-success-soft, #167c4d29);
  color: var(--pb-color-success, #167c4d);
}
.pb-chip.tone-warning {
  background: var(--pb-color-warning-soft, #9a670029);
  color: var(--pb-color-warning, #9a6700);
}
.pb-chip.tone-error {
  background: var(--pb-color-error-soft, #b4231829);
  color: var(--pb-color-error, #b42318);
}
</style>
