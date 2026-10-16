<script setup lang="ts">
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
import { themeConstantNumber } from "@/design-system/theme/constants";

import { computed, ref, toRefs, watch } from "vue";
import { Check, ChevronDown } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
const MENU_MAX_HEIGHT = themeConstantNumber("layout.menu-max-height");
const MENU_OFFSET = useTokenNumber("menu.offset");
const COMPACT_ICON_SIZE = useTokenNumber("size.icon-compact");

const props = defineProps<{
  label: string;
  modelValue?: string;
  options?: string[];
  placeholder?: string;
  clearable?: boolean;
  loading?: boolean;
  error?: string;
  open?: boolean;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.menu`. */
  inspectId?: string;
}>();
const emit = defineEmits<{
  "update:modelValue": [string];
  "update:open": [boolean];
}>();

const rootRef = usePbInspectRef();
const {
  label,
  modelValue,
  options,
  placeholder,
  clearable,
  loading,
  error,
  open,
  disabled,
  inspectId,
} = toRefs(props);
const menuOpen = ref(open.value ?? false);
const resolvedOptions = computed(() => options.value ?? ["选项一", "选项二"]);

watch(open, (value) => {
  if (typeof value === "boolean") menuOpen.value = value;
});

function updateMenu(value: boolean) {
  menuOpen.value = value;
  emit("update:open", value);
}

usePbInspect({
  element: rootRef,
  pbId: "ds.menu",
  instanceId: inspectId,
  componentId: "menu",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? "",
    options: options.value ?? [],
    placeholder: placeholder.value ?? "请选择",
    clearable: clearable.value ?? false,
    loading: loading.value ?? false,
    error: error.value ?? "",
    open: menuOpen.value,
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "color.on-surface",
    "color.on-surface-muted",
    "color.primary",
    "color.primary-soft",
    "color.surface-raised",
    "border.hairline",
    "radius.control",
    "radius.surface",
    "size.control",
    "menu.menu-item-height",
    "typography.content",
    "elevation.menu",
    "motion.duration-medium",
    "motion.easing-standard",
    "opacity.disabled",
    "menu.offset",
    "size.icon-compact",
  ],
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    focus: "color.primary",
    radius: "radius.control",
    height: "size.control",
    text: "typography.content",
    muted: "color.on-surface-muted",
    menuSurface: "color.surface-raised",
    menuBorder: "border.hairline",
    menuRadius: "radius.surface",
    menuElevation: "elevation.menu",
    menuItemHeight: "menu.menu-item-height",
    selectedBackground: "color.primary-soft",
    duration: "motion.duration-medium",
    easing: "motion.easing-standard",
    disabledOpacity: "opacity.disabled",
    menuOffset: "menu.offset",
    iconSize: "size.icon-compact",
  }),
});
</script>

<template>
  <v-select
    ref="rootRef"
    class="pb-select"
    data-pb-id="ds.menu"
    data-pb-role="field"
    :label="label"
    :model-value="modelValue ?? ''"
    :items="resolvedOptions"
    :placeholder="placeholder ?? '请选择'"
    :clearable="clearable ?? false"
    :loading="loading ?? false"
    :error-messages="error ? [error] : []"
    :disabled="disabled ?? false"
    :menu="menuOpen"
    :menu-props="{
      contentClass: 'pb-select-menu',
      maxHeight: MENU_MAX_HEIGHT,
      offset: MENU_OFFSET,
    }"
    :style="radiusStyle('md')"
    @update:menu="updateMenu"
    @update:model-value="emit('update:modelValue', String($event ?? ''))"
  >
    <template #append-inner>
      <ChevronDown
        class="pb-select-chevron"
        :class="{ 'is-open': menuOpen }"
        :size="COMPACT_ICON_SIZE"
      />
    </template>
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps" class="pb-select-option">
        <template #append>
          <Check
            v-if="item.value === modelValue"
            :size="COMPACT_ICON_SIZE"
            class="pb-select-check"
          />
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<style scoped>
.pb-select :deep(.v-field) {
  --v-field-border-radius: var(--pb-component-radius, var(--pb-radius-control));
  border-radius: var(
    --pb-component-radius,
    var(--pb-radius-control)
  ) !important;
  min-height: var(--pb-size-control);
  background: var(--pb-color-surface);
}
.pb-select :deep(.v-field__outline__start) {
  border-radius: var(--pb-component-radius, var(--pb-radius-control))
    var(--pb-layout-zero) var(--pb-layout-zero)
    var(--pb-component-radius, var(--pb-radius-control)) !important;
}
.pb-select :deep(.v-field__outline__end) {
  border-radius: var(--pb-layout-zero)
    var(--pb-component-radius, var(--pb-radius-control))
    var(--pb-component-radius, var(--pb-radius-control)) var(--pb-layout-zero) !important;
}
.pb-select :deep(.v-field__input) {
  min-height: var(--pb-size-control);
  font: var(--pb-typography-content);
}
.pb-select :deep(.v-field__append-inner > .v-icon) {
  display: none;
}
.pb-select-chevron {
  color: var(--pb-color-on-surface-muted);
  transition: transform var(--pb-motion-duration-medium)
    var(--pb-motion-easing-standard);
}
.pb-select-chevron.is-open {
  transform: rotate(var(--pb-motion-rotate-half-turn));
}
.pb-select.v-input--disabled {
  opacity: var(--pb-opacity-disabled);
}
</style>

<style>
.pb-select-menu {
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-surface) !important;
  background: var(--pb-color-surface-raised) !important;
  box-shadow: var(--pb-elevation-menu) !important;
  overflow: hidden;
}
.pb-select-menu .v-list {
  padding: var(--pb-spacing-xs);
  background: transparent !important;
}
.pb-select-menu .pb-select-option {
  min-height: var(--pb-menu-menu-item-height);
  border-radius: var(--pb-radius-control);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.pb-select-menu .pb-select-option.v-list-item--active {
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
}
.pb-select-menu .pb-select-check {
  color: var(--pb-color-primary);
}
</style>
