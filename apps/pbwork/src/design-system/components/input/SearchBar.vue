<script setup lang="ts">
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { toRefs } from "vue";
import { Search } from "lucide-vue-next";
import TextField from "@/design-system/components/input/TextField.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const SEARCH_ICON_SIZE = useTokenNumber("size.icon-compact");

const props = defineProps<{
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Page-unique inspect / comment anchor; falls back to `ds.search-bar`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [string]; submit: [] }>();

const rootRef = usePbInspectRef();
const { modelValue, placeholder, disabled, inspectId } = toRefs(props);

usePbInspect({
  element: rootRef,
  pbId: "ds.search-bar",
  instanceId: inspectId,
  componentId: "search-bar",
  getProps: () => ({
    modelValue: modelValue.value ?? "",
    placeholder: placeholder.value ?? "搜索",
    disabled: disabled.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.surface-variant",
    "color.on-surface",
    "color.on-surface-muted",
    "radius.control",
    "size.control-large",
    "size.icon-compact",
    "typography.content",
    "opacity.disabled",
  ],
  getTokenBindings: () => ({
    surface: "color.surface-variant",
    text: "color.on-surface",
    placeholder: "color.on-surface-muted",
    radius: "radius.control",
    height: "size.control-large",
    icon: "size.icon-compact",
    typography: "typography.content",
    disabledOpacity: "opacity.disabled",
  }),
});
</script>

<template>
  <form
    ref="rootRef"
    class="pb-search"
    :class="{ 'is-disabled': disabled ?? false }"
    data-pb-id="ds.search-bar"
    data-pb-role="search"
    role="search"
    @submit.prevent="$emit('submit')"
  >
    <TextField
      class="pb-search-field"
      :show-label="false"
      :model-value="modelValue ?? ''"
      :placeholder="placeholder ?? '搜索'"
      :disabled="disabled ?? false"
      clearable
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <template #prepend-inner>
        <Search :size="SEARCH_ICON_SIZE" aria-hidden="true" />
      </template>
    </TextField>
  </form>
</template>

<style scoped>
.pb-search {
  width: var(--pb-layout-fill);
}
.pb-search-field {
  border-radius: var(--pb-radius-control);
}
.pb-search-field :deep(.v-field) {
  min-height: var(--pb-size-control-large);
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-surface-variant) !important;
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.pb-search-field :deep(.v-field__field),
.pb-search-field :deep(.v-field__prepend-inner),
.pb-search-field :deep(.v-field__append-inner) {
  align-items: center;
}
.pb-search-field :deep(.v-field__input) {
  color: var(--pb-color-on-surface);
  align-items: center;
}
.pb-search.is-disabled {
  opacity: var(--pb-opacity-disabled);
}
</style>
