<script setup lang="ts">
defineProps<{
  /** Primary figure (count / short value). */
  value?: string | number;
  /** Secondary caption beside value. */
  label?: string;
}>();
</script>

<template>
  <div class="wb-stat-chip">
    <template v-if="value != null || label">
      <strong v-if="value != null">{{ value }}</strong>
      <span v-if="label">{{ label }}</span>
    </template>
    <slot v-else />
  </div>
</template>

<style scoped>
.wb-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
}
.wb-stat-chip strong {
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgba(var(--v-theme-on-surface), 0.88);
}
.wb-stat-chip span {
  font-weight: 650;
  color: rgba(var(--v-theme-on-surface), 0.58);
}
</style>
