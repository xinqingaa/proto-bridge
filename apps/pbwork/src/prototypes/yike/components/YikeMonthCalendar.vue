<script setup lang="ts">
import MonthCalendar from "@/design-system/components/display/MonthCalendar.vue";
import { computed, useId } from "vue";
import {
  monthDays,
  parseDay,
} from "@/design-system/components/_shared/calendar";
import artwork from "./date-artwork.json";
import { resolvePbIcon } from "@/design-system/components/_shared/icons";
const MechanicalBezel = resolvePbIcon("yike-mechanical-calendar");
import {
  compositeOver,
  contrastRatio,
  parseThemeColor,
} from "@proto-bridge/core/v2";
import { reviewIntensity } from "./review-intensity";
import { useToken, useTokenNumber } from "@/design-system/theme/runtime-theme";
import { pbStyle } from "@/authoring/pb-style";
const intensityLow = useTokenNumber("opacity.data-low");
const intensityMedium = useTokenNumber("opacity.data-medium");
const intensityHigh = useTokenNumber("opacity.data-high");
const primary = useToken("color.primary");
const background = useToken("color.background");
const ink = useToken("color.on-surface");
const inverse = useToken("color.on-primary");
const props = defineProps<{
  inspectId: string;
  face: "mechanical" | "water" | "sundial";
  month: string;
  today: string;
  days: Array<{ date: string; minutes: number }>;
  modelValue?: string;
  showHeader?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [string];
  "update:month": [string];
}>();
const id = `month-${useId().replace(/[^a-zA-Z0-9_-]/g, "-")}`;
const weeks = computed(() =>
  parseDay(props.today) ? monthDays(props.month) : [],
);
const values = computed(
  () =>
    new Map(
      props.days
        .filter((day) => parseDay(day.date) && day.date <= props.today)
        .map((day) => [
          day.date,
          Number.isFinite(day.minutes) ? Math.max(0, day.minutes) : 0,
        ]),
    ),
);
const minutes = (date: string) => values.value.get(date) ?? 0;
const band = (date: string) =>
  date > props.today ? "none" : reviewIntensity(minutes(date));
const intensityToken = (date: string) =>
  band(date) === "none" ? undefined : `opacity.data-${band(date)}`;
const level = (date: string) =>
  ({
    none: 0,
    low: intensityLow.value,
    medium: intensityMedium.value,
    high: intensityHigh.value,
  })[band(date)];
function numberColor(date: string) {
  if (props.face === "mechanical")
    return minutes(date) > 0 ? "color.on-surface" : "color.on-surface-muted";
  if (minutes(date) === 0) return "color.on-surface-muted";
  const fill = parseThemeColor(String(primary.value))!;
  const paper = parseThemeColor(String(background.value))!;
  const normal = parseThemeColor(String(ink.value))!;
  const reversed = parseThemeColor(String(inverse.value))!;
  const intensity = level(date);
  // Read the actual band composite; submerged water digits share its fill.
  const surface = compositeOver({ ...fill, a: fill.a * intensity }, paper);
  return contrastRatio(reversed, surface) > contrastRatio(normal, surface)
    ? "color.on-primary"
    : "color.on-surface";
}
const waterLevel = (date: string) => artwork.waterLevels[band(date)];
const waterY = (date: string) =>
  artwork.cell.edge + artwork.cell.side * (artwork.full - waterLevel(date));
const aboveWaterColor = (date: string) =>
  minutes(date) > 0 ? "color.on-surface" : "color.on-surface-muted";
const select = (date: string) =>
  emit("update:modelValue", props.modelValue === date ? "" : date);
