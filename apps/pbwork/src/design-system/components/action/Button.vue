<script setup lang="ts">
import GlassMaterial from "../_shared/GlassMaterial.vue";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
import { themeConstantNumber } from "@/design-system/theme/constants";

import { computed, toRefs, useSlots } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import {
  controlPaddingToken,
  controlSizeStyle,
  elevationStyle,
  sizeToken,
  type ComponentSize,
} from "@/design-system/components/_shared/appearance";
import {
  colorTokenCss,
  resolveButtonColorsFromKind,
  resolveButtonKind,
  type ButtonKind,
} from "@/design-system/components/_shared/colorTokens";
const NO_ELEVATION = themeConstantNumber("layer.base");
const LOADER_SIZE = useTokenNumber("size.icon-inline");
const LOADER_STROKE = useTokenNumber("size.stroke");

const props = defineProps<{
  label: string;
  /** 中性主要/次要/描边，或强调/危险/轻量操作。默认主要类型。 */
  kind?: ButtonKind;
  material?: "solid" | "glass";
  size?: ComponentSize;
  shape?: "rounded" | "pill";
  loading?: boolean;
  block?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  /** Page-unique inspect / comment anchor; falls back to `ds.button`. */
  inspectId?: string;
}>();
defineEmits<{ click: [] }>();

const rootRef = usePbInspectRef();
const slots = useSlots();
const { label, kind, size, loading, block, disabled, type, inspectId } =
  toRefs(props);

const resolvedSize = computed(() => size.value ?? "md");
const resolvedKind = computed(() => resolveButtonKind(kind.value));
const colors = computed(() => resolveButtonColorsFromKind(resolvedKind.value));
const isUnavailable = computed(
  () => Boolean(disabled.value) || Boolean(loading.value),
);

const buttonStyle = computed(() => ({
  ...radiusStyle(props.shape === "pill" ? "full" : "md"),
  ...controlSizeStyle(resolvedSize.value),
  ...elevationStyle("none"),
  "--pb-btn-bg": colorTokenCss(colors.value.bgColor),
  "--pb-btn-border": colorTokenCss(colors.value.borderColor),
  "--pb-btn-fg": colorTokenCss(colors.value.textColor),
}));

