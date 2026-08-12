<script setup lang="ts">
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
  resolveButtonColors,
} from "@/design-system/components/_shared/colorTokens";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const NO_ELEVATION = tokenDefaultNumber("layer.base");
const LOADER_SIZE = tokenDefaultNumber("sizing.icon-sm");
const LOADER_STROKE = tokenDefaultNumber("sizing.progress-stroke");

const props = defineProps<{
  label: string;
  /** Background Token-ref (Bind color id or transparent). */
  bgColor?: string;
  /** Border Token-ref; defaults to bgColor. */
  borderColor?: string;
  /** Foreground Token-ref; defaults from bgColor pairing. */
  textColor?: string;
  size?: ComponentSize;
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
const {
  label,
  bgColor,
  borderColor,
  textColor,
  size,
  loading,
  block,
  disabled,
  type,
  inspectId,
} = toRefs(props);

const resolvedSize = computed(() => size.value ?? "md");
const colors = computed(() =>
  resolveButtonColors({
    ...(bgColor.value !== undefined ? { bgColor: bgColor.value } : {}),
    ...(borderColor.value !== undefined
      ? { borderColor: borderColor.value }
      : {}),
    ...(textColor.value !== undefined ? { textColor: textColor.value } : {}),
  }),
);
const isUnavailable = computed(
  () => Boolean(disabled.value) || Boolean(loading.value),
);

const buttonStyle = computed(() => ({
  ...radiusStyle("md"),
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
    bgColor: colors.value.bgColor,
    borderColor: colors.value.borderColor,
    textColor: colors.value.textColor,
    size: size.value ?? "md",
    loading: loading.value ?? false,
    block: block.value ?? false,
    disabled: disabled.value ?? false,
    type: type.value ?? "button",
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => {
    const s = resolvedSize.value;
    return {
      background: colors.value.bgColor,
      border: colors.value.borderColor,
      onBackground: colors.value.textColor,
      radius: "radius.md",
      elevation: "elevation.none",
      height: sizeToken(s),
      paddingX: controlPaddingToken(s),
      typography: "typography.label",
      disabledOpacity: "opacity.disabled",
      overlayOpacity: "opacity.hidden",
      loadingOpacity: "opacity.visible",
      borderWidth: "border.width-hairline",
      duration: "motion.duration-fast",
      easing: "motion.easing-standard",
      pressedScale: "motion.scale-pressed",
      loaderSize: "sizing.icon-sm",
      loaderStroke: "sizing.progress-stroke",
    };
  },
  getTokens: () => {
    const s = resolvedSize.value;
    return [
      colors.value.bgColor,
      colors.value.borderColor,
      colors.value.textColor,
      "radius.md",
      "elevation.none",
      sizeToken(s),
      controlPaddingToken(s),
      "typography.label",
      "opacity.disabled",
      "opacity.hidden",
      "opacity.visible",
      "border.width-hairline",
      "motion.duration-fast",
      "motion.easing-standard",
      "motion.scale-pressed",
      "sizing.icon-sm",
      "sizing.progress-stroke",
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
    :class="{ 'is-loading': loading ?? false }"
    :style="buttonStyle"
    @click="$emit('click')"
  >
    <span v-if="loading" class="pb-button__loader" aria-hidden="true">
      <v-progress-circular
        indeterminate
        :size="LOADER_SIZE"
        :width="LOADER_STROKE"
        :color="undefined"
      />
    </span>
    <template v-if="slots.prepend" #prepend><slot name="prepend" /></template>
    <slot>{{ label }}</slot>
    <template v-if="slots.append" #append><slot name="append" /></template>
  </v-btn>
</template>

<style scoped>
.pb-button {
  height: var(--pb-component-height, var(--pb-sizing-control-md)) !important;
  min-height: var(
    --pb-component-height,
    var(--pb-sizing-control-md)
  ) !important;
  padding-inline: var(
    --pb-component-padding-x,
    var(--pb-spacing-md)
  ) !important;
  border: var(--pb-border-width-hairline) solid var(--pb-btn-border) !important;
  background: var(--pb-btn-bg) !important;
  color: var(--pb-btn-fg) !important;
  font: var(--pb-typography-label);
  text-transform: none;
  letter-spacing: normal;
  box-shadow: var(--pb-component-shadow, var(--pb-elevation-none)) !important;
  transition:
    box-shadow var(--pb-motion-duration-fast) var(--pb-motion-easing-standard),
    transform var(--pb-motion-duration-fast) var(--pb-motion-easing-standard),
    opacity var(--pb-motion-duration-fast) var(--pb-motion-easing-standard);
}
.pb-button :deep(.v-btn__overlay),
.pb-button :deep(.v-btn__underlay) {
  opacity: var(--pb-opacity-hidden) !important;
}
.pb-button :deep(.v-btn__content) {
  gap: var(--pb-spacing-xs);
  color: inherit;
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
.pb-button:active:not(.v-btn--disabled) {
  transform: scale(var(--pb-motion-scale-pressed));
}
.pb-button.v-btn--disabled {
  opacity: var(--pb-opacity-disabled) !important;
}
.pb-button.is-loading.v-btn--disabled {
  opacity: var(--pb-opacity-visible) !important;
}
</style>
