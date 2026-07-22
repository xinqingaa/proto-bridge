<script setup lang="ts">
import { toRefs } from "vue";
import { Search } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

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
    "radius.md",
    "sizing.control-lg",
    "sizing.icon-md",
    "typography.content",
  ],
  getTokenBindings: () => ({
    surface: "color.surface-variant",
    text: "color.on-surface",
    placeholder: "color.on-surface-muted",
    radius: "radius.md",
    height: "sizing.control-lg",
    icon: "sizing.icon-md",
    typography: "typography.content",
  }),
});
</script>

<template>
  <form
    ref="rootRef"
    class="pb-search"
    data-pb-id="ds.search-bar"
    role="search"
    @submit.prevent="$emit('submit')"
  >
    <v-text-field
      class="pb-search-field"
      density="comfortable"
      variant="solo-filled"
      flat
      hide-details
      clearable
      rounded="md"
      :model-value="modelValue ?? ''"
      :placeholder="placeholder ?? '搜索'"
      :disabled="disabled ?? false"
      @update:model-value="$emit('update:modelValue', String($event ?? ''))"
      @click:clear="$emit('update:modelValue', '')"
    >
      <template #prepend-inner>
        <Search :size="18" aria-hidden="true" />
      </template>
    </v-text-field>
  </form>
</template>

<style scoped>
.pb-search {
  width: 100%;
}
.pb-search-field {
  border-radius: var(--pb-radius-md, 12px);
}
.pb-search-field :deep(.v-field) {
  min-height: var(--pb-sizing-control-lg, 48px);
  border-radius: var(--pb-radius-md, 12px);
  background: var(--pb-color-surface-variant) !important;
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.pb-search-field :deep(.v-field__input) {
  color: var(--pb-color-on-surface);
}
</style>
