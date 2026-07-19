<script setup lang="ts">
import { toRefs } from "vue";
import IconButton from "@/design-system/components/basic/IconButton.vue";
import {
  usePbInspect,
  usePbInspectRef,
} from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  title: string;
  dense?: boolean;
  elevated?: boolean;
}>();

const rootRef = usePbInspectRef();
const { title, dense, elevated } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.app-bar",
  componentId: "app-bar",
  getProps: () => ({
    title: title.value,
    dense: dense.value ?? false,
    elevated: elevated.value ?? false,
  }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    elevation: "elevation.card",
    title: "typography.subtitle",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface",
    "elevation.card",
    "typography.subtitle",
    "spacing.sm",
    "spacing.md",
  ],
});
</script>

<template>
  <header
    ref="rootRef"
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
