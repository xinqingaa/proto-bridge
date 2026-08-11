<script setup lang="ts">
import { computed, toRefs, type Component } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

export type TabbarItem = {
  value: string;
  label: string;
  /** Caller-supplied icon component (e.g. Lucide). Not resolved inside this component. */
  icon: Component;
};

const props = defineProps<{
  /** Required. Count, labels, and icons are owned by the caller — no built-in destinations. */
  items: TabbarItem[];
  modelValue?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.tabbar`. */
  inspectId?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [string] }>();
const rootRef = usePbInspectRef();
const { modelValue, items, inspectId } = toRefs(props);

const normalizedItems = computed(() => items.value ?? []);

const activeItem = computed({
  get: () => modelValue.value ?? normalizedItems.value[0]?.value ?? "",
  set: (value: string) => emit("update:modelValue", value),
});

usePbInspect({
  element: rootRef,
  pbId: "ds.tabbar",
  instanceId: inspectId,
  componentId: "tabbar",
  getProps: () => ({
    modelValue: activeItem.value,
    items: normalizedItems.value.map(({ value, label }) => ({ value, label })),
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.surface-raised",
    "color.navigation-active",
    "color.on-surface-muted",
    "border.hairline",
    "sizing.touch",
    "sizing.bottom-navigation",
    "typography.caption",
    "typography.subtitle",
    "radius.full",
    "layout.fill",
    "layout.focus-inset",
    "layer.content",
    "spacing.none",
    "opacity.hidden",
    "border.focus",
    "typography.caption-strong",
  ],
  getTokenBindings: () => ({
    surface: "color.surface-raised",
    active: "color.navigation-active",
    inactive: "color.on-surface-muted",
    border: "border.hairline",
    target: "sizing.touch",
    height: "sizing.bottom-navigation",
    label: "typography.caption",
    selectedLabel: "typography.caption-strong",
    fill: "layout.fill",
    focusInset: "layout.focus-inset",
    contentLayer: "layer.content",
    safeInsetFallback: "spacing.none",
    overlayOpacity: "opacity.hidden",
    focusOutline: "border.focus",
  }),
});
</script>

<template>
  <section
    ref="rootRef"
    class="pb-tabbar-shell bottom-bar tabbar tab-bar"
    data-pb-id="ds.tabbar"
    data-pb-role="bottom-bar"
  >
    <nav class="pb-tabbar" aria-label="应用主导航">
      <v-tabs
        class="pb-tabbar-tabs"
        color="primary"
        grow
        mandatory
        v-model="activeItem"
      >
        <v-tab
          v-for="item in normalizedItems"
          :key="item.value"
          class="pb-tabbar-item"
          :value="item.value"
          :aria-label="item.label"
          :ripple="false"
          stacked
        >
          <component
            :is="item.icon"
            v-if="item.icon"
            :size="20"
            aria-hidden="true"
          />
          <span>{{ item.label }}</span>
        </v-tab>
      </v-tabs>
    </nav>
  </section>
</template>

<style scoped>
.pb-tabbar-shell {
  position: relative !important;
  display: flex;
  flex-direction: column;
  flex: none;
  width: var(--pb-layout-fill);
  background: var(--pb-color-background);
  z-index: var(--pb-layer-content);
}
.pb-tabbar {
  --pb-bottom-nav-safe: max(
    var(--pb-safe-bottom, var(--pb-spacing-none)),
    env(safe-area-inset-bottom, var(--pb-spacing-none))
  );
  border-top: var(--pb-border-hairline);
  background: var(--pb-color-surface-raised);
  padding-bottom: var(--pb-bottom-nav-safe);
}
.pb-tabbar-tabs {
  --v-tabs-height: var(--pb-sizing-bottom-navigation);
  height: var(--v-tabs-height);
}
.pb-tabbar :deep(.v-slide-group__content) {
  height: var(--pb-layout-fill);
}
.pb-tabbar-item {
  box-sizing: border-box;
  min-width: var(--pb-sizing-touch);
  height: var(--v-tabs-height);
  min-height: var(--v-tabs-height);
  padding-bottom: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  text-transform: none;
  letter-spacing: normal;
}
.pb-tabbar-item :deep(.v-btn__content) {
  gap: var(--pb-spacing-xs);
}
.pb-tabbar-item :deep(.v-btn__overlay) {
  opacity: var(--pb-opacity-hidden) !important;
}
.pb-tabbar-item:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
}
.pb-tabbar :deep(.v-tab--selected) {
  color: var(--pb-color-navigation-active);
  font: var(--pb-typography-caption-strong);
}
.pb-tabbar :deep(.v-tab__slider) {
  display: none !important;
}
</style>
