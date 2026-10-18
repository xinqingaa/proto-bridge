<script setup lang="ts">
import { computed, watchEffect } from "vue";
import type { ResolvedThemeTable } from "@proto-bridge/core/v2";
import type { PreviewDeviceSession } from "@/workbench/preview/model";
import Button from "@/design-system/components/action/Button.vue";
import YikeWeekChart from "../components/YikeWeekChart.vue";
const props = defineProps<{
  device: PreviewDeviceSession;
  table: ResolvedThemeTable;
  states: Array<{ id: string; label: string }>;
}>();
watchEffect(() => {
  props.device.demo.session ??= {};
});
const session = computed(() => props.device.demo.session!);
const selected = computed({
  get: () => String(session.value.selectedDate ?? ""),
  set: (value) => {
    session.value.selectedDate = value;
  },
});
const face = computed(
  () => props.table.identity.theme as "mechanical" | "water" | "sundial",
);
const days = computed(() =>
  [25, 80, 0, 125, 50, 0, 0].map((minutes, index) => ({
    date: `2026-10-${12 + index}`,
    minutes:
      session.value.reviewState === "zero"
        ? 0
        : session.value.reviewState === "large"
          ? minutes * 4
          : minutes,
  })),
);
function prepare(id: string) {
  session.value.reviewState = id;
  selected.value = id === "selected" ? "2026-10-15" : "";
}
</script>
<template>
  <section class="review-preview">
    <div class="tools">
      <Button
        v-for="state in states"
        :key="state.id"
        :label="state.label"
        kind="outlined"
        size="sm"
        @click="prepare(state.id)"
      /><Button
        label="复位"
        kind="secondary"
        size="sm"
        @click="prepare('week')"
      />
    </div>
    <YikeWeekChart
      v-model="selected"
      :face="face"
      :days="days"
      week-start="2026-10-12"
      today="2026-10-16"
      :inspect-id="`preview.${device.id}.week`"
    />
    <p role="status">
      {{
        selected
          ? `${selected} · ${days.find((day) => day.date === selected)?.minutes ?? 0} 分钟；再次选择可收起`
          : "选择日期查看分钟数，未来日期禁用。此处为固定资源夹具。"
      }}
    </p>
  </section>
</template>
<style scoped>
.review-preview {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-lg);
}
.tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-xs);
}
p {
  font: var(--pb-typography-content);
  color: var(--pb-color-on-surface-muted);
}
</style>