usePbInspect({
  element: rootRef,
  pbId: "ds.button",
  instanceId: inspectId,
  componentId: "button",
  getProps: () => ({
    label: label.value,
    kind: resolvedKind.value,
    material: props.material ?? "solid",
    size: size.value ?? "md",
    shape: props.shape ?? "rounded",
    loading: loading.value ?? false,
    block: block.value ?? false,
    disabled: disabled.value ?? false,
    type: type.value ?? "button",
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => {
    const s = resolvedSize.value;
    return {
      glassTint: "color.glass-tint",
      glassBackdrop: "surface.glass-backdrop",
      glassEdge: "border.glass",
      glassLight: "elevation.glass",
      glassFallback: "color.surface",
      glassFallbackBorder: "border.default",
      glassPrimaryTint: "button.glass-primary-tint",
      glassOutline: "border.default",
      glassSecondary: "color.on-surface",
      background: colors.value.bgColor,
      border: colors.value.borderColor,
      onBackground: colors.value.textColor,
      radius: props.shape === "pill" ? "radius.pill" : "radius.control",
      elevation: "none",
      height: sizeToken(s),
      paddingX: controlPaddingToken(s),
      typography: "typography.label",
      tracking: "tracking.label",
      actionMinInline: "size.action-min-inline",
      disabledOpacity: "opacity.disabled",
      borderWidth: "border.width",
      duration: "motion.duration-short",
      easing: "motion.easing-standard",
      pressedScale: "motion.press-scale",
      labelOffset: "spacing.xxs",
      loaderSize: "size.icon-inline",
      loaderStroke: "size.stroke",
    };
  },
  getTokens: () => {
    const s = resolvedSize.value;
    return [
      colors.value.bgColor,
      colors.value.borderColor,
      colors.value.textColor,
      "radius.control",
      "radius.pill",
      sizeToken(s),
      controlPaddingToken(s),
      "typography.label",
      "tracking.label",
      "size.action-min-inline",
      "opacity.disabled",
      "border.width",
      "motion.duration-short",
      "motion.easing-standard",
      "motion.press-scale",
      "spacing.xxs",
      "size.icon-inline",
      "size.stroke",
    ];
  },
});
</script>

<template>
  <v-btn
    ref="rootRef"
    class="pb-button"
    data-pb-id="ds.button"
    data-pb-role="button"
    :type="type ?? 'button'"
    variant="flat"
    rounded="md"
    :block="block ?? false"
    :elevation="NO_ELEVATION"
    :disabled="isUnavailable"
    :aria-busy="loading ? 'true' : undefined"
    :aria-label="slots.default ? undefined : label"
    :class="{
      'is-loading': loading ?? false,
      'is-glass': material === 'glass',
      ['kind-' + resolvedKind]: true,
    }"
    :style="buttonStyle"
    @click="$emit('click')"
  >
    <GlassMaterial v-if="material === 'glass'" />
    <span class="pb-button-foreground">
      <span v-if="loading" class="pb-button__loader" aria-hidden="true">
        <v-progress-circular
          indeterminate
          :size="LOADER_SIZE"
          :width="LOADER_STROKE"
          :color="undefined"
        />
      </span>
      <slot
        ><span class="pb-button-label"
          ><Transition name="pb-button-label"
            ><span :key="label">{{ label }}</span></Transition
          ></span
        ></slot
      >
    </span>
    <template v-if="slots.prepend" #prepend><slot name="prepend" /></template>
    <template v-if="slots.append" #append><slot name="append" /></template>
  </v-btn>
</template>

<style scoped>
.pb-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--pb-component-height, var(--pb-size-control)) !important;
  min-height: var(--pb-component-height, var(--pb-size-control)) !important;
  padding-inline: var(
    --pb-component-padding-x,
    var(--pb-spacing-md)
  ) !important;
  border: var(--pb-border-width) solid var(--pb-btn-border) !important;
  background: var(--pb-btn-bg) !important;
  color: var(--pb-btn-fg) !important;
  font: var(--pb-typography-label);
  text-transform: none;
  letter-spacing: var(--pb-tracking-label);
  box-shadow: var(--pb-component-shadow, var(--pb-elevation-none)) !important;
  transition:
    background-color var(--pb-motion-duration-short)
      var(--pb-motion-easing-standard),
    border-color var(--pb-motion-duration-short)
      var(--pb-motion-easing-standard),
    color var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    box-shadow var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    opacity var(--pb-motion-duration-short) var(--pb-motion-easing-standard);
}
.pb-button :deep(.v-btn__overlay),
.pb-button :deep(.v-btn__underlay) {
  opacity: var(--pb-opacity-hidden) !important;
}
.pb-button :deep(.v-btn__content) {
  gap: var(--pb-spacing-xs);
  color: inherit;
}
.pb-button.is-glass {
  isolation: isolate;
  background: transparent !important;
  border-color: transparent !important;
  overflow: visible;
  color: var(--pb-color-on-surface) !important;
}
.pb-button.is-glass.kind-primary {
  --pb-glass-material-fallback: var(--pb-color-action);
  --pb-glass-material-tint: var(--pb-button-glass-primary-tint);
  color: var(--pb-color-on-action) !important;
}
.pb-button.is-glass.kind-outlined {
  border: var(--pb-border-default) !important;
}
.pb-button-foreground,
.pb-button :deep(.v-btn__prepend),
.pb-button :deep(.v-btn__append) {
  position: relative;
  z-index: var(--pb-layer-content);
  transform: translateZ(var(--pb-layout-zero));
}
.pb-button-foreground {
  display: inline-flex;
  align-items: center;
  gap: var(--pb-spacing-xs);
}
.pb-button__loader {
  display: inline-flex;
  flex: none;
  align-items: center;
  color: inherit;
}
.pb-button__loader :deep(.v-progress-circular) {
  color: currentColor;
}
.pb-button-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.pb-button-label-enter-active,
.pb-button-label-leave-active {
  transition:
    opacity var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-short) var(--pb-motion-easing-standard);
}
.pb-button-label-leave-active {
  position: absolute;
}
.pb-button-label-enter-from {
  opacity: var(--pb-opacity-hidden);
  transform: translateY(var(--pb-spacing-xxs));
}
.pb-button-label-leave-to {
  opacity: var(--pb-opacity-hidden);
  transform: translateY(var(--pb-layout-inset-xs-negative));
}
.pb-button:active:not(.v-btn--disabled) {
  transform: scale(var(--pb-motion-press-scale));
}
.pb-button.v-btn--disabled {
  opacity: var(--pb-opacity-disabled) !important;
}
.pb-button.is-loading.v-btn--disabled {
  opacity: var(--pb-opacity-visible) !important;
}
@media (prefers-reduced-motion: reduce) {
  .pb-button,
  .pb-button-label-enter-active,
  .pb-button-label-leave-active {
    transition: none;
  }
  .pb-button:active:not(.v-btn--disabled) {
    transform: none;
  }
}
</style>

<style scoped>
.pb-button :deep(.v-btn__content) {
  border-radius: inherit;
}
</style>

<style scoped>
.pb-button.kind-accent {
  min-inline-size: var(--pb-size-action-min-inline);
}
.pb-button.is-glass.kind-accent {
  --pb-glass-material-fallback: var(--pb-color-primary);
  --pb-glass-material-tint: var(--pb-color-primary);
  color: var(--pb-color-on-primary) !important;
}
.pb-button.is-glass.kind-danger {
  color: var(--pb-color-error) !important;
  border-color: var(--pb-color-error) !important;
}
.pb-button.is-glass.kind-quiet {
  color: var(--pb-color-on-surface-muted) !important;
}
</style>
