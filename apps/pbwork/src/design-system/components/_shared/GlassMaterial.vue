<script setup lang="ts">
defineProps<{ clear?: boolean }>();
</script>
<template>
  <span
    class="glass-material"
    :class="{ 'is-clear': clear }"
    aria-hidden="true"
  />
</template>
<style scoped>
.glass-material {
  position: absolute;
  inset: var(--pb-layout-zero);
  border-radius: inherit;
  pointer-events: none;
  background: var(--pb-glass-material-tint, var(--pb-color-glass-tint));
  border: var(--pb-glass-material-border, var(--pb-border-glass));
  box-shadow: var(--pb-glass-material-shadow, var(--pb-elevation-glass));
  backdrop-filter: var(--pb-surface-glass-backdrop);
  -webkit-backdrop-filter: var(--pb-surface-glass-backdrop);
}
.glass-material.is-clear {
  background: var(--pb-color-glass-clear);
}
@supports not ((backdrop-filter: none) or (-webkit-backdrop-filter: none)) {
  .glass-material,
  .glass-material.is-clear {
    background: var(--pb-glass-material-fallback, var(--pb-color-surface));
    border: var(--pb-border-default);
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}
@media (prefers-reduced-transparency: reduce), (forced-colors: active) {
  .glass-material,
  .glass-material.is-clear {
    background: var(--pb-glass-material-fallback, var(--pb-color-surface));
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border: var(--pb-border-default);
  }
}
</style>
