<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import { Check, ChevronDown } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const MENU_MAX_HEIGHT = tokenDefaultNumber("layout.menu-max-height");
const MENU_OFFSET = tokenDefaultNumber("spacing.xs-plus");
const COMPACT_ICON_SIZE = tokenDefaultNumber("sizing.icon-compact");

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
    "radius.md",
    "radius.lg",
    "sizing.control-md",
    "sizing.menu-item",
    "typography.content",
    "elevation.level-3",
    "motion.duration-normal",
    "motion.easing-standard",
    "motion.rotate-half-turn",
    "opacity.disabled",
    "layout.menu-max-height",
    "spacing.xs-plus",
    "sizing.icon-compact",
  ],
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    focus: "color.primary",
    radius: "radius.md",
    height: "sizing.control-md",
    text: "typography.content",
    muted: "color.on-surface-muted",
    menuSurface: "color.surface-raised",
    menuBorder: "border.hairline",
    menuRadius: "radius.lg",
    menuElevation: "elevation.level-3",
    menuItemHeight: "sizing.menu-item",
    selectedBackground: "color.primary-soft",
    duration: "motion.duration-normal",
    easing: "motion.easing-standard",
    openRotation: "motion.rotate-half-turn",
    disabledOpacity: "opacity.disabled",
    menuMaxHeight: "layout.menu-max-height",
    menuOffset: "spacing.xs-plus",
    iconSize: "sizing.icon-compact",
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
  --v-field-border-radius: var(--pb-component-radius, var(--pb-radius-md));
  border-radius: var(--pb-component-radius, var(--pb-radius-md)) !important;
  min-height: var(--pb-sizing-control-md);
  background: var(--pb-color-surface);
}
.pb-select :deep(.v-field__outline__start) {
  border-radius: var(--pb-component-radius, var(--pb-radius-md))
    var(--pb-radius-none) var(--pb-radius-none)
    var(--pb-component-radius, var(--pb-radius-md)) !important;
}
.pb-select :deep(.v-field__outline__end) {
  border-radius: var(--pb-radius-none)
    var(--pb-component-radius, var(--pb-radius-md))
    var(--pb-component-radius, var(--pb-radius-md)) var(--pb-radius-none) !important;
}
.pb-select :deep(.v-field__input) {
  min-height: var(--pb-sizing-control-md);
  font: var(--pb-typography-content);
}
.pb-select :deep(.v-field__append-inner > .v-icon) {
  display: none;
}
.pb-select-chevron {
  color: var(--pb-color-on-surface-muted);
  transition: transform var(--pb-motion-duration-normal)
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
  border-radius: var(--pb-radius-lg) !important;
  background: var(--pb-color-surface-raised) !important;
  box-shadow: var(--pb-elevation-level-3) !important;
  overflow: hidden;
}
.pb-select-menu .v-list {
  padding: var(--pb-spacing-xs);
  background: transparent !important;
}
.pb-select-menu .pb-select-option {
  min-height: var(--pb-sizing-menu-item);
  border-radius: var(--pb-radius-md);
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
