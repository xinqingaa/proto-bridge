<script setup lang="ts">
import { ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { vPb, pbStyle } from "@/authoring/pb-style";
import { useComponentParts } from "../_shared/componentParts";
import Icon from "../action/Icon.vue";
import type { PbIconName } from "../_shared/icons";
import SwitchControl from "../input/SwitchControl.vue";
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    value?: string;
    icon?: string;
    navigation?: boolean;
    modelValue?: boolean | null;
    disabled?: boolean;
    inspectId?: string;
    pbKey?: string;
  }>(),
  {
    title: "提醒通知",
    description: "在目标时间提醒",
    value: "每天",
    icon: "bell",
    navigation: true,
    disabled: false,
    modelValue: null,
  },
);
const emit = defineEmits<{
  select: [value: unknown];
  "update:modelValue": [value: boolean];
}>();
const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.list-cell",
  () => props.pbKey,
);

usePbInspect({
  element: rootRef,
  pbId: "ds.list-cell",
  componentId: "list-cell",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    surface: "color.surface",
    color: "color.on-surface",
    muted: "color.on-surface-muted",
    gap: "spacing.sm",
    typography: "typography.content",
    padding: "spacing.md",
    border: "border.hairline",
    target: "size.touch",
    title: "typography.content",
    detail: "typography.caption",
    focus: "border.focus",
    disabledOpacity: "opacity.disabled",
    focusOffset: "spacing.xxs",
  }),
});
</script>
<template>
  <div
    ref="rootRef"
    class="cell"
    data-pb-role="list-item"
    role="listitem"
    :aria-disabled="disabled"
    :style="
      pbStyle({
        color: 'color.on-surface',
        background: 'color.surface',
        padding: 'spacing.md',
        gap: 'spacing.sm',
      })
    "
  >
    <slot name="leading"><Icon v-if="icon" :name="icon as PbIconName" /></slot>
    <button
      v-if="navigation && modelValue === null"
      type="button"
      class="main"
      :disabled="Boolean(disabled)"
      @click="emit('select', title)"
    >
      <span
        v-pb="
          part('title', 'text', {
            typography: 'typography.content',
            color: 'color.on-surface',
          })
        "
        >{{ title }}</span
      ><span
        v-if="description"
        v-pb="
          part('description', 'text', {
            typography: 'typography.caption',
            color: 'color.on-surface-muted',
          })
        "
        >{{ description }}</span
      >
    </button>
    <div v-else class="main">
      <span
        v-pb="
          part('title', 'text', {
            typography: 'typography.content',
            color: 'color.on-surface',
          })
        "
        >{{ title }}</span
      ><span
        v-if="description"
        v-pb="
          part('description', 'text', {
            typography: 'typography.caption',
            color: 'color.on-surface-muted',
          })
        "
        >{{ description }}</span
      >
    </div>
    <span
      v-if="value"
      v-pb="
        part('value', 'text', {
          typography: 'typography.caption',
          color: 'color.on-surface-muted',
        })
      "
      >{{ value }}</span
    >
    <SwitchControl
      v-if="modelValue !== null"
      :label="props.title"
      :model-value="Boolean(modelValue)"
      :disabled="Boolean(disabled)"
      :inspect-id="`${inspectId ?? 'ds.list-cell'}.switch${pbKey ? '.' + pbKey : ''}`"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <Icon v-else-if="navigation" name="chevron-right" />
  </div>
</template>
<style scoped>
.cell {
  display: flex;
  align-items: center;
  min-height: var(--pb-size-touch);
  border-bottom: var(--pb-border-hairline);
}
.main {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  align-items: flex-start;
  gap: var(--pb-spacing-sm);
  min-width: var(--pb-layout-zero);
  overflow-wrap: anywhere;
}
.main:is(button) {
  text-align: start;
  min-height: var(--pb-size-touch);
  padding: var(--pb-layout-zero);
  border: none;
  background: transparent;
  cursor: pointer;
}
.cell[aria-disabled="true"] {
  opacity: var(--pb-opacity-disabled);
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
