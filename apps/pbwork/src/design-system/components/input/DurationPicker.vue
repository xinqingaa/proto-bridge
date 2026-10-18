<script setup lang="ts">
import { computed, ref, watch, nextTick, onBeforeUnmount } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
const props = withDefaults(
  defineProps<{
    label?: string;
    modelValue?: number;
    minuteStep?: 1 | 5 | 15 | 30;
    disabled?: boolean;
    inspectId?: string;
    pbKey?: string;
  }>(),
  { label: "提醒间隔", modelValue: 90, minuteStep: 5, disabled: false },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
const rootRef = ref<HTMLElement | null>(null);

const wheelId = computed(
  () =>
    `${props.inspectId ?? "ds.duration-picker"}${props.pbKey ? "." + props.pbKey : ""}`,
);
const hours = Array.from({ length: 24 }, (_, index) => index);
const minutes = computed(() =>
  Array.from(
    { length: 60 / props.minuteStep },
    (_, index) => index * props.minuteStep,
  ),
);
const safeValue = computed(() =>
  Math.max(
    0,
    Math.min(
      1439,
      Number.isFinite(props.modelValue) ? Math.floor(props.modelValue) : 0,
    ),
  ),
);
const selectedHour = computed(() => Math.floor(safeValue.value / 60));
const selectedMinute = computed(
  () =>
    Math.floor((safeValue.value % 60) / props.minuteStep) * props.minuteStep,
);
const hourRef = ref<HTMLElement | null>(null),
  minuteRef = ref<HTMLElement | null>(null);
const settleDelay = useTokenNumber("motion.duration-short");
const rowSize = useTokenNumber("size.control");
const timers = new Map<string, ReturnType<typeof setTimeout>>();
function select(kind: "hour" | "minute", value: number) {
  if (props.disabled) return;
  const total =
    (kind === "hour" ? value : selectedHour.value) * 60 +
    (kind === "minute" ? value : selectedMinute.value);
  if (total !== safeValue.value) emit("update:modelValue", total);
}
function sync() {
  for (const [el, value] of [
    [hourRef.value, selectedHour.value],
    [minuteRef.value, selectedMinute.value],
  ] as const) {
    const item = el?.querySelector<HTMLElement>(`[data-value="${value}"]`);
    if (el && item)
      el.scrollTop = item.offsetTop - (el.clientHeight - item.clientHeight) / 2;
  }
}
function scroll(kind: "hour" | "minute", event: Event) {
  const el = event.currentTarget as HTMLElement;
  clearTimeout(timers.get(kind));
  timers.set(
    kind,
    setTimeout(() => {
      if (props.disabled) {
        sync();
        return;
      }
      const center = el.scrollTop + el.clientHeight / 2;
      const items = Array.from(
        el.querySelectorAll<HTMLElement>("[data-value]"),
      );
      const nearest = items.sort(
        (a, b) =>
          Math.abs(a.offsetTop + a.clientHeight / 2 - center) -
          Math.abs(b.offsetTop + b.clientHeight / 2 - center),
      )[0];
      if (nearest) select(kind, Number(nearest.dataset.value));
    }, settleDelay.value),
  );
}
function key(kind: "hour" | "minute", event: KeyboardEvent) {
  if (
    props.disabled ||
    !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
  )
    return;
  event.preventDefault();
  const values = kind === "hour" ? hours : minutes.value;
  const current = kind === "hour" ? selectedHour.value : selectedMinute.value;
  const index = values.indexOf(current);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? values.length - 1
        : Math.max(
            0,
            Math.min(
              values.length - 1,
              index + (event.key === "ArrowDown" ? 1 : -1),
            ),
          );
  select(kind, values[next]!);
}
watch(
  () => [props.modelValue, props.minuteStep, rowSize.value],
  () => void nextTick(sync),
  { immediate: true },
);
onBeforeUnmount(() => timers.forEach(clearTimeout));

usePbInspect({
  element: rootRef,
  pbId: "ds.duration-picker",
  componentId: "duration-picker",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    surface: "color.surface",
    surfaceRadius: "radius.surface",
    selectionRadius: "radius.control-compact",
    unit: "typography.caption",
    selectedFont: "typography.numeric-title",

    color: "color.on-surface",
    muted: "color.on-surface-muted",
    gap: "spacing.sm",
    typography: "typography.content",
    selection: "color.surface-selected",
    track: "color.surface-recessed",
    radius: "radius.control",
    padding: "spacing.xs",
    focus: "border.focus",
    disabledOpacity: "opacity.disabled",
    number: "typography.numeric-content",
    row: "size.control",
    settleDuration: "motion.duration-short",
  }),
});
</script>
<template>
  <div
    ref="rootRef"
    class="duration"
    data-pb-role="field"
    role="group"
    :aria-label="label"
    data-no-swipe
    :aria-disabled="disabled"
  >
    <div class="column">
      <span class="unit">小时</span>
      <div
        ref="hourRef"
        class="wheel"
        :class="{ disabled }"
        role="listbox"
        :tabindex="disabled ? -1 : 0"
        aria-label="小时"
        :aria-disabled="disabled"
        :aria-activedescendant="`${wheelId}-hour-${selectedHour}`"
        @scroll="scroll('hour', $event)"
        @keydown="key('hour', $event)"
      >
        <button
          v-for="hour in hours"
          :id="`${wheelId}-hour-${hour}`"
          :key="hour"
          :data-value="hour"
          role="option"
          :aria-selected="hour === selectedHour"
          :disabled="disabled"
          tabindex="-1"
          type="button"
          :class="{ selected: hour === selectedHour }"
          @click="select('hour', hour)"
        >
          {{ hour }}
        </button>
      </div>
    </div>
    <div class="column">
      <span class="unit">分钟</span>
      <div
        ref="minuteRef"
        class="wheel"
        :class="{ disabled }"
        role="listbox"
        :tabindex="disabled ? -1 : 0"
        aria-label="分钟"
        :aria-disabled="disabled"
        :aria-activedescendant="`${wheelId}-minute-${selectedMinute}`"
        @scroll="scroll('minute', $event)"
        @keydown="key('minute', $event)"
      >
        <button
          v-for="minute in minutes"
          :id="`${wheelId}-minute-${minute}`"
          :key="minute"
          :data-value="minute"
          role="option"
          :aria-selected="minute === selectedMinute"
          :disabled="disabled"
          tabindex="-1"
          type="button"
          :class="{ selected: minute === selectedMinute }"
          @click="select('minute', minute)"
        >
          {{ String(minute).padStart(2, "0") }}
        </button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.duration {
  display: flex;
  position: relative;
  padding: var(--pb-spacing-sm);
  border-radius: var(--pb-radius-surface);
  background: var(--pb-color-surface);
  gap: var(--pb-spacing-sm);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.column {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  flex-direction: column;
  min-width: var(--pb-layout-zero);
  gap: var(--pb-spacing-sm);
  text-align: center;
}
.wheel {
  position: relative;
  box-sizing: border-box;
  height: calc(var(--pb-size-control) * var(--pb-layout-wheel-visible-rows));
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  padding-block: var(--pb-size-control);
  border-radius: var(--pb-radius-control);
  background: transparent;
  scrollbar-width: none;
  mask-image: var(--pb-layout-wheel-mask);
}
.wheel.disabled {
  overflow: hidden;
  opacity: var(--pb-opacity-disabled);
}
button {
  display: block;
  width: var(--pb-layout-fill);
  height: var(--pb-size-control);
  scroll-snap-align: center;
  padding: var(--pb-spacing-xs);
  border: none;
  border-radius: var(--pb-radius-control);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-numeric-content);
  cursor: pointer;
}
button.selected {
  color: var(--pb-color-on-surface);
  background: transparent;
  font: var(--pb-typography-numeric-title);
}
.wheel:focus-visible {
  outline: var(--pb-border-focus);
}
</style>

<style scoped>
.duration::before {
  content: "";
  position: absolute;
  left: var(--pb-spacing-sm);
  right: var(--pb-spacing-sm);
  top: var(--pb-layout-half);
  height: var(--pb-size-control);
  transform: translateY(var(--pb-layout-half-negative));
  border-radius: var(--pb-radius-control-compact);
  background: var(--pb-color-surface-recessed);
}
.column {
  position: relative;
  gap: var(--pb-layout-zero);
}
.unit {
  position: absolute;
  top: var(--pb-layout-half);
  right: var(--pb-spacing-sm);
  transform: translateY(var(--pb-layout-half-negative));
  z-index: var(--pb-layer-content);
  font: var(--pb-typography-caption);
  pointer-events: none;
}
.wheel::-webkit-scrollbar {
  display: none;
}
</style>
