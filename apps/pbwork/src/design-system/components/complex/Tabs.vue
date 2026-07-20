<script setup lang="ts">
import { computed, toRefs } from "vue";
import {
  usePbInspect,
  usePbInspectRef,
} from "@/runtime/inspect/usePbInspect";

/** Matches `motion.duration-slow` (320ms) for v-window's numeric prop. */
const SLIDE_DURATION_MS = 320;

const props = defineProps<{
  modelValue?: string;
  items: Array<{ value: string; label: string }>;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const rootRef = usePbInspectRef();
const { modelValue, items } = toRefs(props);

const tab = computed({
  get: () => modelValue.value ?? items.value[0]?.value ?? "",
  set: (value: unknown) => {
    if (typeof value === "string") emit("update:modelValue", value);
  },
});

usePbInspect({
  element: rootRef,
  pbId: "ds.tabs",
  componentId: "tabs",
  getProps: () => ({
    modelValue: modelValue.value,
    itemCount: items.value.length,
    hasPanels: true,
  }),
  getTokenBindings: () => ({
    indicator: "color.primary",
    activeBackground: "color.primary-soft",
    inactiveColor: "color.on-surface-muted",
    surface: "color.surface",
    border: "color.border",
    radius: "radius.md",
    typography: "typography.content",
    duration: "motion.duration-slow",
    easing: "motion.easing-standard",
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
    "motion.duration-slow",
    "motion.easing-standard",
  ],
});
</script>

<template>
  <div
    ref="rootRef"
    data-pb-id="ds.tabs"
    data-pb-role="tabs"
    class="pb-tabs"
  >
    <v-tabs
      v-model="tab"
      class="pb-tab-bar"
      density="compact"
      color="primary"
      align-tabs="start"
    >
      <v-tab
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        class="pb-tab"
      >
        {{ item.label }}
      </v-tab>
    </v-tabs>

    <v-window
      v-model="tab"
      class="pb-tab-window"
      direction="horizontal"
      :transition-duration="SLIDE_DURATION_MS"
    >
      <v-window-item
        v-for="item in items"
        :key="item.value"
        :value="item.value"
      >
        <div class="pb-tab-panel" data-pb-role="tab-panel">
          <slot :name="item.value">
            <p class="pb-tab-panel-empty">{{ item.label }}</p>
          </slot>
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>

<style scoped>
.pb-tabs {
  display: grid;
  gap: 12px;
  min-width: 0;
  background: var(--pb-color-surface, #fff);
}
.pb-tab-bar {
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
}
.pb-tab-bar :deep(.v-tab) {
  min-height: 36px;
  padding: 0 var(--pb-spacing-md, 16px);
  border-radius: var(--pb-radius-md, 12px);
  color: var(--pb-color-on-surface-muted, #1f29379e);
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
  letter-spacing: normal;
  text-transform: none;
}
.pb-tab-bar :deep(.v-tab--selected) {
  background: var(--pb-color-primary-soft, #2563eb29);
  color: var(--pb-color-primary, #2563eb);
  font-weight: 600;
}
.pb-tab-bar :deep(.v-tabs-slider),
.pb-tab-bar :deep(.v-tab__slider) {
  display: none;
}
.pb-tab-window {
  min-width: 0;
  /* Peer slide — bind Vuetify window transition to motion tokens */
  --v-window-transition-duration: var(--pb-motion-duration-slow, 320ms);
}
.pb-tab-window :deep(.v-window__container),
.pb-tab-window :deep(.v-window-x-transition-enter-active),
.pb-tab-window :deep(.v-window-x-transition-leave-active),
.pb-tab-window :deep(.v-window-x-reverse-transition-enter-active),
.pb-tab-window :deep(.v-window-x-reverse-transition-leave-active) {
  transition-duration: var(--pb-motion-duration-slow, 320ms);
  transition-timing-function: var(
    --pb-motion-easing-standard,
    cubic-bezier(0.2, 0, 0, 1)
  );
}
.pb-tab-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.pb-tab-panel-empty {
  margin: 0;
  padding: 8px 0;
  color: var(--pb-color-on-surface-muted, #1f29379e);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
@media (prefers-reduced-motion: reduce) {
  .pb-tab-window :deep(.v-window__container),
  .pb-tab-window :deep(.v-window-x-transition-enter-active),
  .pb-tab-window :deep(.v-window-x-transition-leave-active),
  .pb-tab-window :deep(.v-window-x-reverse-transition-enter-active),
  .pb-tab-window :deep(.v-window-x-reverse-transition-leave-active) {
    transition-duration: 0s;
  }
}
</style>
