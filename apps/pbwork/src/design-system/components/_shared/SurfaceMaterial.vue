<script setup lang="ts">
import { computed } from "vue";
import GlassMaterial from "./GlassMaterial.vue";
import { useToken } from "@/design-system/theme/runtime-theme";
const props = defineProps<{
  active?: boolean;
  treatmentKey?:
    | "primary-tabs.selection-treatment"
    | "tabbar.surface-treatment"
    | "app-bar.surface-treatment";
  selection?: boolean;
  raised?: boolean;
  treatment?: "solid" | "outlined" | "glass";
}>();
const theme = useToken(() => props.treatmentKey ?? "surface.treatment");
const material = computed(() => props.treatment ?? String(theme.value));
</script>
<template>
  <span
    class="pb-liquid-glass"
    :class="[
      `is-${material}`,
      { 'is-selection': selection, 'is-active': active ?? true },
    ]"
    aria-hidden="true"
    ><GlassMaterial
      v-if="material === 'glass'"
      class="pb-liquid-glass__surface" /><span
      v-else
      class="solid-plane pb-liquid-glass__surface"
  /></span>
</template>
<style scoped>
.pb-liquid-glass {
  position: absolute;
  inset: var(--pb-layout-zero);
  z-index: var(--pb-layer-base);
  border-radius: inherit;
  pointer-events: none;
  opacity: var(--pb-opacity-visible);
}
.pb-liquid-glass.is-selection {
  border-radius: var(--pb-tabs-selection-radius);
  opacity: var(--pb-opacity-hidden);
  transition: opacity var(--pb-motion-duration-long)
    var(--pb-motion-easing-standard);
}
.pb-liquid-glass.is-selection.is-active {
  opacity: var(--pb-tabs-selection-opacity);
}
.pb-liquid-glass.is-selection.is-glass {
  background: var(--pb-tabs-selection-surface);
}
.pb-liquid-glass.is-selection.is-active.is-glass {
  opacity: var(--pb-opacity-visible);
}
.solid-plane {
  position: absolute;
  inset: var(--pb-layout-zero);
  border-radius: inherit;
  background: var(--pb-color-surface);
}
.is-selection .solid-plane {
  background: var(--pb-tabs-selection-surface);
  box-shadow: var(--pb-tabs-selection-elevation);
}
.is-outlined .solid-plane {
  border: var(--pb-border-default);
}
@media (prefers-reduced-motion: reduce) {
  .pb-liquid-glass.is-selection {
    transition: none;
  }
}
</style>
