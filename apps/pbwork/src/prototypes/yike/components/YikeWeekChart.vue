<script setup lang="ts">
import { computed, useId } from "vue";
import {
  parseDay,
  shiftDay,
} from "@/design-system/components/_shared/calendar";
import artwork from "./review-artwork.json";
const props = defineProps<{
  inspectId: string;
  face: "mechanical" | "water" | "sundial";
  weekStart: string;
  today: string;
  days: Array<{ date: string; minutes: number }>;
  modelValue?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [string] }>();
const gradientId = `review-${useId().replace(/[^a-zA-Z0-9_-]/g, "-")}`;
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const bars = computed(() => {
  const first = parseDay(props.weekStart);
  if (!first || !parseDay(props.today)) return [];
  const monday = shiftDay(props.weekStart, -((first.getUTCDay() + 6) % 7))!;
  const values = new Map(
    props.days
      .filter((day) => parseDay(day.date))
      .map((day) => [
        day.date,
        Number.isFinite(day.minutes) ? Math.max(0, day.minutes) : 0,
      ]),
  );
  return weekdays.map((label, index) => {
    const date = shiftDay(monday, index)!;
    return {
      date,
      label,
      future: date > props.today,
      minutes: date > props.today ? 0 : (values.get(date) ?? 0),
    };
  });
});
const scale = computed(() =>
  Math.max(
    artwork.blockMinutes,
    Math.ceil(
      Math.max(0, ...bars.value.map((day) => day.minutes)) /
        artwork.blockMinutes,
    ) * artwork.blockMinutes,
  ),
);
function height(minutes: number) {
  return (minutes / scale.value) * artwork.height;
}
function blocks(minutes: number) {
  return Array.from(
    { length: Math.ceil(minutes / artwork.blockMinutes) },
    (_, index) => {
      const start = index * artwork.blockMinutes;
      const top = height(Math.min(minutes, start + artwork.blockMinutes));
      return {
        y: artwork.height - top,
        height: Math.max(
          0,
          top -
            height(start) -
            Math.min(artwork.blockGap, (top - height(start)) / 2),
        ),
      };
    },
  );
}
function select(date: string) {
  emit("update:modelValue", props.modelValue === date ? "" : date);
}
</script>
<template>
  <section
    class="week-chart"
    :class="`is-${face}`"
    :data-pb-id="inspectId"
    data-pb-role="chart"
    data-pb-token-color="color.primary"
    data-pb-token-gap="spacing.sm"
    aria-label="每日专注时长"
  >
    <p v-if="!bars.length" role="status">日期无效</p>
    <template v-else>
      <p class="scale">
        每格 {{ artwork.blockMinutes }} 分钟 · 满量程 {{ scale }} 分钟
      </p>
      <div class="columns">
        <button
          v-for="bar in bars"
          :key="bar.date"
          type="button"
          :disabled="bar.future"
          :class="{
            'is-selected': modelValue === bar.date,
            'is-today': bar.date === today,
            'is-dimmed': Boolean(modelValue) && modelValue !== bar.date,
          }"
          :aria-label="`${bar.date}，${bar.future ? '未来日期' : `${bar.minutes} 分钟`}`"
          :aria-pressed="!bar.future && modelValue === bar.date"
          :aria-current="bar.date === today ? 'date' : undefined"
          :data-pb-id="`${inspectId}.${bar.date}`"
          :data-pb-key="bar.date"
          data-pb-role="button"
          data-pb-token-typography="typography.caption"
          data-pb-token-color="color.on-surface-muted"
          data-pb-token-focus="border.focus"
          @click="select(bar.date)"
        >
          <span class="value">{{
            bar.minutes > 0 ? bar.minutes : bar.future ? "—" : "0"
          }}</span>
          <svg
            :viewBox="artwork.viewBox"
            :width="artwork.width"
            :height="artwork.height"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                :id="`${gradientId}-${bar.date}`"
                :x1="artwork.zero"
                :y1="artwork.full"
                :x2="artwork.zero"
                :y2="artwork.zero"
              >
                <stop :offset="artwork.zero" stop-color="currentColor" />
                <stop :offset="artwork.full" stop-color="currentColor" :stop-opacity="artwork.zero" />
              </linearGradient>
              <clipPath :id="`${gradientId}-${bar.date}-tube`">
                <rect
                  :width="artwork.width"
                  :height="artwork.height"
                  :rx="artwork.tubeRadius"
                />
              </clipPath>
            </defs>
            <template v-if="face === 'mechanical'">
              <rect
                v-for="(block, index) in blocks(bar.minutes)"
                :key="index"
                :y="block.y"
                :width="artwork.width"
                :height="block.height"
                fill="currentColor"
              />
              <path
                :d="`M0 ${artwork.height}H${artwork.width}`"
                class="baseline"
              />
            </template>
            <template v-else-if="face === 'water'">
              <rect
                class="tube"
                :width="artwork.width"
                :height="artwork.height"
                :rx="artwork.tubeRadius"
              />
              <rect
                :y="artwork.height - height(bar.minutes)"
                :width="artwork.width"
                :height="height(bar.minutes)"
                fill="currentColor"
                :clip-path="`url(#${gradientId}-${bar.date}-tube)`"
              />
            </template>
            <template v-else-if="bar.minutes > 0">
              <rect
                :x="artwork.inkX"
                :y="artwork.height - height(bar.minutes)"
                :width="artwork.inkWidth"
                :height="height(bar.minutes)"
                :fill="`url(#${gradientId}-${bar.date})`"
              />
              <path
                :d="`M${artwork.inkX} ${artwork.height - height(bar.minutes)}h${artwork.inkWidth}`"
                class="ink-cap"
              />
            </template>
          </svg>
          <span class="day">{{ bar.label }}</span>
        </button>
      </div>
    </template>
  </section>
</template>
<style scoped>
.week-chart {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  color: var(--pb-color-primary);
}
.columns {
  display: flex;
  gap: var(--pb-spacing-sm);
}
button {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-layout-zero);
  border: none;
  background: transparent;
  color: var(--pb-color-primary);
  cursor: pointer;
}
svg {
  max-inline-size: var(--pb-layout-fill);
  overflow: visible;
}
.value,
.day,
.scale {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
}
.scale {
  margin: var(--pb-layout-zero);
}
.value {
  min-block-size: var(--pb-spacing-md);
}
.is-today .day,
.is-selected .day,
.is-selected .value {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-caption-strong);
}
.is-dimmed svg,
button:disabled svg {
  opacity: var(--pb-opacity-disabled);
}
button:disabled {
  cursor: default;
}
button:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
  border-radius: var(--pb-radius-control-compact);
}
.baseline {
  stroke: var(--pb-color-outline);
  stroke-width: var(--pb-border-width);
}
.tube {
  fill: var(--pb-color-surface);
  stroke: var(--pb-color-divider);
  stroke-width: var(--pb-border-width);
}
.ink-cap {
  stroke: var(--pb-color-on-surface);
  stroke-width: var(--pb-border-width-strong);
}
.is-sundial svg {
  color: var(--pb-color-primary);
}
</style>
