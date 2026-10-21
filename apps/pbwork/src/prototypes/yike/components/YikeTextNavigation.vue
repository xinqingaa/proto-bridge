<script setup lang="ts">
import { resolvePbIcon } from "@/design-system/components/_shared/icons";
const Timer = resolvePbIcon("yike-mode-stopwatch");
const CircleCheck = resolvePbIcon("circle-check");
const ChartColumn = resolvePbIcon("chart-column");
import Tabbar from "@/design-system/components/navigation/Tabbar.vue";
export type YikeDestination = "focus" | "checkin" | "review";
defineProps<{
  modelValue: YikeDestination;
  inspectId: string;
  face?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [YikeDestination] }>();
const destinations = [
  { value: "focus", label: "专注", icon: Timer },
  { value: "checkin", label: "打卡", icon: CircleCheck },
  { value: "review", label: "回顾", icon: ChartColumn },
];
function choose(value: string) {
  if (value === "focus" || value === "checkin" || value === "review")
    emit("update:modelValue", value);
}
</script>
<template>
  <Tabbar
    :model-value="modelValue"
    :items="destinations"
    :inspect-id="inspectId"
    @update:model-value="choose"
  />
</template>
