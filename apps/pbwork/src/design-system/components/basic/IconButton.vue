<script setup lang="ts">
import { computed } from "vue";
import { MoreHorizontal, Plus, Search, Settings } from "lucide-vue-next";

const props = defineProps<{
  ariaLabel: string;
  icon?: "more" | "plus" | "search" | "settings";
  size?: "sm" | "md";
  tone?: "primary" | "secondary" | "neutral";
  elevated?: boolean;
  disabled?: boolean;
}>();
defineEmits<{ click: [] }>();

const iconComponent = computed(() => {
  if (props.icon === "plus") return Plus;
  if (props.icon === "search") return Search;
  if (props.icon === "settings") return Settings;
  return MoreHorizontal;
});
</script>

<template>
  <button
    type="button"
    class="pb-icon-button"
    data-pb-id="ds.icon-button"
    :class="[
      `size-${size ?? 'md'}`,
      `tone-${tone ?? 'neutral'}`,
      { 'is-elevated': elevated },
    ]"
    :aria-label="ariaLabel"
    :disabled="disabled ?? false"
    @click="$emit('click')"
  >
    <component :is="iconComponent" :size="size === 'sm' ? 16 : 18" />
  </button>
</template>

<style scoped>
.pb-icon-button {
  display: inline-grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--pb-radius-full, 999px);
  background: transparent;
  color: var(--pb-color-on-surface, #1f2937);
  cursor: pointer;
}
.pb-icon-button.size-sm {
  width: 32px;
  height: 32px;
}
.pb-icon-button.size-md {
  width: 40px;
  height: 40px;
}
.pb-icon-button.tone-primary {
  color: var(--pb-color-primary, #2563eb);
  background: color-mix(in srgb, var(--pb-color-primary, #2563eb) 12%, transparent);
}
.pb-icon-button.tone-secondary {
  color: var(--pb-color-secondary, #5b6b7c);
}
.pb-icon-button.is-elevated {
  box-shadow: var(--pb-elevation-card, none);
  background: var(--pb-color-surface, #fff);
}
.pb-icon-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
