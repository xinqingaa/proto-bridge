<script setup lang="ts">
import PrimaryTabs from "@/design-system/components/navigation/PrimaryTabs.vue";
export type YikeFocusMode = "pomodoro" | "stopwatch" | "countdown";
defineProps<{
  modelValue: YikeFocusMode;
  inspectId: string;
  face?: string;
  disabled?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [YikeFocusMode] }>();
const modes = [
  { value: "pomodoro", label: "番茄钟" },
  { value: "stopwatch", label: "正计时" },
  { value: "countdown", label: "倒计时" },
];
function choose(value: string) {
  if (value === "pomodoro" || value === "stopwatch" || value === "countdown")
    emit("update:modelValue", value);
}
</script>
<template>
  <PrimaryTabs
    :model-value="modelValue"
    :items="modes"
    :inspect-id="inspectId"
    :grow="true"
    :fill="true"
    :inert="Boolean(disabled)"
    :aria-disabled="Boolean(disabled)"
    @update:model-value="choose"
  >
    <template v-for="item in modes" :key="item.value" #[item.value]
      ><slot :name="item.value"
    /></template>
  </PrimaryTabs>
</template>
