<script setup lang="ts">
import { computed, toRefs } from "vue";
import { MoreHorizontal, Plus, Search, Settings } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import {
  elevationStyle,
  elevationToken,
  type ComponentElevation,
  type ComponentSize,
} from "@/design-system/components/_shared/appearance";
import {
  radiusStyle,
  type RadiusSize,
} from "@/design-system/components/_shared/radius";

const props = defineProps<{
  ariaLabel: string;
  icon?: "more" | "plus" | "search" | "settings";
  size?: ComponentSize;
  tone?: "primary" | "secondary" | "neutral";
  variant?: "tonal" | "flat" | "outlined" | "text";
  radius?: RadiusSize;
  elevation?: ComponentElevation;
  loading?: boolean;
  /** @deprecated Use elevation instead. */
  elevated?: boolean;
  disabled?: boolean;
}>();
defineEmits<{ click: [] }>();

const rootRef = usePbInspectRef();
const {
  ariaLabel,
  icon,
  size,
  tone,
  variant,
  radius,
  elevation,
  elevated,
  loading,
  disabled,
} = toRefs(props);

const resolvedElevation = computed<ComponentElevation>(
  () => elevation.value ?? (elevated.value ? "card" : "none"),
);
const resolvedVariant = computed(() => variant.value ?? "tonal");

const iconComponent = computed(() => {
  if (props.icon === "plus") return Plus;
  if (props.icon === "search") return Search;
  if (props.icon === "settings") return Settings;
  return MoreHorizontal;
});

const color = computed(() => {
  const t = tone.value ?? "neutral";
  if (t === "neutral") return "secondary";
  return t;
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
  componentId: "icon-button",
  getProps: () => ({
    ariaLabel: ariaLabel.value,
    icon: icon.value ?? "more",
    size: size.value ?? "md",
    tone: tone.value ?? "neutral",
    variant: resolvedVariant.value,
    radius: radius.value ?? "full",
    elevation: resolvedElevation.value,
    loading: loading.value ?? false,
    disabled: disabled.value ?? false,
  }),
  getTokenBindings: () => {
    const t = tone.value ?? "neutral";
    return {
      color: t === "neutral" ? "color.on-surface" : `color.${t}`,
      background: t === "neutral" ? "color.surface-variant" : `color.${t}-soft`,
      radius: `radius.${radius.value ?? "full"}`,
      elevation: elevationToken(resolvedElevation.value),
      size: `sizing.control-${size.value ?? "md"}`,
    };
  },
  getTokens: () => [
    "color.primary",
    "color.primary-soft",
    "color.secondary",
    "color.on-surface",
    "color.surface-variant",
    `radius.${radius.value ?? "full"}`,
    elevationToken(resolvedElevation.value),
    `sizing.control-${size.value ?? "md"}`,
    "sizing.touch",
  ],
});
</script>

<template>
  <v-btn
    ref="rootRef"
    class="pb-icon-button"
    data-pb-id="ds.icon-button"
    :class="[`tone-${tone ?? 'neutral'}`]"
    icon
    :width="visualSize"
    :height="visualSize"
    :color="color"
    :variant="resolvedVariant"
    :loading="loading ?? false"
    :elevation="0"
    :aria-label="ariaLabel"
    :disabled="disabled ?? false"
    :rounded="(radius ?? 'full') === 'full' ? 'circle' : (radius ?? 'md')"
    :style="[radiusStyle(radius ?? 'full'), elevationStyle(resolvedElevation)]"
    @click="$emit('click')"
  >
    <component :is="iconComponent" :size="iconSize" />
  </v-btn>
</template>

<style scoped>
.pb-icon-button {
  min-width: var(--pb-sizing-touch, 44px) !important;
  min-height: var(--pb-sizing-touch, 44px) !important;
  transition:
    box-shadow var(--pb-motion-duration-fast, 120ms)
      var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-fast, 120ms)
      var(--pb-motion-easing-standard);
}
.pb-icon-button:active:not(.v-btn--disabled) {
  transform: scale(0.94);
}
.pb-icon-button.tone-neutral {
  color: var(--pb-color-on-surface, #1f2937);
  background: var(--pb-color-surface-variant) !important;
}
</style>
