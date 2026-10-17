<script setup lang="ts">
import { computed, ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { vPb, pbStyle } from "@/authoring/pb-style";
import { useComponentParts } from "../_shared/componentParts";
import { heatmapWeeks } from "../_shared/calendar";
const props = withDefaults(
  defineProps<{
    label?: string;
    days?: Array<{ date: string; value: number }>;
    modelValue?: string;
    inspectId?: string;
    pbKey?: string;
  }>(),
  {
    label: "每日完成记录",
    days: () => [
      { date: "2026-07-01", value: 1 },
      { date: "2026-07-02", value: 2 },
      { date: "2026-07-03", value: 3 },
      { date: "2026-07-04", value: 4 },
      { date: "2026-07-05", value: 0 },
      { date: "2026-07-06", value: 1 },
      { date: "2026-07-07", value: 2 },
      { date: "2026-07-08", value: 3 },
      { date: "2026-07-09", value: 4 },
      { date: "2026-07-10", value: 0 },
      { date: "2026-07-11", value: 1 },
      { date: "2026-07-12", value: 2 },
      { date: "2026-07-13", value: 3 },
      { date: "2026-07-14", value: 4 },
      { date: "2026-07-15", value: 0 },
      { date: "2026-07-16", value: 1 },
      { date: "2026-07-17", value: 2 },
      { date: "2026-07-18", value: 3 },
      { date: "2026-07-19", value: 4 },
      { date: "2026-07-20", value: 0 },
      { date: "2026-07-21", value: 1 },
      { date: "2026-07-22", value: 2 },
      { date: "2026-07-23", value: 3 },
      { date: "2026-07-24", value: 4 },
      { date: "2026-07-25", value: 0 },
      { date: "2026-07-26", value: 1 },
      { date: "2026-07-27", value: 2 },
      { date: "2026-07-28", value: 3 },
    ],
    modelValue: "2026-07-12",
  },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.heatmap",
  () => props.pbKey,
);

const weeks = computed(() => heatmapWeeks(props.days));
const max = computed(() =>
  Math.max(
    1,
    ...props.days
      .filter((item) => Number.isFinite(item.value))
      .map((item) => item.value),
  ),
);
function tone(value: number | null) {
  return value === null
    ? "color.surface-recessed"
    : value === 0
      ? "color.surface-variant"
      : value / max.value < 0.5
        ? "color.primary-soft"
        : "color.primary";
}

usePbInspect({
  element: rootRef,
  pbId: "ds.heatmap",
  componentId: "heatmap",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    color: "color.on-surface",
    muted: "color.on-surface-muted",
    gap: "spacing.sm",
    typography: "typography.content",
    empty: "color.surface-variant",
    low: "color.primary-soft",
    high: "color.primary",
    selected: "border.focus",
    cell: "size.icon",
    radius: "radius.mark",
    caption: "typography.caption",
    missing: "color.surface-recessed",
    cellGap: "spacing.xs",
    focusOffset: "spacing.xxs",
  }),
});
</script>
<template>
  <figure
    ref="rootRef"
    class="heatmap"
    data-pb-role="chart"
    :aria-label="label"
    :style="
      pbStyle({
        gap: 'spacing.sm',
        color: 'color.on-surface',
        typography: 'typography.content',
        margin: 'layout.zero',
      })
    "
  >
    <figcaption>{{ label }}</figcaption>
    <p v-if="!weeks.length" role="status">暂无数据</p>
    <div v-else class="weeks" data-horizontal-scroll data-no-swipe>
      <div v-for="week in weeks" :key="week[0]!.date" class="week">
        <button
          v-for="day in week"
          :key="day.date"
          type="button"
          :aria-label="`${day.date}：${day.value === null ? '无记录' : day.value}`"
          :title="`${day.date}：${day.value === null ? '无记录' : day.value}`"
          :aria-pressed="modelValue === day.date"
          :class="{ selected: modelValue === day.date }"
          v-pb="
            part(
              'day',
              'button',
              { background: tone(day.value), radius: 'radius.mark' },
              `day-${day.date}`,
            )
          "
          @click="emit('update:modelValue', day.date)"
        >
          <span class="sr">{{
            day.value === null ? "无记录" : day.value
          }}</span>
        </button>
      </div>
    </div>
    <span
      v-pb="
        part('selection', 'text', {
          typography: 'typography.caption',
          color: 'color.on-surface-muted',
        })
      "
      >{{ modelValue || "选择日期查看记录" }}</span
    >
  </figure>
</template>
<style scoped>
.heatmap {
  display: flex;
  flex-direction: column;
}
.weeks {
  display: flex;
  align-items: flex-start;
  gap: var(--pb-spacing-xs);
  max-width: var(--pb-layout-fill);
  overflow-x: auto;
}
.week {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-xs);
}
button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--pb-size-icon);
  height: var(--pb-size-icon);
  flex-shrink: var(--pb-layout-zero);
  padding: var(--pb-layout-zero);
  border: none;
  cursor: pointer;
}
.selected,
button:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
.sr {
  position: absolute;
  clip-path: inset(var(--pb-layout-half));
  overflow: hidden;
  width: var(--pb-layout-zero);
  height: var(--pb-layout-zero);
}
</style>
