<script setup lang="ts">
/**
 * Decorative selection-material container shared by primary navigation.
 * It deliberately carries no semantic marker: the parent owns interaction,
 * selection, sizing, and motion.
 */
defineProps<{ active?: boolean }>();
</script>

<template>
  <span
    class="pb-liquid-glass"
    :class="{ 'is-active': active ?? true }"
    aria-hidden="true"
  >
    <span class="pb-liquid-glass__bridge" />
    <span class="pb-liquid-glass__surface" />
  </span>
</template>

<style scoped>
.pb-liquid-glass {
  position: absolute;
  inset: 0;
  z-index: 0;
  isolation: isolate;
  border-radius: var(--pb-tabs-selection-radius, inherit);
  pointer-events: none;
  opacity: 0;
  transition:
    opacity var(--pb-motion-duration-slow, 320ms)
      var(--pb-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1)),
    box-shadow var(--pb-motion-duration-slow, 320ms)
      var(--pb-motion-easing-standard, cubic-bezier(0.2, 0, 0, 1));
}
.pb-liquid-glass.is-active {
  opacity: var(--pb-tabs-selection-opacity);
}
.pb-liquid-glass__bridge {
  position: absolute;
  top: calc(var(--pb-tabs-selection-bridge-height) * -1);
  right: calc(var(--pb-tabs-selection-arc-inset) * -1);
  left: calc(var(--pb-tabs-selection-arc-inset) * -1);
  height: var(--pb-tabs-selection-bridge-height);
  border-radius: var(--pb-tabs-selection-arc-radius)
    var(--pb-tabs-selection-arc-radius) 0 0;
  z-index: 0;
  background: transparent;
}
.pb-liquid-glass__surface {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: var(--pb-tabs-selection-radius, inherit);
  background: var(--pb-tabs-selection-surface);
  box-shadow: var(--pb-tabs-selection-elevation);
  -webkit-backdrop-filter: blur(12px) saturate(1.06);
  backdrop-filter: blur(12px) saturate(1.06);
}
@media (prefers-reduced-motion: reduce) {
  .pb-liquid-glass {
    transition: none;
  }
}
</style>
