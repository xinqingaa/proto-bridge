<script setup lang="ts">
import { computed } from "vue";
import { useToken } from "@/design-system/theme/runtime-theme";
const props = defineProps<{
  active?: boolean;
  treatmentKey?:
    | "primary-tabs.selection-treatment"
    | "tabbar.surface-treatment"
    | "app-bar.surface-treatment";
  selection?: boolean;
  raised?: boolean;
}>();
const material = useToken(() => props.treatmentKey ?? "surface.treatment");
const classes = computed(() => ({
  "is-active": props.active ?? true,
  "is-selection": props.selection,
  [`is-${String(material.value)}`]: true,
}));
</script>

<template>
  <span class="pb-liquid-glass" :class="classes" aria-hidden="true">
    <span v-if="selection" class="pb-liquid-glass__bridge" />
    <span class="pb-liquid-glass__surface" />
  </span>
</template>

<style scoped>
.pb-liquid-glass {
  position: absolute;
  inset: var(--pb-layout-zero);
  z-index: var(--pb-layer-base);
  isolation: isolate;
  border-radius: inherit;
  pointer-events: none;
  opacity: var(--pb-opacity-hidden);
  transition:
    opacity var(--pb-motion-duration-long) var(--pb-motion-easing-standard),
    box-shadow var(--pb-motion-duration-long) var(--pb-motion-easing-standard);
}
.pb-liquid-glass.is-active {
  opacity: var(--pb-tabs-selection-opacity);
}
.pb-liquid-glass__bridge {
  position: absolute;
  top: var(--pb-tabs-selection-bridge-offset);
  right: var(--pb-tabs-selection-arc-offset);
  left: var(--pb-tabs-selection-arc-offset);
  height: var(--pb-tabs-selection-bridge-height);
  border-radius: var(--pb-tabs-selection-arc-radius)
    var(--pb-tabs-selection-arc-radius) var(--pb-layout-zero)
    var(--pb-layout-zero);
  z-index: var(--pb-layer-base);
  background: transparent;
}
.pb-liquid-glass__surface {
  position: absolute;
  inset: var(--pb-layout-zero);
  z-index: var(--pb-layer-content);
  border-radius: var(--pb-tabs-selection-radius);
  background: var(--pb-tabs-selection-surface);
  box-shadow: var(--pb-tabs-selection-elevation);
  -webkit-backdrop-filter: var(--pb-surface-glass-backdrop);
  backdrop-filter: var(--pb-surface-glass-backdrop);
}
.pb-liquid-glass.is-selection {
  border-radius: var(--pb-tabs-selection-radius);
}
.pb-liquid-glass:not(.is-selection) {
  opacity: var(--pb-opacity-visible);
}
.pb-liquid-glass:not(.is-selection) .pb-liquid-glass__surface {
  border-radius: inherit;
  background: var(--pb-color-surface);
  box-shadow: none;
}
.pb-liquid-glass.is-glass:not(.is-selection) .pb-liquid-glass__surface {
  opacity: var(--pb-opacity-translucent);
}
.pb-liquid-glass.is-outlined .pb-liquid-glass__surface {
  border: var(--pb-border-default);
}
.pb-liquid-glass:not(.is-glass) .pb-liquid-glass__surface {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.pb-liquid-glass.is-solid {
  opacity: var(--pb-opacity-visible);
}
.pb-liquid-glass.is-solid .pb-liquid-glass__surface {
  box-shadow: none;
}
@media (prefers-reduced-motion: reduce) {
  .pb-liquid-glass {
    transition: none;
  }
}
</style>
