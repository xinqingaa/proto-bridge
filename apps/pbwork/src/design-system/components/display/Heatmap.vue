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
    days: () =>
      Array.from({ length: 84 }, (_, index) => ({
        date: new Date(Date.UTC(2026, 4, 4 + index)).toISOString().slice(0, 10),
        value: index % 5 === 0 ? 0 : (index * 3) % 7,
      })),
    modelValue: "2026-07-12",
  },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.heatmap",
  () => props.pbKey,
);

const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const selectedDay = computed(() =>
  props.days.find((d) => d.date === props.modelValue),
);
function monthLabel(index: number) {
  const first = weeks.value[index]?.find((d) => d.date.slice(-2) === "01");
  return first
    ? `${Number(first.date.slice(5, 7))}月`
    : index === 0
      ? `${Number(weeks.value[0]![0]!.date.slice(5, 7))}月`
      : "";
}
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
    ? "transparent"
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
    missingBorder: "border.hairline",
    axis: "typography.micro",
    axisGap: "spacing.sm",
    legendCell: "size.icon-inline",
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
    missing: "transparent",
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
    <div v-else class="heatplot">
      <div class="weekday-axis" aria-hidden="true">
        <span class="month-label" /><span v-for="day in weekdays" :key="day">{{
          day
        }}</span>
      </div>
      <div class="weeks" data-horizontal-scroll data-no-swipe>
        <div v-for="(week, index) in weeks" :key="week[0]!.date" class="week">
          <span class="month-label" aria-hidden="true">{{
            monthLabel(index)
          }}</span>
          <button
            v-for="day in week"
            :key="day.date"
            type="button"
            :aria-label="`${day.date}：${day.value === null ? '无记录' : day.value}`"
            :title="`${day.date}：${day.value === null ? '无记录' : day.value}`"
            :aria-pressed="modelValue === day.date"
            :class="{
              selected: modelValue === day.date,
              'is-missing': day.value === null,
            }"
            v-pb="
              part(
                'day',
                'button',
                {
                  background: tone(day.value),
                  radius: 'radius.mark',
                  ...(day.value === null
                    ? { border: 'border.hairline' as const }
                    : {}),
                },
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
    </div>
    <div class="legend" aria-label="强度图例">
      <span>少</span><i class="zero" /><i class="low" /><i class="high" /><span
        >多</span
      ><span>描边为无记录</span>
    </div>
    <span
      v-pb="
        part('selection', 'text', {
          typography: 'typography.caption',
          color: 'color.on-surface-muted',
        })
      "
      >{{
        modelValue
          ? `${modelValue} · ${selectedDay ? selectedDay.value + " 次" : "无记录"}`
          : "选择日期查看记录"
      }}</span
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
  outline-offset: calc(var(--pb-layout-zero) - var(--pb-spacing-xxs));
}
.sr {
  position: absolute;
  clip-path: inset(var(--pb-layout-half));
  overflow: hidden;
  width: var(--pb-layout-zero);
  height: var(--pb-layout-zero);
}
</style>

<style scoped>
.heatplot {
  display: flex;
  gap: var(--pb-spacing-sm);
  min-width: var(--pb-layout-zero);
}
.weekday-axis {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-xs);
  flex: none;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-micro);
}
.weekday-axis span {
  height: var(--pb-size-icon);
  display: flex;
  align-items: center;
}
.month-label {
  height: var(--pb-size-icon);
  white-space: nowrap;
  font: var(--pb-typography-micro);
  color: var(--pb-color-on-surface-muted);
  display: flex;
  align-items: center;
}
.legend {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-xs);
  font: var(--pb-typography-micro);
  color: var(--pb-color-on-surface-muted);
}
.legend i {
  width: var(--pb-size-icon-inline);
  height: var(--pb-size-icon-inline);
  border-radius: var(--pb-radius-mark);
}
.legend .zero {
  background: var(--pb-color-surface-variant);
}
.legend .low {
  background: var(--pb-color-primary-soft);
}
.legend .high {
  background: var(--pb-color-primary);
}
.legend span:last-child {
  margin-left: auto;
}
.weeks {
  scrollbar-width: none;
}
.weeks::-webkit-scrollbar {
  display: none;
}
</style>

<style scoped>
.week button.is-missing {
  border: var(--pb-border-hairline);
}
</style>
