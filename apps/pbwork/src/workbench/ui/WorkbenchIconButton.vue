<script setup lang="ts">
defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
    disabled?: boolean;
    tone?: "neutral" | "action" | "strong" | "danger" | "primary";
    size?: "small" | "medium" | "large";
  }>(),
  {
    active: false,
    disabled: false,
    tone: "neutral",
    size: "medium",
  },
);
defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
  <button
    v-bind="$attrs"
    type="button"
    class="wb-icon-button"
    :class="[`is-${tone}`, `is-${size}`, { 'is-active': active }]"
    :aria-label="label"
    :aria-pressed="active || undefined"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>

<style scoped>
.wb-icon-button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.58);
  cursor: pointer;
}
.wb-icon-button.is-small {
  width: 26px;
  height: 26px;
  border-radius: 6px;
}
.wb-icon-button.is-large {
  width: 36px;
  height: 36px;
  border-radius: 9px;
}
.wb-icon-button:hover {
  background: rgba(var(--v-theme-on-surface), 0.055);
  color: rgba(var(--v-theme-on-surface), 0.88);
}
.wb-icon-button.is-active {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
}
.wb-icon-button.is-action {
  color: rgb(var(--v-theme-action));
}
.wb-icon-button.is-primary {
  border-color: rgb(var(--v-theme-action));
  background: rgb(var(--v-theme-action));
  color: rgb(var(--v-theme-on-action));
}
.wb-icon-button.is-primary:hover {
  filter: brightness(1.08);
  background: rgb(var(--v-theme-action));
  color: rgb(var(--v-theme-on-action));
}
.wb-icon-button.is-primary:active:not(:disabled) {
  transform: scale(0.96);
}
.wb-icon-button.is-strong {
  border-color: rgb(var(--v-theme-on-surface));
  border-radius: 50%;
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
}
.wb-icon-button.is-strong:hover {
  background: rgba(var(--v-theme-on-surface), 0.84);
  color: rgb(var(--v-theme-surface));
}
.wb-icon-button.is-danger {
  color: rgb(var(--v-theme-error));
}
.wb-icon-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
