<script setup lang="ts">
import { toRefs } from "vue";
import {
  usePbInspect,
  usePbInspectRef,
} from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  label: string;
  variant?: "flat" | "tonal" | "outlined" | "text";
  tone?: "primary" | "secondary" | "error" | "success";
  radius?: "sm" | "md" | "lg" | "full";
  elevated?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}>();
defineEmits<{ click: [] }>();

const rootRef = usePbInspectRef();
const { label, variant, tone, radius, elevated, disabled, type } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.button",
  componentId: "button",
  getProps: () => ({
    label: label.value,
    variant: variant.value ?? "flat",
    tone: tone.value ?? "primary",
    radius: radius.value ?? "md",
    elevated: elevated.value ?? false,
    disabled: disabled.value ?? false,
    type: type.value ?? "button",
  }),
  getTokenBindings: () => {
    const t = tone.value ?? "primary";
    const v = variant.value ?? "flat";
    return {
      background: v === "tonal" ? `color.${t}-soft` : `color.${t}`,
      onBackground: "color.on-primary",
      radius: `radius.${radius.value ?? "md"}`,
      elevation: "elevation.card",
      typography: "typography.content",
    };
  },
  getTokens: () => {
    const t = tone.value ?? "primary";
    const v = variant.value ?? "flat";
    return [
      v === "tonal" ? `color.${t}-soft` : `color.${t}`,
      "color.on-primary",
      "color.on-surface",
      "color.border",
      `radius.${radius.value ?? "md"}`,
      "elevation.card",
      "typography.content",
      "spacing.md",
    ];
  },
});
</script>

<template>
  <button
    ref="rootRef"
    :type="type ?? 'button'"
    class="pb-button"
    data-pb-id="ds.button"
    :class="[
      `is-${variant ?? 'flat'}`,
      `tone-${tone ?? 'primary'}`,
      `radius-${radius ?? 'md'}`,
      { 'is-elevated': elevated, 'is-disabled': disabled },
    ]"
    :disabled="disabled ?? false"
    @click="$emit('click')"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.pb-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 var(--pb-spacing-md, 16px);
  border: 1px solid transparent;
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
  cursor: pointer;
  transition:
    background-color 120ms ease,
    color 120ms ease,
    box-shadow 120ms ease;
}
.pb-button.radius-sm {
  border-radius: var(--pb-radius-sm, 8px);
}
.pb-button.radius-md {
  border-radius: var(--pb-radius-md, 12px);
}
.pb-button.radius-lg {
  border-radius: var(--pb-radius-lg, 16px);
}
.pb-button.radius-full {
  border-radius: var(--pb-radius-full, 999px);
}
.pb-button.tone-primary.is-flat {
  background: var(--pb-color-primary, #2563eb);
  color: var(--pb-color-on-primary, #fff);
}
.pb-button.tone-secondary.is-flat {
  background: var(--pb-color-secondary, #5b6b7c);
  color: #fff;
}
.pb-button.tone-error.is-flat {
  background: var(--pb-color-error, #b42318);
  color: #fff;
}
.pb-button.tone-success.is-flat {
  background: var(--pb-color-success, #167c4d);
  color: #fff;
}
.pb-button.is-tonal {
  background: var(--pb-color-primary-soft, #2563eb29);
  color: var(--pb-color-primary, #2563eb);
}
.pb-button.is-outlined {
  background: transparent;
  border-color: var(--pb-color-border, #d7dee8);
  color: var(--pb-color-on-surface, #1f2937);
}
.pb-button.tone-primary.is-outlined {
  border-color: var(--pb-color-primary, #2563eb);
  color: var(--pb-color-primary, #2563eb);
}
.pb-button.is-text {
  background: transparent;
  color: var(--pb-color-primary, #2563eb);
}
.pb-button.is-elevated {
  box-shadow: var(--pb-elevation-card, none);
}
.pb-button.is-disabled,
.pb-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
