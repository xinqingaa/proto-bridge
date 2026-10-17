<script setup lang="ts">
import { computed, ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { vPb, pbStyle } from "@/authoring/pb-style";
import { useComponentParts } from "../_shared/componentParts";

const props = withDefaults(
  defineProps<{
    label?: string;
    items?: Array<{ id: string; label: string; value: number }>;
    inspectId?: string;
    pbKey?: string;
  }>(),
  {
    label: "近七日完成次数",
    items: () => [
      { id: "mon", label: "一", value: 3 },
      { id: "tue", label: "二", value: 5 },
      { id: "wed", label: "三", value: 0 },
      { id: "thu", label: "四", value: 4 },
    ],
  },
);

const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.mini-bars",
  () => props.pbKey,
);

const normalized = computed(() =>
  props.items.map((item) => ({
    ...item,
    value: Number.isFinite(item.value) ? Math.max(0, item.value) : 0,
  })),
);
const maximum = computed(() =>
  Math.max(1, ...normalized.value.map((item) => item.value)),
);
function bar(value: number) {
  return { "--pb-bar-height": `${(value / maximum.value) * 100}%` };
}

usePbInspect({
  element: rootRef,
  pbId: "ds.mini-bars",
  componentId: "mini-bars",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    color: "color.on-surface",
    muted: "color.on-surface-muted",
    gap: "spacing.sm",
    typography: "typography.content",
    fill: "color.primary",
    track: "color.surface-variant",
    radius: "radius.mark",
    plot: "size.avatar-large",
    caption: "typography.caption",
  }),
});
</script>
<template>
  <figure
    ref="rootRef"
    class="mini"
    data-pb-role="chart"
    :aria-label="label"
    :style="
      pbStyle({
        color: 'color.on-surface',
        typography: 'typography.content',
        gap: 'spacing.sm',
        margin: 'layout.zero',
      })
    "
  >
    <figcaption>{{ label }}</figcaption>
    <span v-if="!props.items.length" role="status">暂无数据</span>
    <div v-else class="bars">
      <div v-for="item in normalized" :key="item.id" class="column">
        <span
          v-pb="
            part(
              'value',
              'text',
              { typography: 'typography.caption', color: 'color.on-surface' },
              item.id,
            )
          "
          >{{ item.value }}</span
        >
        <div
          class="track"
          v-pb="
            part(
              'bar',
              'status',
              { background: 'color.surface-variant', radius: 'radius.mark' },
              item.id,
            )
          "
        >
          <i
            :style="[
              pbStyle({ background: 'color.primary', radius: 'radius.mark' }),
              bar(item.value),
            ]"
            :aria-label="`${item.label}：${item.value}`"
          />
        </div>
        <span
          v-pb="
            part(
              'label',
              'text',
              {
                typography: 'typography.caption',
                color: 'color.on-surface-muted',
              },
              item.id,
            )
          "
          >{{ item.label }}</span
        >
      </div>
    </div>
  </figure>
</template>
<style scoped>
.mini {
  display: flex;
  flex-direction: column;
}
.bars {
  display: flex;
  gap: var(--pb-spacing-sm);
  align-items: flex-end;
}
.column {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-sm);
  min-width: var(--pb-layout-zero);
}
.track {
  display: flex;
  align-items: flex-end;
  height: var(--pb-size-avatar-large);
  width: var(--pb-layout-fill);
  border-radius: var(--pb-radius-mark);
  background: var(--pb-color-surface-variant);
}
.track i {
  display: block;
  width: var(--pb-layout-fill);
  height: var(--pb-bar-height);
}
</style>
