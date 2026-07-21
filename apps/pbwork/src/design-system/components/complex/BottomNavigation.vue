<script setup lang="ts">
import { computed, toRefs } from "vue";
import { Home, ClipboardList, Bell, User } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { usePointerSwipe } from "@/design-system/components/_shared/usePointerSwipe";

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
  showView?: boolean;
  viewHeight?: number;
  mouseSwipe?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [string] }>();
const rootRef = usePbInspectRef();
const {
  modelValue,
  items,
  display,
  showIndicator,
  elevated,
  showView,
  viewHeight,
  mouseSwipe,
} = toRefs(props);
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
const activeItem = computed({
  get: () => modelValue.value ?? normalizedItems.value[0]?.value ?? "",
  set: (value: string) => emit("update:modelValue", value),
});
const navigationValues = computed(() =>
  normalizedItems.value.map((item) => item.value),
);
const swipeEnabled = computed(() => mouseSwipe.value ?? true);
const swipe = usePointerSwipe(
  navigationValues,
  activeItem,
  (value) => emit("update:modelValue", value),
  swipeEnabled,
);
const viewStyle = computed(() => ({
  minHeight: `${viewHeight.value ?? 220}px`,
}));

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
    showView: showView.value ?? false,
    viewHeight: viewHeight.value ?? 220,
    mouseSwipe: swipeEnabled.value,
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
    "color.background",
    "radius.full",
    "motion.duration-normal",
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
    viewSurface: "color.background",
    viewTitle: "typography.subtitle",
    viewMuted: "color.on-surface-muted",
    duration: "motion.duration-normal",
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
    <v-window
      v-if="showView"
      v-model="activeItem"
      class="pb-bottom-nav-view"
      :class="{ 'is-dragging': swipe.dragging.value }"
      :style="[viewStyle, swipe.dragStyle.value]"
      :transition-duration="200"
      @pointerdown="swipe.onPointerDown"
      @pointermove="swipe.onPointerMove"
      @pointerup="swipe.onPointerUp"
      @pointercancel="swipe.onPointerCancel"
    >
      <v-window-item
        v-for="item in normalizedItems"
        :key="item.value"
        :value="item.value"
      >
        <div class="pb-bottom-nav-panel" data-pb-role="tab-panel">
          <slot :name="item.value" :item="item">
            <v-sheet class="pb-bottom-nav-placeholder" color="transparent">
              <component :is="iconMap[item.icon ?? 'home']" :size="28" />
              <strong>{{ item.label }}</strong>
              <span>{{ item.label }}视图内容</span>
            </v-sheet>
          </slot>
        </div>
      </v-window-item>
    </v-window>
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
            v-if="display !== 'label'"
            :is="iconMap[item.icon ?? 'home']"
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
}
.pb-bottom-nav-shell.is-elevated .pb-bottom-nav {
  box-shadow: var(--pb-elevation-level-3);
}
.pb-bottom-nav-view {
  min-width: 0;
  background: var(--pb-color-background);
  cursor: grab;
  touch-action: pan-y;
}
.pb-bottom-nav-view.is-dragging {
  cursor: grabbing;
  user-select: none;
}
.pb-bottom-nav-view.is-dragging :deep(.v-window__container) {
  transform: translateX(var(--pb-swipe-offset, 0));
  transition: none !important;
}
.pb-bottom-nav-panel {
  min-height: inherit;
  padding: var(--pb-spacing-md);
}
.pb-bottom-nav-placeholder {
  display: grid;
  min-height: inherit;
  place-content: center;
  place-items: center;
  gap: var(--pb-spacing-sm);
  color: var(--pb-color-on-surface-muted);
  text-align: center;
}
.pb-bottom-nav-placeholder strong {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-subtitle);
}
.pb-bottom-nav-placeholder span {
  font: var(--pb-typography-caption);
}
.pb-bottom-nav-tabs {
  --v-tabs-height: calc(
    var(--pb-sizing-bottom-navigation, 64px) + var(--pb-bottom-nav-safe)
  );
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
  padding-bottom: var(--pb-bottom-nav-safe);
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
.pb-bottom-nav-shell.has-indicator .pb-bottom-nav :deep(.v-tab__slider) {
  display: block;
  top: 0;
  bottom: auto;
  height: 3px;
  border-radius: 0 0 var(--pb-radius-full) var(--pb-radius-full);
  background: var(--pb-color-primary);
}
</style>
