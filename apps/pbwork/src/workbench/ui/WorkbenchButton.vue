<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: "button" | "submit" | "reset";
    tone?: "primary" | "neutral" | "ghost" | "danger";
    disabled?: boolean;
    loading?: boolean;
  }>(),
  { type: "button", tone: "neutral", disabled: false, loading: false },
);

defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
  <button
    :type="type"
    class="wb-button"
    :class="`is-${tone}`"
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
.wb-button:hover { background: rgba(var(--v-theme-on-surface), 0.055); }
.wb-button.is-primary {
  border-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 55%, transparent);
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 13%, rgb(var(--v-theme-surface)));
  color: rgb(var(--v-theme-primary));
}
.wb-button.is-ghost { border-color: transparent; background: transparent; }
.wb-button.is-danger { border-color: transparent; background: transparent; color: rgb(var(--v-theme-error)); }
.wb-button:disabled { opacity: 0.48; cursor: not-allowed; }
.wb-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: wb-spin 700ms linear infinite;
}
@keyframes wb-spin { to { transform: rotate(360deg); } }
</style>
