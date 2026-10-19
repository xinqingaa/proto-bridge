<script setup lang="ts">
import { computed } from "vue";
import WheelPicker from "@/design-system/components/input/WheelPicker.vue";
const props = withDefaults(
  defineProps<{
    label?: string;
    modelValue?: number;
    minuteStep?: 1 | 5 | 15 | 30;
    min?: number;
    max?: number;
    disabled?: boolean;
    inspectId: string;
  }>(),
  {
    label: "时长",
    modelValue: 25,
    minuteStep: 1,
    min: 1,
    max: 1439,
    disabled: false,
  },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
const lower = computed(() =>
  Math.min(
    1439,
    Math.max(
      0,
      Math.ceil(
        (Number.isFinite(props.min) ? props.min : 0) / props.minuteStep,
      ) * props.minuteStep,
    ),
  ),
);
const upper = computed(() =>
  Math.max(
    lower.value,
    Math.min(
      1439,
      Math.floor(
        (Number.isFinite(props.max) ? props.max : 1439) / props.minuteStep,
      ) * props.minuteStep,
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
          props.minuteStep,
      ) * props.minuteStep,
    ),
  ),
);
const selectedHour = computed(() => Math.floor(safeValue.value / 60));
const selectedMinute = computed(() => safeValue.value % 60);
const allowed = computed(() =>
  Array.from(
    { length: Math.floor((upper.value - lower.value) / props.minuteStep) + 1 },
    (_, i) => lower.value + i * props.minuteStep,
  ),
);
const hours = computed(() =>
  [...new Set(allowed.value.map((value) => Math.floor(value / 60)))].map(
    (value) => ({ value, label: String(value) }),
  ),
);
const minutes = computed(() =>
  allowed.value
    .filter((value) => Math.floor(value / 60) === selectedHour.value)
    .map((value) => ({
      value: value % 60,
      label: String(value % 60).padStart(2, "0"),
    })),
);
function selectHour(value: string | number) {
  const candidates = allowed.value.filter(
    (total) => Math.floor(total / 60) === Number(value),
  );
  const nearest = candidates.reduce((a, b) =>
    Math.abs((a % 60) - selectedMinute.value) <=
    Math.abs((b % 60) - selectedMinute.value)
      ? a
      : b,
  );
  emit("update:modelValue", nearest);
}
function selectMinute(value: string | number) {
  emit("update:modelValue", selectedHour.value * 60 + Number(value));
}

const columns = computed(() => [
  {
    id: "hour",
    label: "小时",
    unit: "小时",
    numeric: true,
    options: hours.value,
  },
  {
    id: "minute",
    label: "分钟",
    unit: "分钟",
    numeric: true,
    options: minutes.value,
  },
]);
function select(values: Array<string | number>) {
  if (Number(values[0]) !== selectedHour.value) selectHour(values[0]!);
  else selectMinute(values[1]!);
}
</script>
<template>
  <WheelPicker
    :columns="columns"
    :model-value="[selectedHour, selectedMinute]"
    :label="label ?? '时长'"
    :disabled="Boolean(disabled)"
    :inspect-id="inspectId"
    @update:model-value="select"
  />
</template>
