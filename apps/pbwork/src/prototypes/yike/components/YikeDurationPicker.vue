<script setup lang="ts">
import { computed } from "vue";
import WheelPicker from "@/design-system/components/input/WheelPicker.vue";
const props = withDefaults(
  defineProps<{
    label?: string;
    modelValue?: number;
    precision?: "minute" | "second";
    minuteStep?: 1 | 5 | 15 | 30;
    min?: number;
    max?: number;
    disabled?: boolean;
    inspectId: string;
  }>(),
  {
    label: "时长",
    modelValue: 25,
    precision: "minute",
    minuteStep: 1,
    min: 1,
    max: 1439,
    disabled: false,
  },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
// Values use minutes by default; only second-precision callers opt into seconds.
const secondPrecision = computed(() => props.precision === "second");
const limit = computed(() => (secondPrecision.value ? 86399 : 1439));
const step = computed(() => (secondPrecision.value ? 1 : props.minuteStep));
const lower = computed(() =>
  Math.min(
    limit.value,
    Math.max(
      0,
      Math.ceil((Number.isFinite(props.min) ? props.min : 0) / step.value) *
        step.value,
    ),
  ),
);
const upper = computed(() =>
  Math.max(
    lower.value,
    Math.min(
      limit.value,
      Math.floor(
        (Number.isFinite(props.max) ? props.max : limit.value) / step.value,
      ) * step.value,
    ),
  ),
);
const safeValue = computed(() =>
  Math.max(
    lower.value,
    Math.min(
      upper.value,
      Math.floor(
        (Number.isFinite(props.modelValue) ? props.modelValue : lower.value) /
          step.value,
      ) * step.value,
    ),
  ),
);
const factors = computed(() =>
  secondPrecision.value ? [3600, 60, 1] : [60, 1],
);
const selected = computed(() =>
  factors.value.map((factor, index) =>
    index === 0
      ? Math.floor(safeValue.value / factor)
      : Math.floor(safeValue.value / factor) % 60,
  ),
);
function optionBounds(index: number, value: number) {
  const factor = factors.value[index]!;
  const higher = index === 0 ? 0 : factors.value[index - 1]!;
  const prefix = higher ? Math.floor(safeValue.value / higher) * higher : 0;
  return {
    low:
      Math.ceil(Math.max(lower.value, prefix + value * factor) / step.value) *
      step.value,
    high:
      Math.floor(
        Math.min(upper.value, prefix + (value + 1) * factor - 1) / step.value,
      ) * step.value,
    prefix,
  };
}
const columns = computed(() =>
  factors.value.map((factor, index) => ({
    id: index === 0 ? "hour" : index === 1 ? "minute" : "second",
    label: index === 0 ? "小时" : index === 1 ? "分钟" : "秒",
    unit: index === 0 ? "小时" : index === 1 ? "分钟" : "秒",
    numeric: true,
    options: Array.from({ length: index === 0 ? 24 : 60 }, (_, value) => value)
      .filter((value) => {
        const bounds = optionBounds(index, value);
        return bounds.low <= bounds.high;
      })
      .map((value) => ({
        value,
        label: index === 0 ? String(value) : String(value).padStart(2, "0"),
      })),
  })),
);
function select(values: Array<string | number>) {
  const index = values.findIndex(
    (value, i) => Number(value) !== selected.value[i],
  );
  if (index < 0) return;
  const value = Number(values[index]);
  const bounds = optionBounds(index, value);
  const candidate =
    bounds.prefix +
    value * factors.value[index]! +
    (safeValue.value % factors.value[index]!);
  emit(
    "update:modelValue",
    Math.max(bounds.low, Math.min(bounds.high, candidate)),
  );
}
</script>
<template>
  <WheelPicker
    :columns="columns"
    :model-value="selected"
    :label="label ?? '时长'"
    :disabled="Boolean(disabled)"
    :inspect-id="inspectId"
    @update:model-value="select"
  />
</template>
