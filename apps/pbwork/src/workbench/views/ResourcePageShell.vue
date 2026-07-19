<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
  /** Optional right-rail detail; collapses under content below 1280px. */
  withAside?: boolean;
}>();
</script>

<template>
  <section
    class="resource-page"
    :class="{ 'has-aside': withAside }"
    data-testid="resource-page-shell"
  >
    <header class="resource-header">
      <div class="resource-intro">
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p v-if="description" class="description">{{ description }}</p>
      </div>
      <div v-if="$slots.stats" class="resource-stats">
        <slot name="stats" />
      </div>
    </header>

    <div v-if="$slots.toolbar" class="resource-toolbar">
      <slot name="toolbar" />
    </div>

    <div class="resource-body">
      <div class="resource-main">
        <slot />
      </div>
      <aside v-if="withAside && $slots.aside" class="resource-aside">
        <slot name="aside" />
      </aside>
    </div>
  </section>
</template>

<style scoped>
.resource-page {
  width: 100%;
  max-width: 1440px;
  display: grid;
  gap: 20px;
}

.resource-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px 24px;
  align-items: start;
}

.eyebrow {
  margin: 0 0 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}

.resource-intro h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
  line-height: 1.2;
}

.description {
  margin: 0;
  max-width: 62ch;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.875rem;
  line-height: 1.5;
}

.resource-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.resource-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

.resource-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.resource-page.has-aside .resource-body {
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
}

.resource-main {
  min-width: 0;
  display: grid;
  gap: 16px;
}

.resource-aside {
  position: sticky;
  top: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}

@media (max-width: 1279px) {
  .resource-header {
    grid-template-columns: 1fr;
  }

  .resource-stats {
    justify-content: flex-start;
  }

  .resource-page.has-aside .resource-body {
    grid-template-columns: 1fr;
  }

  .resource-aside {
    position: static;
  }
}
</style>
