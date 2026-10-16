<script setup lang="ts">
export type SheetAction = { label: string; kind: "primary" | "quiet" | "danger" };

defineProps<{ title: string; text: string; actions: SheetAction[] }>();
</script>

<template>
  <div class="y-scrim">
    <section class="y-sheet" role="dialog" aria-modal="true" :aria-label="title">
      <span class="y-sheet-grip" aria-hidden="true" />
      <h3>{{ title }}</h3>
      <p>{{ text }}</p>
      <div class="y-sheet-actions">
        <button
          v-for="action in actions"
          :key="action.label"
          type="button"
          :class="`y-button is-${action.kind}`"
        >
          {{ action.label }}
        </button>
      </div>
    </section>
  </div>
</template>
