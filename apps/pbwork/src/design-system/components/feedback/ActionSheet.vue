<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { vPb } from "@/authoring/pb-style";
import { useComponentParts } from "../_shared/componentParts";
import BottomSheet from "./BottomSheet.vue";
import Button from "../action/Button.vue";
const props = withDefaults(
  defineProps<{
    title?: string;
    modelValue?: boolean;
    items?: Array<{
      id: string;
      label: string;
      destructive?: boolean;
      disabled?: boolean;
    }>;
    cancelLabel?: string;
    attach?: string;
    inspectId?: string;
    pbKey?: string;
  }>(),
  {
    title: "记录操作",
    modelValue: false,
    items: () => [
      { id: "edit", label: "编辑记录" },
      { id: "share", label: "分享记录" },
      { id: "delete", label: "删除记录", destructive: true },
    ],
    cancelLabel: "取消",
  },
);
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  select: [value: string];
}>();
const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.action-sheet",
  () => props.pbKey,
);

function select(item: { id: string; disabled?: boolean }) {
  if (item.disabled || !props.modelValue) return;
  emit("select", item.id);
  emit("update:modelValue", false);
}
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick();
      resync();
    }
  },
);

const { resync } = usePbInspect({
  element: rootRef,
  pbId: "ds.action-sheet",
  componentId: "action-sheet",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    color: "color.on-surface",
    gap: "spacing.sm",
    typography: "typography.content",
    danger: "color.error",
    target: "size.touch",
    focus: "border.focus",
    disabledOpacity: "opacity.disabled",
    focusOffset: "spacing.xxs",
  }),
});
</script>
<template>
  <BottomSheet
    :title="props.title"
    :model-value="props.modelValue"
    :attach="attach ?? '.runtime-app'"
    :inspect-id="`${inspectId ?? 'ds.action-sheet'}.shell`"
    @update:model-value="emit('update:modelValue', $event)"
    ><section
      ref="rootRef"
      class="actions"
      data-pb-role="section"
      :aria-label="title"
    >
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        :disabled="item.disabled"
        v-pb="
          part(
            'action',
            'button',
            {
              typography: 'typography.content',
              color: item.destructive ? 'color.error' : 'color.on-surface',
            },
            item.id,
          )
        "
        @click="select(item)"
      >
        {{ item.label }}
      </button>
    </section>
    <template #actions
      ><Button
        :label="props.cancelLabel"
        kind="secondary"
        :inspect-id="`${inspectId ?? 'ds.action-sheet'}.cancel`"
        @click="emit('update:modelValue', false)" /></template
  ></BottomSheet>
</template>
<style scoped>
.actions {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
button {
  min-height: var(--pb-size-touch);
  padding: var(--pb-spacing-sm);
  border: none;
  background: transparent;
  text-align: start;
  cursor: pointer;
}
button:focus-visible,
input:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
button:disabled,
input:disabled {
  opacity: var(--pb-opacity-disabled);
  cursor: default;
}
</style>
