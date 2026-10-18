<script setup lang="ts">
import SegmentedControl from "@/design-system/components/input/SegmentedControl.vue";
export type YikeFocusMode = "pomodoro" | "stopwatch" | "countdown";
defineProps<{
  modelValue: YikeFocusMode;
  inspectId: string;
  face?: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [YikeFocusMode] }>();
const modes = [
  { id: "pomodoro", label: "番茄钟" },
  { id: "stopwatch", label: "正计时" },
  { id: "countdown", label: "倒计时" },
];
function choose(value: string) {
  if (value === "pomodoro" || value === "stopwatch" || value === "countdown")
    emit("update:modelValue", value);
}
</script>
<template>
  <SegmentedControl
    material="glass"
    label="计时模式"
    :items="modes"
    :model-value="modelValue"
    :disabled="Boolean(disabled)"
    :inspect-id="inspectId"
    @update:model-value="choose"
  />
</template>
