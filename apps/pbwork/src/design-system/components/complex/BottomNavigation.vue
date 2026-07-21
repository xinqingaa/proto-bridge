<script setup lang="ts">
import { computed, toRefs } from "vue";
import { Home, ClipboardList, Bell, User } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

type NavigationItem = {
  value: string;
  label: string;
  icon?: "home" | "orders" | "notifications" | "profile";
};

const props = defineProps<{
  modelValue?: string;
  items?: Array<string | NavigationItem>;
  display?: "icon-label" | "icon" | "label";
  showIndicator?: boolean;
  elevated?: boolean;
}>();
defineEmits<{ "update:modelValue": [string] }>();
const rootRef = usePbInspectRef();
const { modelValue, items, display, showIndicator, elevated } = toRefs(props);
const defaultItems: NavigationItem[] = [
  { value: "工作台", label: "工作台", icon: "home" },
  { value: "工单", label: "工单", icon: "orders" },
  { value: "消息", label: "消息", icon: "notifications" },
  { value: "我的", label: "我的", icon: "profile" },
];
const iconMap = {
  home: Home,
  orders: ClipboardList,
  notifications: Bell,
  profile: User,
};
const normalizedItems = computed<NavigationItem[]>(() =>
  (items.value?.length ? items.value : defaultItems).map((item, index) => {
    if (typeof item !== "string") return item;
    return {
      ...defaultItems[index % defaultItems.length],
      value: item,
      label: item,
    };
  }),
);

usePbInspect({
  element: rootRef,
  pbId: "ds.bottom-navigation",
  componentId: "bottom-navigation",
  getProps: () => ({
    modelValue: modelValue.value ?? "工作台",
    items: normalizedItems.value,
    display: display.value ?? "icon-label",
    showIndicator: showIndicator.value ?? true,
    elevated: elevated.value ?? true,
  }),
  getTokens: () => [
    "color.surface-raised",
    "color.primary",
    "color.on-surface-muted",
    "color.divider",
    "elevation.level-3",
    "sizing.touch",
    "typography.caption",
  ],
  getTokenBindings: () => ({
    surface: "color.surface-raised",
    active: "color.primary",
    inactive: "color.on-surface-muted",
    divider: "color.divider",
    elevation: "elevation.level-3",
    target: "sizing.touch",
    label: "typography.caption",
  }),
});
</script>

<template>
  <nav
    ref="rootRef"
    class="pb-bottom-nav bottom-bar tabbar tab-bar"
    :class="{
      'has-indicator': showIndicator ?? true,
      'is-elevated': elevated ?? true,
    }"
    data-pb-id="ds.bottom-navigation"
    data-pb-role="bottom-bar"
    aria-label="底部导航"
  >
    <v-tabs
      class="pb-bottom-nav-tabs"
      color="primary"
      grow
      mandatory
      :model-value="modelValue ?? normalizedItems[0]?.value"
      @update:model-value="$emit('update:modelValue', String($event ?? ''))"
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
          v-if="display !== 'label'"
          :is="iconMap[item.icon ?? 'home']"
          :size="20"
          aria-hidden="true"
        />
        <span v-if="display !== 'icon'">{{ item.label }}</span>
      </v-tab>
    </v-tabs>
  </nav>
</template>

<style scoped>
.pb-bottom-nav {
  position: relative !important;
  flex: none;
  width: 100%;
  padding-bottom: max(var(--pb-safe-bottom, 0px), env(safe-area-inset-bottom));
  border-top: var(--pb-border-hairline);
  background: var(--pb-color-surface-raised);
  z-index: 1;
}
.pb-bottom-nav.is-elevated {
  box-shadow: var(--pb-elevation-level-3);
}
.pb-bottom-nav-tabs {
  height: var(--pb-sizing-bottom-navigation, 64px);
}
.pb-bottom-nav :deep(.v-slide-group__content) {
  height: 100%;
}
.pb-bottom-nav-item {
  min-width: var(--pb-sizing-touch, 44px);
  min-height: var(--pb-sizing-touch, 44px);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  text-transform: none;
  letter-spacing: normal;
}
.pb-bottom-nav-item :deep(.v-btn__content) {
  gap: var(--pb-spacing-xs);
}
.pb-bottom-nav :deep(.v-tab--selected) {
  color: var(--pb-color-primary);
  font-weight: 600;
}
.pb-bottom-nav :deep(.v-tab__slider) {
  display: none;
}
.pb-bottom-nav.has-indicator :deep(.v-tab__slider) {
  display: block;
  top: 0;
  bottom: auto;
  height: 3px;
  border-radius: 0 0 var(--pb-radius-full) var(--pb-radius-full);
  background: var(--pb-color-primary);
}
</style>