const disabledDates = computed(() =>
  weeks.value
    .flat()
    .filter((date): date is string => Boolean(date) && date! > props.today),
);
const dayLabels = computed(() =>
  Object.fromEntries(
    weeks.value
      .flat()
      .filter((date): date is string => Boolean(date))
      .map((date) => [
        date,
        `${date}${date === props.today ? "，今天" : ""}，${date > props.today ? "未来日期" : `${minutes(date)} 分钟`}`,
      ]),
  ),
);
</script>
<template>
  <MonthCalendar
    day-appearance="custom"
    :show-header="showHeader ?? true"
    :month="parseDay(today) ? month : ''"
    :today="today"
    :model-value="modelValue ?? ''"
    :disabled-dates="disabledDates"
    :day-labels="dayLabels"
    :inspect-id="inspectId"
    label="每日专注"
    @update:model-value="select"
    @update:month="emit('update:month', $event)"
  >
    <template #day="{ date, selected, today: isToday }"
      ><span
        class="date-artwork"
        :data-intensity="band(date)"
        :class="{
          'is-empty': minutes(date) === 0,
          'is-selected': selected,
          'is-water': face === 'water',
          'is-today': isToday,
        }"
      >
        <svg
          :viewBox="artwork.cell.viewBox"
          :width="artwork.cell.size"
          :height="artwork.cell.size"
          aria-hidden="true"
          :data-pb-id="`${inspectId}.mark`"
          :data-pb-key="`day-${date}`"
          data-pb-role="image"
          data-pb-token-color="color.primary"
          :data-pb-token-opacity="intensityToken(date)"
        >
          <defs>
            <filter
              v-if="face === 'sundial'"
              :id="`${id}-shadow-${date}`"
              filterUnits="userSpaceOnUse"
              :x="artwork.shadow.region.x"
              :y="artwork.shadow.region.y"
              :width="artwork.shadow.region.side"
              :height="artwork.shadow.region.side"
            >
              <feGaussianBlur :stdDeviation="artwork.shadow[band(date)]" />
            </filter>
            <clipPath :id="`${id}-water-${date}`">
              <rect
                :x="artwork.cell.edge"
                :y="waterY(date)"
                :width="artwork.cell.side"
                :height="artwork.cell.side * waterLevel(date)"
              />
            </clipPath>
            <clipPath :id="`${id}-${date}`">
              <circle
                :cx="artwork.cell.cx"
                :cy="artwork.cell.cy"
                :r="artwork.cell.radius"
              />
            </clipPath>
          </defs>
          <circle
            v-if="face === 'mechanical'"
            :cx="artwork.cell.cx"
            :cy="artwork.cell.cy"
            :r="artwork.cell.radius"
            fill="currentColor"
            :fill-opacity="level(date)"
            class="outline"
          />
          <template v-else-if="face === 'water'">
            <circle
              :cx="artwork.cell.cx"
              :cy="artwork.cell.cy"
              :r="artwork.cell.radius"
              class="vessel"
            />
            <rect
              :x="artwork.cell.edge"
              :y="waterY(date)"
              :width="artwork.cell.side"
              :height="artwork.cell.side * waterLevel(date)"
              fill="currentColor"
              :fill-opacity="level(date)"
              :clip-path="`url(#${id}-${date})`"
            />
          </template>
          <template v-else>
            <rect
              :x="artwork.cell.edge"
              :y="artwork.cell.edge"
              :width="artwork.cell.side"
              :height="artwork.cell.side"
              :rx="artwork.cell.corner"
              class="vessel"
            />
            <circle
              :cx="artwork.cell.cx"
              :cy="artwork.cell.cy"
              :r="artwork.cell.inkRadius"
              class="sun-shadow"
              :filter="`url(#${id}-shadow-${date})`"
              fill="currentColor"
              :fill-opacity="level(date)"
            />
          </template>
          <template v-if="selected">
            <rect
              v-if="face === 'sundial'"
              class="selection"
              :x="artwork.cell.edge"
              :y="artwork.cell.edge"
              :width="artwork.cell.side"
              :height="artwork.cell.side"
              :rx="artwork.cell.corner"
            />
            <circle
              v-else
              class="selection"
              :cx="artwork.cell.cx"
              :cy="artwork.cell.cy"
              :r="artwork.cell.radius"
            />
          </template>
          <MechanicalBezel
            v-if="face === 'mechanical'"
            :size="artwork.cell.size"
          />
          <text
            class="number"
            :x="artwork.cell.cx"
            :y="artwork.cell.cy"
            text-anchor="middle"
            dominant-baseline="central"
            :data-pb-id="`${inspectId}.number`"
            :data-pb-key="`day-${date}`"
            data-pb-role="text"
            :data-pb-token-typography="
              isToday ? 'typography.caption-strong' : 'typography.caption'
            "
            :data-pb-token-color="
              face === 'water' ? aboveWaterColor(date) : numberColor(date)
            "
            :style="
              pbStyle({
                color:
                  face === 'water' ? aboveWaterColor(date) : numberColor(date),
              })
            "
          >
            {{ Number(date.slice(-2)) }}
          </text>
          <text
            v-if="face === 'water' && minutes(date) > 0"
            class="submerged-number"
            :x="artwork.cell.cx"
            :y="artwork.cell.cy"
            text-anchor="middle"
            dominant-baseline="central"
            :clip-path="`url(#${id}-water-${date})`"
            :data-pb-id="`${inspectId}.submerged-number`"
            :data-pb-key="`day-${date}`"
            data-pb-role="text"
            :data-pb-token-color="numberColor(date)"
            :data-pb-token-typography="
              isToday ? 'typography.caption-strong' : 'typography.caption'
            "
            :style="pbStyle({ color: numberColor(date) })"
          >
            {{ Number(date.slice(-2)) }}
          </text>
          <svg
            v-if="isToday"
            class="today-mark"
            :data-face="face"
            :x="artwork.today.x"
            :y="artwork.today.y"
            :width="artwork.today.size"
            :height="artwork.today.size"
            :viewBox="artwork.today.viewBox"
            :data-pb-id="`${inspectId}.today-mark`"
            :data-pb-key="`day-${date}`"
            data-pb-role="image"
            data-pb-token-color="color.primary"
            data-pb-token-background="color.background"
            :stroke-width="artwork.today.strokeWidth"
          >
            <path class="today-pointer" :d="artwork.today.paths[face]" />
          </svg>
        </svg> </span
    ></template>
  </MonthCalendar>
</template>
<style scoped>
.date-artwork {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--pb-layout-fill);
  min-block-size: var(--pb-size-touch);
  color: var(--pb-color-primary);
}
.date-artwork > svg {
  position: absolute;
  max-inline-size: var(--pb-layout-fill);
}
.number,
.submerged-number {
  fill: currentColor;
  font: var(--pb-typography-caption);
}
.is-today .number,
.is-today .submerged-number {
  font: var(--pb-typography-caption-strong);
}
.today-pointer {
  fill: var(--pb-color-primary);
  stroke: var(--pb-color-background);
  stroke-linejoin: round;
}
.selection {
  fill: none;
  stroke: var(--pb-color-primary);
  stroke-width: var(--pb-border-width-strong);
}
.vessel {
  fill: transparent;
  stroke: var(--pb-color-divider);
  stroke-width: var(--pb-border-width);
}
.outline {
  stroke: none;
}
</style>
