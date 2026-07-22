<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import { Check, ChevronDown } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { radiusStyle } from "@/design-system/components/_shared/radius";
import {
  controlSizeStyle,
  type ComponentSize,
} from "@/design-system/components/_shared/appearance";

const props = defineProps<{
  label: string;
  modelValue?: string;
  options?: string[];
  placeholder?: string;
  size?: ComponentSize;
  clearable?: boolean;
  loading?: boolean;
  error?: string;
  open?: boolean;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.select`. */
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
  size,
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
  pbId: "ds.select",
  instanceId: inspectId,
  componentId: "select",
  getProps: () => ({
    label: label.value,
    modelValue: modelValue.value ?? "",
    options: options.value ?? [],
    placeholder: placeholder.value ?? "请选择",
    size: size.value ?? "md",
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
  ],
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    focus: "color.primary",
    radius: "radius.md",
    height: `sizing.control-${size.value ?? "md"}`,
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
  }),
});
</script>

<template>
  <v-select
    ref="rootRef"
    class="pb-select"
    :class="`size-${size ?? 'md'}`"
    data-pb-id="ds.select"
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
      maxHeight: 304,
      offset: 6,
    }"
    :style="[radiusStyle('md'), controlSizeStyle(size ?? 'md')]"
    @update:menu="updateMenu"
    @update:model-value="emit('update:modelValue', String($event ?? ''))"
  >
    <template #append-inner>
      <ChevronDown
        class="pb-select-chevron"
        :class="{ 'is-open': menuOpen }"
        :size="18"
      />
    </template>
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps" class="pb-select-option">
        <template #append>
          <Check
            v-if="item.value === modelValue"
            :size="18"
            class="pb-select-check"
          />
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<style scoped>
.pb-select :deep(.v-field) {
  --v-field-border-radius: var(
    --pb-component-radius,
    var(--pb-radius-md, 12px)
  );
  border-radius: var(
    --pb-component-radius,
    var(--pb-radius-md, 12px)
  ) !important;
  min-height: var(--pb-component-height, var(--pb-sizing-control-md, 40px));
  background: var(--pb-color-surface, #fff);
}
.pb-select :deep(.v-field__outline__start) {
  border-radius: var(--pb-component-radius, var(--pb-radius-md, 12px)) 0 0
    var(--pb-component-radius, var(--pb-radius-md, 12px)) !important;
}
.pb-select :deep(.v-field__outline__end) {
  border-radius: 0 var(--pb-component-radius, var(--pb-radius-md, 12px))
    var(--pb-component-radius, var(--pb-radius-md, 12px)) 0 !important;
}
.pb-select :deep(.v-field__input) {
  min-height: var(--pb-component-height, var(--pb-sizing-control-md, 40px));
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
  transform: rotate(180deg);
}
</style>

<style>
.pb-select-menu {
  border: var(--pb-border-hairline, 1px solid var(--pb-color-divider));
  border-radius: var(--pb-radius-lg, 16px) !important;
  background: var(--pb-color-surface-raised) !important;
  box-shadow: var(--pb-elevation-level-3) !important;
  overflow: hidden;
}
.pb-select-menu .v-list {
  padding: var(--pb-spacing-xs, 4px);
  background: transparent !important;
}
.pb-select-menu .pb-select-option {
  min-height: var(--pb-sizing-menu-item, 48px);
  border-radius: var(--pb-radius-md, 12px);
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
