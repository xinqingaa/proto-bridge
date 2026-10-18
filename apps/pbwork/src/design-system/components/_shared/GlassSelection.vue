<template><span class="glass-selection" aria-hidden="true" /></template>
<style scoped>
.glass-selection {
  position: absolute;
  inset: var(--pb-layout-zero);
  pointer-events: none;
  border-radius: inherit;
  background: var(--pb-glass-selection-tint, var(--pb-color-glass-tint));
  border: var(--pb-glass-selection-border, var(--pb-border-glass));
  box-shadow: var(--pb-glass-selection-shadow, var(--pb-elevation-glass));
}
@media (prefers-reduced-transparency: reduce), (forced-colors: active) {
  .glass-selection {
    background: var(--pb-color-surface-selected);
    border: var(--pb-glass-selection-border, var(--pb-border-default));
  }
}
</style>

<style scoped>
@media (forced-colors: active) {
  .glass-selection {
    border: var(--pb-border-default);
  }
}
</style>
