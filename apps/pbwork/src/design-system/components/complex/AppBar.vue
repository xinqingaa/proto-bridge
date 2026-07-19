<script setup lang="ts">
import IconButton from "@/design-system/components/basic/IconButton.vue";

defineProps<{
  title: string;
  dense?: boolean;
  elevated?: boolean;
}>();
</script>

<template>
  <header
    class="pb-app-bar app-bar"
    data-pb-id="ds.app-bar"
    data-pb-role="app-bar"
    :class="{ 'is-dense': dense, 'is-elevated': elevated }"
  >
    <div class="pb-app-bar-main">
      <h2>{{ title }}</h2>
      <div class="pb-app-bar-actions">
        <slot name="append">
          <IconButton ariaLabel="更多" icon="more" tone="neutral" size="sm" />
        </slot>
      </div>
    </div>
  </header>
</template>

<style scoped>
.pb-app-bar {
  width: 100%;
  box-sizing: border-box;
  padding-top: var(--pb-safe-top, 0px);
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
  background: var(--pb-color-surface, #fff);
  color: var(--pb-color-on-surface, #1f2937);
}
.pb-app-bar.is-elevated {
  box-shadow: var(--pb-elevation-card, none);
}
.pb-app-bar-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-sm, 8px);
  min-height: 56px;
  padding: 0 var(--pb-spacing-md, 16px);
}
.pb-app-bar.is-dense .pb-app-bar-main {
  min-height: 44px;
}
.pb-app-bar h2 {
  margin: 0;
  font: var(--pb-typography-subtitle, 600 16px/1.4 Inter, system-ui, sans-serif);
}
.pb-app-bar-actions {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-xs, 4px);
}
</style>
