<script setup lang="ts">
import { ref, watch } from "vue";
import Button from "@/design-system/components/basic/Button.vue";
import BottomSheet from "@/design-system/components/complex/BottomSheet.vue";
import type { LedgerRange } from "./mock";

const props = defineProps<{
  modelValue: boolean;
  range: LedgerRange;
  start: string;
  end: string;
  inspectId?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [boolean];
  apply: [
    value: { range: LedgerRange; start: string; end: string; label: string },
  ];
}>();

const draftRange = ref<LedgerRange>(props.range);
const draftStart = ref(props.start);
const draftEnd = ref(props.end);

const quickRanges: Array<{ value: LedgerRange; label: string; hint: string }> = [
  { value: "day", label: "日", hint: "今天" },
  { value: "week", label: "周", hint: "7月17日–23日" },
  { value: "month", label: "月", hint: "2026年7月" },
  { value: "year", label: "年", hint: "2026年" },
  { value: "custom", label: "自定义", hint: "选择起止日期" },
];

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    draftRange.value = props.range;
    draftStart.value = props.start;
    draftEnd.value = props.end;
  },
);

function choose(value: LedgerRange) {
  draftRange.value = value;
  const dates: Record<Exclude<LedgerRange, "custom">, [string, string]> = {
    day: ["2026-07-23", "2026-07-23"],
    week: ["2026-07-17", "2026-07-23"],
    month: ["2026-07-01", "2026-07-31"],
    year: ["2026-01-01", "2026-12-31"],
  };
  if (value !== "custom") {
    [draftStart.value, draftEnd.value] = dates[value];
  }
}

function apply() {
  const selected = quickRanges.find((item) => item.value === draftRange.value);
  const label =
    draftRange.value === "custom"
      ? `${draftStart.value || "开始"} 至 ${draftEnd.value || "结束"}`
      : selected?.hint ?? "选择时间";
  emit("apply", {
    range: draftRange.value,
    start: draftStart.value,
    end: draftEnd.value,
    label,
  });
  emit("update:modelValue", false);
}
</script>

<template>
  <BottomSheet
    :model-value="modelValue"
    title="选择时间范围"
    :inspect-id="inspectId || 'ledger-planet.date-range-sheet'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="sheet-content">
      <div class="quick-grid" data-no-swipe>
        <button
          v-for="item in quickRanges"
          :key="item.value"
          type="button"
          :class="{ active: draftRange === item.value }"
          @click="choose(item.value)"
        >
          <strong>{{ item.label }}</strong>
          <span>{{ item.hint }}</span>
        </button>
      </div>
      <div v-if="draftRange === 'custom'" class="date-fields">
        <label>
          <span>开始日期</span>
          <input v-model="draftStart" type="date" max="2026-12-31" />
        </label>
        <label>
          <span>结束日期</span>
          <input v-model="draftEnd" type="date" max="2026-12-31" />
        </label>
      </div>
      <p class="range-note">时间范围会同步作用于摘要、图表与流水结果。</p>
      <Button label="应用时间范围" block @click="apply" />
    </div>
  </BottomSheet>
</template>

<style scoped>
.sheet-content {
  display: grid;
  gap: var(--pb-spacing-md);
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--pb-spacing-sm);
}
.quick-grid button {
  display: grid;
  gap: var(--pb-spacing-xxs);
  padding: var(--pb-spacing-md);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  text-align: left;
  cursor: pointer;
}
.quick-grid button.active {
  border-color: var(--pb-color-primary);
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
}
.quick-grid strong {
  font: var(--pb-typography-subtitle);
}
.quick-grid span,
.range-note,
.date-fields label > span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.date-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--pb-spacing-sm);
}
.date-fields label {
  display: grid;
  gap: var(--pb-spacing-xs);
}
.date-fields input {
  min-width: 0;
  min-height: var(--pb-sizing-control-md);
  padding: 0 var(--pb-spacing-sm);
  border: 1px solid var(--pb-color-border);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.range-note {
  margin: 0;
}
</style>
