<script setup lang="ts">
withDefaults(
  defineProps<{ label: string; active?: boolean; disabled?: boolean }>(),
  { active: false, disabled: false },
);
defineEmits<{ click: [event: MouseEvent] }>();
</script>

<template>
  <button
    type="button"
    class="wb-icon-button"
    :class="{ 'is-active': active }"
    :aria-label="label"
    :aria-pressed="active || undefined"
    :disabled="disabled"
    @click="$emit('click', $event)"
  ><slot /></button>
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
.wb-icon-button:hover { background: rgba(var(--v-theme-on-surface), 0.055); color: rgba(var(--v-theme-on-surface), 0.88); }
.wb-icon-button.is-active { border-color: rgba(var(--v-border-color), var(--v-border-opacity)); background: rgb(var(--v-theme-surface)); color: rgb(var(--v-theme-primary)); }
.wb-icon-button:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
