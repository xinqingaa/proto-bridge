<script setup lang="ts">
/**
 * Decorative selection surface shared by primary navigation.
 * It deliberately carries no semantic marker: the parent owns the interaction.
 */
defineProps<{ active?: boolean }>();
</script>

<template>
  <span
    class="pb-liquid-glass"
    :class="{ 'is-active': active ?? true }"
    aria-hidden="true"
  />
</template>

<style scoped>
.pb-liquid-glass {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--pb-tabs-selection-surface);
  box-shadow: var(--pb-tabs-selection-elevation);
  -webkit-backdrop-filter: blur(12px) saturate(1.06);
  backdrop-filter: blur(12px) saturate(1.06);
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
@media (prefers-reduced-motion: reduce) {
  .pb-liquid-glass {
    transition: none;
  }
}
</style>
