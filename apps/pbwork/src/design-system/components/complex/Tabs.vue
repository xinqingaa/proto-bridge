<script setup lang="ts">
import { toRefs } from "vue";
import {
  usePbInspect,
  usePbInspectRef,
} from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  modelValue?: string;
  items: Array<{ value: string; label: string }>;
}>();
defineEmits<{ "update:modelValue": [value: string] }>();

const rootRef = usePbInspectRef();
const { modelValue, items } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.tabs",
  componentId: "tabs",
  getProps: () => ({
    modelValue: modelValue.value,
    itemCount: items.value.length,
  }),
  getTokenBindings: () => ({
    indicator: "color.primary",
    activeBackground: "color.primary-soft",
    inactiveColor: "color.on-surface-muted",
    surface: "color.surface",
    border: "color.border",
    radius: "radius.md",
    typography: "typography.content",
  }),
  getTokens: () => [
    "color.primary",
    "color.primary-soft",
    "color.on-surface-muted",
    "color.surface",
    "color.border",
    "radius.md",
    "typography.content",
    "spacing.xs",
    "spacing.md",
  ],
});
</script>

<template>
  <div
    ref="rootRef"
    data-pb-id="ds.tabs"
    data-pb-role="tab-bar"
    class="pb-tabs tab-bar"
  >
    <button
      v-for="item in items"
      :key="item.value"
      type="button"
      class="pb-tab"
      :class="{ 'is-active': modelValue === item.value }"
      @click="$emit('update:modelValue', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.pb-tabs {
  display: flex;
  gap: var(--pb-spacing-xs, 4px);
  padding: var(--pb-spacing-xs, 4px);
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
  background: var(--pb-color-surface, #fff);
}
.pb-tab {
  min-height: 36px;
  padding: 0 var(--pb-spacing-md, 16px);
  border: 0;
  border-radius: var(--pb-radius-md, 12px);
  background: transparent;
  color: var(--pb-color-on-surface-muted, #1f29379e);
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
  cursor: pointer;
}
.pb-tab.is-active {
  background: var(--pb-color-primary-soft, #2563eb29);
  color: var(--pb-color-primary, #2563eb);
  font-weight: 600;
}
</style>
