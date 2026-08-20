<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    tone?: "primary" | "neutral" | "ghost" | "danger";
    size?: "small" | "medium";
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    type: "button",
    tone: "neutral",
    size: "medium",
    disabled: false,
    loading: false,
  },
);

defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
  <button
    :type="type"
    class="wb-button"
    :class="[`is-${tone}`, `is-${size}`]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="wb-spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.wb-button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 7px;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.82);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}
.wb-button.is-small {
  min-height: 28px;
  padding-inline: 9px;
  font-size: 0.6875rem;
}
.wb-button:hover {
  background: rgba(var(--v-theme-on-surface), 0.055);
}
.wb-button.is-primary {
  border-color: rgb(var(--v-theme-action));
  background: rgb(var(--v-theme-action));
  color: rgb(var(--v-theme-on-action));
}
.wb-button.is-primary:hover {
  filter: brightness(1.08);
}
.wb-button:active:not(:disabled) {
  transform: scale(0.98);
}
.wb-button.is-ghost {
  border-color: transparent;
  background: transparent;
}
.wb-button.is-danger {
  border-color: transparent;
  background: transparent;
  color: rgb(var(--v-theme-error));
}
.wb-button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}
.wb-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: wb-spin 700ms linear infinite;
}
@keyframes wb-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
