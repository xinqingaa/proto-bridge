<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import {
  resolvePbIcon,
  type PbIconName,
} from "@/design-system/components/_shared/icons";
import type { ComponentSize } from "@/design-system/components/_shared/appearance";

const props = withDefaults(
  defineProps<{
    name: PbIconName;
    size?: ComponentSize;
    tone?:
      | "inherit"
      | "on-surface"
      | "muted"
      | "primary"
      | "action"
      | "error"
      | "success"
      | "warning";
    /** Decorative label for a11y when the icon is meaningful alone. */
    label?: string;
    /** Page-unique inspect / comment anchor; falls back to `ds.icon`. */
    inspectId?: string;
  }>(),
  {
    size: "md",
    tone: "inherit",
  },
);

const rootRef = usePbInspectRef();
const { name, size, tone, label, inspectId } = toRefs(props);

const iconComponent = computed(() => resolvePbIcon(name.value));

const pixelSize = computed(() => {
  if (size.value === "sm") return 16;
  if (size.value === "lg") return 28;
  return 20;
});

const colorVar = computed(() => {
  switch (tone.value) {
    case "on-surface":
      return "var(--pb-color-on-surface)";
    case "muted":
      return "var(--pb-color-on-surface-muted)";
    case "primary":
      return "var(--pb-color-primary)";
    case "action":
      return "var(--pb-color-action)";
    case "error":
      return "var(--pb-color-error)";
    case "success":
      return "var(--pb-color-success)";
    case "warning":
      return "var(--pb-color-warning)";
    default:
      return "currentColor";
  }
});

usePbInspect({
  element: rootRef,
  pbId: "ds.icon",
  instanceId: inspectId,
  componentId: "icon",
  semantic: false,
  getProps: () => ({
    name: name.value,
    size: size.value ?? "md",
    tone: tone.value ?? "inherit",
    label: label.value ?? "",
    inspectId: inspectId.value,
  }),
  getTokenBindings: () => ({
    size: `sizing.icon-${size.value === "sm" ? "sm" : size.value === "lg" ? "lg" : "md"}`,
    color:
      tone.value === "inherit" || tone.value === "on-surface"
        ? "color.on-surface"
        : tone.value === "muted"
          ? "color.on-surface-muted"
          : `color.${tone.value}`,
  }),
  getTokens: () => [
    `sizing.icon-${size.value === "sm" ? "sm" : size.value === "lg" ? "lg" : "md"}`,
    tone.value === "inherit" || tone.value === "on-surface"
      ? "color.on-surface"
      : tone.value === "muted"
        ? "color.on-surface-muted"
        : `color.${tone.value}`,
  ],
});
</script>

<template>
  <span
    ref="rootRef"
    class="pb-icon"
    :aria-hidden="label ? undefined : true"
    :aria-label="label || undefined"
    :role="label ? 'img' : undefined"
    :style="{
      color: colorVar,
      width: `${pixelSize}px`,
      height: `${pixelSize}px`,
    }"
  >
    <component :is="iconComponent" :size="pixelSize" aria-hidden="true" />
  </span>
</template>

<style scoped>
.pb-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  line-height: 0;
}
.pb-icon :deep(svg) {
  display: block;
}
</style>
