<script setup lang="ts">
import { computed, toRefs } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

/** Matches `motion.duration-slow` (320ms) for v-window's numeric prop. */
const SLIDE_DURATION_MS = 320;

const props = defineProps<{
  modelValue?: string;
  items: Array<{ value: string; label: string }>;
  background?: "transparent" | "surface" | "surface-variant";
  activeStyle?: "text" | "tonal";
  tone?: "primary" | "secondary";
  showIndicator?: boolean;
  showDivider?: boolean;
  grow?: boolean;
  align?: "start" | "center";
  radius?: "none" | "sm" | "md" | "lg" | "full";
  size?: "sm" | "md" | "lg";
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const rootRef = usePbInspectRef();
const {
  modelValue,
  items,
  background,
  activeStyle,
  tone,
  showIndicator,
  showDivider,
  grow,
  align,
  radius,
  size,
} = toRefs(props);

const tabStyle = computed(() => ({
  "--pb-tabs-background":
    background.value === "transparent"
      ? "transparent"
      : `var(--pb-color-${background.value ?? "surface"})`,
  "--pb-tabs-active-background":
    activeStyle.value === "tonal"
      ? `var(--pb-color-${tone.value ?? "primary"}-soft)`
      : "transparent",
  "--pb-tabs-active-color": `var(--pb-color-${tone.value ?? "primary"})`,
  "--pb-tabs-radius": `var(--pb-radius-${radius.value ?? "md"})`,
  "--pb-tabs-height": `var(--pb-sizing-control-${size.value ?? "md"})`,
}));

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
    background: background.value ?? "transparent",
    activeStyle: activeStyle.value ?? "text",
    tone: tone.value ?? "primary",
    showIndicator: showIndicator.value ?? true,
    showDivider: showDivider.value ?? false,
    grow: grow.value ?? false,
    align: align.value ?? "start",
    radius: radius.value ?? "md",
    size: size.value ?? "md",
  }),
  getTokenBindings: () => ({
    indicator: "color.primary",
    activeBackground:
      activeStyle.value === "tonal"
        ? `color.${tone.value ?? "primary"}-soft`
        : "transparent",
    inactiveColor: "color.on-surface-muted",
    surface:
      background.value === "transparent"
        ? "transparent"
        : `color.${background.value ?? "surface"}`,
    border: showDivider.value ? "color.divider" : "transparent",
    radius: `radius.${radius.value ?? "md"}`,
    height: `sizing.control-${size.value ?? "md"}`,
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
    data-pb-role="tab-bar"
    class="pb-tabs tab-bar"
    :class="{
      'has-indicator': showIndicator ?? true,
      'has-divider': showDivider ?? false,
      'is-tonal': activeStyle === 'tonal',
    }"
    :style="tabStyle"
  >
    <v-tabs
      v-model="tab"
      class="pb-tab-bar"
      density="compact"
      :color="tone ?? 'primary'"
      :align-tabs="align ?? 'start'"
      :grow="grow ?? false"
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
  gap: var(--pb-spacing-sm-plus, 12px);
  min-width: 0;
  background: var(--pb-tabs-background, transparent);
}
.pb-tab-bar {
  background: transparent;
}
.pb-tabs.has-divider .pb-tab-bar {
  border-bottom: var(--pb-border-hairline);
}
.pb-tab-bar :deep(.v-tab) {
  min-height: max(var(--pb-tabs-height), var(--pb-sizing-touch, 44px));
  padding: 0 var(--pb-spacing-md, 16px);
  border-radius: var(--pb-tabs-radius, var(--pb-radius-md, 12px));
  color: var(--pb-color-on-surface-muted, #1f29379e);
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
  letter-spacing: normal;
  text-transform: none;
}
.pb-tab-bar :deep(.v-tab--selected) {
  background: var(--pb-tabs-active-background, transparent);
  color: var(--pb-tabs-active-color, var(--pb-color-primary));
  font-weight: 600;
}
.pb-tab-bar :deep(.v-tabs-slider),
.pb-tab-bar :deep(.v-tab__slider) {
  display: none;
}
.pb-tabs.has-indicator .pb-tab-bar :deep(.v-tabs-slider),
.pb-tabs.has-indicator .pb-tab-bar :deep(.v-tab__slider) {
  display: block;
  height: 3px;
  border-radius: var(--pb-radius-full) var(--pb-radius-full) 0 0;
  background: var(--pb-tabs-active-color, var(--pb-color-primary));
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
