<script setup lang="ts">
defineProps<{ modelValue: boolean; label: string }>();
defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>
<template>
  <button
    class="wb-switch"
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="switch-label">{{ label }}</span>
    <span class="switch-track" aria-hidden="true"
      ><span class="switch-thumb"
    /></span>
  </button>
</template>
<style scoped>
.wb-switch {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 4px 2px;
  border: 0;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.56);
}
.switch-label {
  font-size: 11px;
  line-height: 1.4;
}
.switch-track {
  display: block;
  position: relative;
  width: 28px;
  height: 16px;
  border-radius: 16px;
  background: rgba(var(--v-theme-on-surface), 0.18);
  transition: background 0.15s ease;
}
.switch-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  transition: transform 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}
.wb-switch[aria-checked="true"] .switch-track {
  background: rgb(var(--v-theme-primary));
}
.wb-switch[aria-checked="true"] .switch-thumb {
  transform: translateX(12px);
}
.wb-switch:hover {
  color: rgba(var(--v-theme-on-surface), 0.85);
}
.wb-switch:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .switch-track,
  .switch-thumb {
    transition: none;
  }
}
</style>
