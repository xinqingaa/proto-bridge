<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?:
      | "neutral"
      | "comment"
      | "success"
      | "primary"
      | "warning"
      | "active"
      | "review"
      | "final"
      | "archived";
  }>(),
  { tone: "neutral" },
);
</script>

<template>
  <span class="wb-badge" :class="`is-${tone}`"><slot /></span>
</template>

<style scoped>
.wb-badge {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.07);
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1;
}
.wb-badge.is-comment {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 16%, transparent);
  color: color-mix(
    in srgb,
    rgb(var(--v-theme-warning)) 76%,
    rgb(var(--v-theme-on-surface))
  );
}
.wb-badge.is-success,
.wb-badge.is-final {
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 14%, transparent);
  color: rgb(var(--v-theme-success));
}
.wb-badge.is-primary,
.wb-badge.is-active {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent);
  color: rgb(var(--v-theme-primary));
}
.wb-badge.is-warning,
.wb-badge.is-review {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 15%, transparent);
  color: rgb(var(--v-theme-warning));
}
.wb-badge.is-archived {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.58);
}
</style>
