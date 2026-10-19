<script setup lang="ts">
import Icon from "../action/Icon.vue";
import { computed, ref, watch, nextTick } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { vPb, pbStyle } from "@/authoring/pb-style";
import { useComponentParts } from "../_shared/componentParts";
import { monthDays, shiftMonth, shiftDay } from "../_shared/calendar";
const props = withDefaults(
  defineProps<{
    dayAppearance?: "default" | "custom";
    dayLabels?: Record<string, string>;
    showHeader?: boolean;
    label?: string;
    month?: string;
    modelValue?: string;
    disabledDates?: string[];
    today?: string;
    inspectId?: string;
    pbKey?: string;
  }>(),
  {
    label: "选择日期",
    dayAppearance: "default",
    showHeader: true,
    month: "2026-07",
    modelValue: "2026-07-28",
    today: "",
    disabledDates: () => ["2026-07-15"],
  },
);
const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:month": [value: string];
}>();
const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.month-calendar",
  () => props.pbKey,
);

const weeks = computed(() => monthDays(props.month));
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const enabled = computed(() =>
  weeks.value
    .flat()
    .filter(
      (day): day is string =>
        Boolean(day) && !props.disabledDates.includes(day!),
    ),
);
const focusDay = ref("");
const focusTarget = computed(() =>
  enabled.value.includes(focusDay.value)
    ? focusDay.value
    : enabled.value.includes(props.modelValue)
      ? props.modelValue
      : enabled.value[0],
);
watch(
  () => props.month,
  () => {
    focusDay.value = "";
  },
);
function select(day: string) {
  if (!props.disabledDates.includes(day)) emit("update:modelValue", day);
}
function moveMonth(count: number) {
  const next = shiftMonth(props.month, count);
  if (next) emit("update:month", next);
}
function key(event: KeyboardEvent, day: string) {
  const offsets: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };
  if (
    !Object.hasOwn(offsets, event.key) &&
    !["Home", "End"].includes(event.key)
  )
    return;
  event.preventDefault();
  let candidate =
    event.key === "Home"
      ? enabled.value[0]
      : event.key === "End"
        ? enabled.value[enabled.value.length - 1]
        : shiftDay(day, offsets[event.key]!);
  const direction = (offsets[event.key] ?? 1) < 0 ? -1 : 1;
  for (
    let count = 0;
    candidate?.startsWith(props.month) && count < 31;
    count++
  ) {
    if (enabled.value.includes(candidate)) {
      focusDay.value = candidate;
      void nextTick(() =>
        rootRef.value
          ?.querySelector<HTMLElement>(`[data-date="${candidate}"]`)
          ?.focus(),
      );
      return;
    }
    candidate = shiftDay(candidate, direction);
  }
}

