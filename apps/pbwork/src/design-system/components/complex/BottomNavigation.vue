<script setup lang="ts">
import { computed, toRefs, type Component } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

export type BottomNavigationItem = {
  value: string;
  label: string;
  /** Caller-supplied icon component (e.g. Lucide). Not resolved inside this component. */
  icon?: Component;
};

const props = defineProps<{
  /** Required. Count, labels, and icons are owned by the caller — no built-in destinations. */
  items: BottomNavigationItem[];
  modelValue?: string;
  display?: "icon-label" | "icon" | "label";
  showIndicator?: boolean;
  elevated?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.bottom-navigation`. */
  inspectId?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [string] }>();
const rootRef = usePbInspectRef();
const { modelValue, items, display, showIndicator, elevated, inspectId } =
  toRefs(props);

const normalizedItems = computed(() => items.value ?? []);

const activeItem = computed({
  get: () => modelValue.value ?? normalizedItems.value[0]?.value ?? "",
  set: (value: string) => emit("update:modelValue", value),
});

usePbInspect({
  element: rootRef,
  pbId: "ds.bottom-navigation",
  instanceId: inspectId,
  componentId: "bottom-navigation",
  getProps: () => ({
    modelValue: activeItem.value,
    items: normalizedItems.value.map(({ value, label }) => ({ value, label })),
    display: display.value ?? "icon-label",
    showIndicator: showIndicator.value ?? true,
    elevated: elevated.value ?? true,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.surface-raised",
    "color.primary",
    "color.on-surface-muted",
    "border.hairline",
    "elevation.level-3",
    "sizing.touch",
    "sizing.bottom-navigation",
    "typography.caption",
    "typography.subtitle",
    "radius.full",
  ],
  getTokenBindings: () => ({
    surface: "color.surface-raised",
    active: "color.primary",
    inactive: "color.on-surface-muted",
    border: "border.hairline",
    elevation: "elevation.level-3",
    target: "sizing.touch",
    height: "sizing.bottom-navigation",
    label: "typography.caption",
    indicatorRadius: "radius.full",
  }),
});
</script>

<template>
  <section
    ref="rootRef"
    class="pb-bottom-nav-shell bottom-bar tabbar tab-bar"
    :class="{
      'has-indicator': showIndicator ?? true,
      'is-elevated': elevated ?? true,
    }"
    data-pb-id="ds.bottom-navigation"
    data-pb-role="bottom-bar"
  >
    <nav class="pb-bottom-nav" aria-label="底部导航">
      <v-tabs
        class="pb-bottom-nav-tabs"
        color="primary"
        grow
        mandatory
        v-model="activeItem"
      >
        <v-tab
          v-for="item in normalizedItems"
          :key="item.value"
          class="pb-bottom-nav-item"
          :value="item.value"
          :aria-label="item.label"
          stacked
        >
          <component
            :is="item.icon"
            v-if="item.icon && display !== 'label'"
            :size="20"
            aria-hidden="true"
          />
          <span v-if="display !== 'icon'">{{ item.label }}</span>
        </v-tab>
      </v-tabs>
    </nav>
  </section>
</template>

<style scoped>
.pb-bottom-nav-shell {
  position: relative !important;
  display: grid;
  flex: none;
  width: 100%;
  background: var(--pb-color-background);
  z-index: 1;
}
.pb-bottom-nav {
  --pb-bottom-nav-safe: max(
    var(--pb-safe-bottom, 0px),
    env(safe-area-inset-bottom, 0px)
  );
  border-top: var(--pb-border-hairline);
  background: var(--pb-color-surface-raised);
  padding-bottom: var(--pb-bottom-nav-safe);
}
.pb-bottom-nav-shell.is-elevated .pb-bottom-nav {
  box-shadow: var(--pb-elevation-level-3);
}
.pb-bottom-nav-tabs {
  --v-tabs-height: var(--pb-sizing-bottom-navigation, 64px);
  height: var(--v-tabs-height);
}
.pb-bottom-nav :deep(.v-slide-group__content) {
  height: 100%;
}
.pb-bottom-nav-item {
  box-sizing: border-box;
  min-width: var(--pb-sizing-touch, 44px);
  height: var(--v-tabs-height);
  min-height: var(--v-tabs-height);
  padding-bottom: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  text-transform: none;
  letter-spacing: normal;
}
.pb-bottom-nav-item :deep(.v-btn__content) {
  gap: var(--pb-spacing-xs);
}
.pb-bottom-nav-item :deep(.v-btn__overlay) {
  opacity: 0 !important;
}
.pb-bottom-nav-item:focus-visible {
  outline: 2px solid
    color-mix(in srgb, var(--pb-color-primary) 55%, transparent);
  outline-offset: -4px;
}
.pb-bottom-nav :deep(.v-tab--selected) {
  color: var(--pb-color-primary);
  font-weight: 600;
}
.pb-bottom-nav :deep(.v-tab__slider) {
  display: none;
}
.pb-bottom-nav-shell.has-indicator .pb-bottom-nav :deep(.v-tab__slider) {
  display: block;
  top: 0;
  bottom: auto;
  height: 3px;
  border-radius: 0 0 var(--pb-radius-full) var(--pb-radius-full);
  background: var(--pb-color-primary);
}
</style>
