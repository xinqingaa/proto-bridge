<script setup lang="ts">
defineProps<{
  label: string;
  tone?: "primary" | "secondary" | "success" | "warning" | "error";
  radius?: "sm" | "md" | "lg" | "full";
  elevated?: boolean;
}>();
</script>

<template>
  <span
    class="pb-chip"
    data-pb-id="ds.chip"
    :class="[
      `tone-${tone ?? 'primary'}`,
      `radius-${radius ?? 'full'}`,
      { 'is-elevated': elevated },
    ]"
  >
    {{ label }}
  </span>
</template>

<style scoped>
.pb-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 var(--pb-spacing-sm, 8px);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
.pb-chip.radius-sm {
  border-radius: var(--pb-radius-sm, 8px);
}
.pb-chip.radius-md {
  border-radius: var(--pb-radius-md, 12px);
}
.pb-chip.radius-lg {
  border-radius: var(--pb-radius-lg, 16px);
}
.pb-chip.radius-full {
  border-radius: var(--pb-radius-full, 999px);
}
.pb-chip.is-elevated {
  box-shadow: var(--pb-elevation-card, none);
}
.pb-chip.tone-primary {
  background: color-mix(in srgb, var(--pb-color-primary, #2563eb) 16%, transparent);
  color: var(--pb-color-primary, #2563eb);
}
.pb-chip.tone-secondary {
  background: color-mix(in srgb, var(--pb-color-secondary, #5b6b7c) 16%, transparent);
  color: var(--pb-color-secondary, #5b6b7c);
}
.pb-chip.tone-success {
  background: color-mix(in srgb, var(--pb-color-success, #167c4d) 16%, transparent);
  color: var(--pb-color-success, #167c4d);
}
.pb-chip.tone-warning {
  background: color-mix(in srgb, var(--pb-color-warning, #9a6700) 16%, transparent);
  color: var(--pb-color-warning, #9a6700);
}
.pb-chip.tone-error {
  background: color-mix(in srgb, var(--pb-color-error, #b42318) 16%, transparent);
  color: var(--pb-color-error, #b42318);
}
</style>
