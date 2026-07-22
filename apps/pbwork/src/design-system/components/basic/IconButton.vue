<script setup lang="ts">
import { computed, toRefs } from "vue";
import { MoreHorizontal, Plus, Search, Settings } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import {
  elevationStyle,
  type ComponentSize,
} from "@/design-system/components/_shared/appearance";
import { radiusStyle } from "@/design-system/components/_shared/radius";

const props = defineProps<{
  ariaLabel: string;
  icon?: "more" | "plus" | "search" | "settings";
  size?: ComponentSize;
  tone?: "primary" | "secondary";
  variant?: "tonal" | "flat" | "outlined" | "text";
  loading?: boolean;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.icon-button`. */
  inspectId?: string;
}>();
defineEmits<{ click: [] }>();

const rootRef = usePbInspectRef();
const { ariaLabel, icon, size, tone, variant, loading, disabled, inspectId } =
  toRefs(props);

const resolvedVariant = computed(() => variant.value ?? "tonal");
const resolvedTone = computed(() => tone.value ?? "secondary");

const iconComponent = computed(() => {
  if (props.icon === "plus") return Plus;
  if (props.icon === "search") return Search;
  if (props.icon === "settings") return Settings;
  return MoreHorizontal;
});

const visualSize = computed(() => {
  if (size.value === "sm") return 32;
  if (size.value === "lg") return 48;
  return 40;
});
const iconSize = computed(() => {
  if (size.value === "sm") return 16;
  if (size.value === "lg") return 24;
  return 20;
});

usePbInspect({
  element: rootRef,
  pbId: "ds.icon-button",
  instanceId: inspectId,
  componentId: "icon-button",
  getProps: () => ({
    ariaLabel: ariaLabel.value,
    icon: icon.value ?? "more",
    size: size.value ?? "md",
    tone: tone.value ?? "secondary",
    variant: resolvedVariant.value,
    loading: loading.value ?? false,
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => {
    const t = resolvedTone.value;
    const v = resolvedVariant.value;
    return {
      color: `color.${t}`,
      background: v === "tonal" ? `color.${t}-soft` : `color.${t}`,
      radius: "radius.full",
      elevation: "elevation.none",
      size: `sizing.control-${size.value ?? "md"}`,
      target: "sizing.touch",
      duration: "motion.duration-fast",
      easing: "motion.easing-standard",
    };
  },
  getTokens: () => {
    const t = resolvedTone.value;
    const v = resolvedVariant.value;
    return [
      `color.${t}`,
      `color.${t}-soft`,
      "radius.full",
      "elevation.none",
      `sizing.control-${size.value ?? "md"}`,
      "sizing.touch",
      "motion.duration-fast",
      "motion.easing-standard",
      ...(v === "flat" ? [`color.on-${t}`] : []),
    ];
  },
});
</script>

<template>
  <v-btn
    ref="rootRef"
    class="pb-icon-button"
    data-pb-id="ds.icon-button"
    icon
    :width="visualSize"
    :height="visualSize"
    :color="resolvedTone"
    :variant="resolvedVariant"
    :loading="loading ?? false"
    :elevation="0"
    :aria-label="ariaLabel"
    :disabled="disabled ?? false"
    rounded="circle"
    :style="[radiusStyle('full'), elevationStyle('none')]"
    @click="$emit('click')"
  >
    <component :is="iconComponent" :size="iconSize" />
  </v-btn>
</template>

<style scoped>
.pb-icon-button {
  min-width: var(--pb-sizing-touch, 44px) !important;
  min-height: var(--pb-sizing-touch, 44px) !important;
  box-shadow: var(--pb-component-shadow, none) !important;
  transition:
    box-shadow var(--pb-motion-duration-fast, 120ms)
      var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-fast, 120ms)
      var(--pb-motion-easing-standard);
}
.pb-icon-button:active:not(.v-btn--disabled) {
  transform: scale(0.96);
}
</style>