usePbInspect({
  element: rootRef,
  pbId: "ds.month-calendar",
  componentId: "month-calendar",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    rowGap: "spacing.sm-plus",
    customRowGap: "spacing.xxs",
    headerGap: "spacing.sm",
    headerBorder: "border.hairline",
    heading: "typography.subtitle",
    number: "typography.numeric-content",
    todayWidth: "border.width",
    todayColor: "color.primary",
    dayRadius: "radius.pill",

    color: "color.on-surface",
    muted: "color.on-surface-muted",
    gap: "spacing.sm",
    typography: "typography.content",
    radius: "radius.control",
    padding: "spacing.xs",
    target: "size.touch",
    focus: "border.focus",
    disabledOpacity: "opacity.disabled",
    caption: "typography.caption",
    selectedColor: "color.on-primary",
    selectedSurface: "color.primary",
    cellGap: "spacing.xs",
    focusOffset: "spacing.xxs",
    weekdayHeight: "size.control-compact",
  }),
});
</script>
<template>
  <section
    ref="rootRef"
    class="calendar"
    :class="{ 'custom-days': dayAppearance === 'custom' }"
    data-pb-role="section"
    :aria-label="label"
    :style="
      pbStyle({
        gap: dayAppearance === 'custom' ? 'spacing.xxs' : 'spacing.sm',
        color: 'color.on-surface',
        typography: 'typography.content',
      })
    "
  >
    <header v-if="showHeader">
      <button
        type="button"
        aria-label="上个月"
        :disabled="!weeks.length"
        @click="moveMonth(-1)"
      >
        <Icon name="chevron-left" /></button
      ><strong aria-live="polite">{{
        weeks.length
          ? `${(props.month ?? "").slice(0, 4)}年 ${Number((props.month ?? "").slice(5))}月`
          : "无效月份"
      }}</strong
      ><button
        type="button"
        aria-label="下个月"
        :disabled="!weeks.length"
        @click="moveMonth(1)"
      >
        <Icon name="chevron-right" />
      </button>
    </header>
    <div class="row" aria-hidden="true">
      <span v-for="day in weekdays" :key="day">{{ day }}</span>
    </div>
    <div v-for="(week, index) in weeks" :key="index" class="row">
      <template v-for="(day, slot) in week" :key="day ?? `blank-${slot}`"
        ><button
          v-if="day"
          type="button"
          :data-date="day"
          :aria-label="props.dayLabels?.[day] ?? day"
          :disabled="props.disabledDates.includes(day)"
          :aria-pressed="modelValue === day"
          :tabindex="focusTarget === day ? 0 : -1"
          :class="{ selected: modelValue === day, today: props.today === day }"
          :aria-current="props.today === day ? 'date' : undefined"
          v-pb="
            part(
              'day',
              'button',
              {
                typography: 'typography.content',
                color:
                  dayAppearance === 'default' && modelValue === day
                    ? 'color.on-primary'
                    : 'color.on-surface',
              },
              `day-${day}`,
            )
          "
          @keydown="key($event, day)"
          @click="select(day)"
        >
          <slot
            name="day"
            :date="day"
            :selected="modelValue === day"
            :today="props.today === day"
            :disabled="props.disabledDates.includes(day)"
            >{{ Number(day.slice(-2)) }}</slot
          ></button
        ><span v-else aria-hidden="true"
      /></template>
    </div>
  </section>
</template>
<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  min-width: var(--pb-layout-zero);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
}
.row {
  display: flex;
  gap: var(--pb-spacing-xs);
}
.row > * {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: var(--pb-layout-flex-fill);
  box-sizing: border-box;
  padding: var(--pb-spacing-xs);
  min-width: var(--pb-layout-zero);
  min-height: var(--pb-size-touch);
}
button {
  min-width: var(--pb-layout-zero);
  min-height: var(--pb-size-touch);
  padding: var(--pb-spacing-xs);
  border: none;
  border-radius: var(--pb-radius-control);
  background: transparent;
  color: inherit;
  font: var(--pb-typography-numeric-content);
  cursor: pointer;
}
.calendar:not(.custom-days) .row .selected {
  background: var(--pb-color-primary);
  color: var(--pb-color-on-primary);
}
.row[aria-hidden] {
  font: var(--pb-typography-caption);
  color: var(--pb-color-on-surface-muted);
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

<style scoped>
.calendar {
  gap: var(--pb-spacing-sm-plus);
}
header {
  padding-bottom: var(--pb-spacing-sm);
  border-bottom: var(--pb-border-hairline);
}
header strong {
  font: var(--pb-typography-subtitle);
}
header button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--pb-size-touch);
  color: var(--pb-color-on-surface);
}
.calendar:not(.custom-days) .row .today:not(.selected) {
  box-shadow: inset var(--pb-layout-zero) var(--pb-layout-zero)
    var(--pb-layout-zero) var(--pb-border-width) var(--pb-color-primary);
  color: var(--pb-color-primary);
}
.row button {
  border-radius: var(--pb-radius-pill);
}
</style>

<style scoped>
.calendar.custom-days {
  gap: var(--pb-spacing-xxs);
}
.custom-days .row > * {
  padding: var(--pb-layout-zero);
}
</style>
