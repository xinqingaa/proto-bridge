<script setup lang="ts">
import { ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { vPb, pbStyle } from "@/authoring/pb-style";
import { useComponentParts } from "../_shared/componentParts";
import DataList from "./DataList.vue";
import ListCell from "./ListCell.vue";
const props = withDefaults(
  defineProps<{
    groups?: Array<{
      id: string;
      title: string;
      items: Array<{
        id: string;
        title: string;
        description?: string;
        value?: string;
        icon?: string;
        navigation?: boolean;
        modelValue?: boolean;
        disabled?: boolean;
      }>;
    }>;
    inspectId?: string;
    pbKey?: string;
  }>(),
  {
    groups: () => [
      {
        id: "notifications",
        title: "通知",
        items: [
          {
            id: "daily",
            title: "每日提醒",
            description: "默认提醒时间",
            value: "08:00",
            navigation: true,
          },
        ],
      },
      {
        id: "privacy",
        title: "隐私",
        items: [{ id: "sync", title: "云端同步", modelValue: true }],
      },
    ],
  },
);
const emit = defineEmits<{
  select: [value: { groupId: string; itemId: string }];
  toggle: [value: { groupId: string; itemId: string; value: boolean }];
}>();
const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.grouped-list",
  () => props.pbKey,
);

usePbInspect({
  element: rootRef,
  pbId: "ds.grouped-list",
  componentId: "grouped-list",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    color: "color.on-surface",
    muted: "color.on-surface-muted",
    gap: "spacing.sm",
    typography: "typography.content",
    heading: "typography.caption-strong",
  }),
});
</script>
<template>
  <div
    ref="rootRef"
    class="grouped"
    data-pb-role="list"
    :style="
      pbStyle({
        gap: 'spacing.sm',
        color: 'color.on-surface',
        typography: 'typography.content',
      })
    "
  >
    <p v-if="!props.groups.length" role="status">暂无分组</p>
    <section v-for="group in groups" :key="group.id" class="group">
      <h3
        v-pb="
          part(
            'heading',
            'text',
            {
              typography: 'typography.caption-strong',
              color: 'color.on-surface-muted',
              margin: 'layout.zero',
            },
            group.id,
          )
        "
      >
        {{ group.title }}
      </h3>
      <DataList
        :inspect-id="`${inspectId ?? 'ds.grouped-list'}.group.${group.id}`"
        ><ListCell
          v-for="item in group.items"
          :key="item.id"
          v-bind="item"
          :inspect-id="`${inspectId ?? 'ds.grouped-list'}.row`"
          :pb-key="`${group.id}-${item.id}`"
          @select="emit('select', { groupId: group.id, itemId: item.id })"
          @update:model-value="
            emit('toggle', {
              groupId: group.id,
              itemId: item.id,
              value: $event,
            })
          "
      /></DataList>
    </section>
  </div>
</template>
<style scoped>
.grouped,
.group {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  min-width: var(--pb-layout-zero);
}
</style>
