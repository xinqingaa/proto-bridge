<script setup lang="ts">
import { computed, toRefs, useSlots } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import {
  controlSizeStyle,
  elevationStyle,
  type ComponentSize,
} from "@/design-system/components/_shared/appearance";

const props = defineProps<{
  label: string;
  variant?: "flat" | "tonal" | "outlined" | "text";
  tone?: "primary" | "secondary" | "error" | "success";
  size?: ComponentSize;
  loading?: boolean;
  block?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}>();
defineEmits<{ click: [] }>();

const rootRef = usePbInspectRef();
const slots = useSlots();
const { label, variant, tone, size, loading, block, disabled, type } =
  toRefs(props);

const vuetifySize = computed(() => {
  if (size.value === "sm") return "small";
  if (size.value === "lg") return "large";
  return "default";
});

usePbInspect({
  element: rootRef,
  pbId: "ds.button",
  componentId: "button",
  getProps: () => ({
    label: label.value,
    variant: variant.value ?? "flat",
    tone: tone.value ?? "primary",
    size: size.value ?? "md",
    loading: loading.value ?? false,
    block: block.value ?? false,
    disabled: disabled.value ?? false,
    type: type.value ?? "button",
  }),
  getTokenBindings: () => {
    const t = tone.value ?? "primary";
    const v = variant.value ?? "flat";
    return {
      background: v === "tonal" ? `color.${t}-soft` : `color.${t}`,
      onBackground: `color.on-${t}`,
      radius: "radius.md",
      elevation: "elevation.none",
      height: `sizing.control-${size.value ?? "md"}`,
      typography: "typography.label",
      duration: "motion.duration-fast",
      easing: "motion.easing-standard",
    };
  },
  getTokens: () => {
    const t = tone.value ?? "primary";
    const v = variant.value ?? "flat";
    return [
      v === "tonal" ? `color.${t}-soft` : `color.${t}`,
      `color.on-${t}`,
      "radius.md",
      "elevation.none",
      `sizing.control-${size.value ?? "md"}`,
      "typography.label",
      "motion.duration-fast",
      "motion.easing-standard",
    ];
  },
});
</script>

<template>
  <v-btn
    ref="rootRef"
    class="pb-button"
    data-pb-id="ds.button"
    :type="type ?? 'button'"
    :variant="variant ?? 'flat'"
    :color="tone ?? 'primary'"
    rounded="md"
    :size="vuetifySize"
    :loading="loading ?? false"
    :block="block ?? false"
    :elevation="0"
    :disabled="disabled ?? false"
    :style="[
      radiusStyle('md'),
      controlSizeStyle(size ?? 'md'),
      elevationStyle('none'),
    ]"
    @click="$emit('click')"
  >
    <template v-if="slots.prepend" #prepend><slot name="prepend" /></template>
    <slot>{{ label }}</slot>
    <template v-if="slots.append" #append><slot name="append" /></template>
  </v-btn>
</template>

<style scoped>
.pb-button {
  min-height: var(--pb-component-height, var(--pb-sizing-control-md, 40px));
  font: var(--pb-typography-label, 600 14px/1.4 Inter, system-ui, sans-serif);
  text-transform: none;
  letter-spacing: normal;
  box-shadow: var(--pb-component-shadow, none) !important;
  transition:
    box-shadow var(--pb-motion-duration-fast, 120ms)
      var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-fast, 120ms)
      var(--pb-motion-easing-standard);
}
.pb-button:active:not(.v-btn--disabled) {
  transform: scale(0.98);
}
</style>
