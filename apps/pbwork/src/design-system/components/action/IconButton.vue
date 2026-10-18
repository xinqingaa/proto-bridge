<script setup lang="ts">
import GlassMaterial from "../_shared/GlassMaterial.vue";
import { sizeToken } from "@/design-system/components/_shared/appearance";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
import { themeConstantNumber } from "@/design-system/theme/constants";

import { computed, toRefs } from "vue";
import Icon from "@/design-system/components/action/Icon.vue";
import type { PbIconName } from "@/design-system/components/_shared/icons";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import {
  elevationStyle,
  type ComponentSize,
} from "@/design-system/components/_shared/appearance";
import { radiusStyle } from "@/design-system/components/_shared/radius";
const NO_ELEVATION = themeConstantNumber("layer.base");

const props = defineProps<{
  ariaLabel: string;
  icon?: PbIconName;
  size?: ComponentSize;
  tone?: "primary" | "secondary";
  variant?: "tonal" | "flat" | "outlined" | "text";
  material?: "solid" | "glass";
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
const iconName = computed((): PbIconName => icon.value ?? "more");

const visualSize = useTokenNumber(() => sizeToken(size.value ?? "md"));
const iconSize = computed((): ComponentSize => {
  if (size.value === "sm") return "sm";
  if (size.value === "lg") return "lg";
  return "md";
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
    material: props.material ?? "solid",
    loading: loading.value ?? false,
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => {
    const t = resolvedTone.value;
    const v = resolvedVariant.value;
    return {
      glassTint: "color.glass-tint",
      glassBackdrop: "surface.glass-backdrop",
      glassEdge: "border.glass",
      glassLight: "elevation.glass",
      glassFallback: "color.surface",
      glassFallbackBorder: "border.default",
      glassPrimaryTint: "icon-button.glass-primary-tint",
      glassOutline: "border.default",
      glassForeground: "color.on-surface",
      glassAccent: "color.primary",
      glassOnAccent: "color.on-primary",
      color: `color.${t}`,
      background: v === "tonal" ? `color.${t}-soft` : `color.${t}`,
      radius: "radius.pill",
      elevation: "none",
      size: sizeToken(size.value ?? "md"),
      target: "size.touch",
      duration: "motion.duration-short",
      easing: "motion.easing-standard",
      pressedScale: "motion.press-scale-strong",
      disabledOpacity: "opacity.disabled",
    };
  },
  getTokens: () => {
    const t = resolvedTone.value;
    const v = resolvedVariant.value;
    return [
      `color.${t}`,
      `color.${t}-soft`,
      "radius.pill",
      sizeToken(size.value ?? "md"),
      "size.touch",
      "motion.duration-short",
      "motion.easing-standard",
      "motion.press-scale-strong",
      "opacity.disabled",
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
    data-pb-role="button"
    icon
    :class="{
      'is-loading': loading ?? false,
      'is-glass': material === 'glass',
      'is-glass-accent': material === 'glass' && tone === 'primary',
      'is-glass-outlined':
        material === 'glass' && resolvedVariant === 'outlined',
    }"
    :width="visualSize"
    :height="visualSize"
    :color="resolvedTone"
    :variant="resolvedVariant"
    :loading="loading ?? false"
    :elevation="NO_ELEVATION"
    :aria-label="ariaLabel"
    :disabled="(disabled ?? false) || (loading ?? false)"
    rounded="circle"
    :style="[radiusStyle('full'), elevationStyle('none')]"
    @click="$emit('click')"
  >
    <GlassMaterial v-if="material === 'glass'" />
    <span class="pb-icon-button-foreground"
      ><Icon :name="iconName" :size="iconSize" tone="inherit"
    /></span>
  </v-btn>
</template>

<style scoped>
.pb-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--pb-size-touch) !important;
  min-height: var(--pb-size-touch) !important;
  box-shadow: var(--pb-component-shadow, var(--pb-elevation-none)) !important;
  transition:
    box-shadow var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-short) var(--pb-motion-easing-standard);
}
.pb-icon-button.is-glass {
  isolation: isolate;
  background: transparent !important;
  color: var(--pb-color-on-surface) !important;
  border: none;
  overflow: visible;
}
.pb-icon-button.is-glass-accent {
  --pb-glass-material-fallback: var(--pb-color-primary);
  --pb-glass-material-tint: var(--pb-icon-button-glass-primary-tint);
  color: var(--pb-color-on-primary) !important;
}
.pb-icon-button.is-glass-outlined {
  border: var(--pb-border-default);
}
.pb-icon-button-foreground {
  position: relative;
  display: inline-flex;
  z-index: var(--pb-layer-content);
  transform: translateZ(var(--pb-layout-zero));
}
.pb-icon-button:active:not(.v-btn--disabled) {
  transform: scale(var(--pb-motion-press-scale-strong));
}
.pb-icon-button.v-btn--disabled {
  opacity: var(--pb-opacity-disabled) !important;
}
</style>

<style scoped>
.pb-icon-button.is-loading.v-btn--disabled {
  opacity: var(--pb-opacity-visible) !important;
}
</style>

<style scoped>
.pb-icon-button :deep(.v-btn__content) {
  border-radius: inherit;
}
</style>
