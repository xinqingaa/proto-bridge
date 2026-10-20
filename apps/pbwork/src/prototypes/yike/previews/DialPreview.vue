<script setup lang="ts">
import { computed, watchEffect } from "vue";
import type { ResolvedThemeTable } from "@proto-bridge/core/v2";
import type { PreviewDeviceSession } from "@/workbench/preview/model";
import Button from "@/design-system/components/action/Button.vue";
import YikeDial from "../components/YikeDial.vue";
const props = defineProps<{
  device: PreviewDeviceSession;
  table: ResolvedThemeTable;
  states: Array<{ id: string; label: string }>;
}>();
watchEffect(() => {
  props.device.demo.session ??= {};
});
const session = computed(() => props.device.demo.session!);
const state = computed(() => String(session.value.dialState ?? "idle"));
const samples = {
  idle: {
    fraction: 25 / 60,
    digits: "25:00",
    caption: "准备专注",
    tone: "idle",
  },
  run: {
    fraction: 18.7 / 60,
    elapsedMs: 18.7 * 60_000 + 600,
    digits: "18:42",
    caption: "专注中",
    tone: "run",
  },
  paused: {
    fraction: 12.5 / 60,
    digits: "12:30",
    caption: "已暂停",
    tone: "paused",
  },
  break: {
    fraction: 3 / 60,
    digits: "03:00",
    caption: "短休息",
    tone: "break",
  },
  done: {
    fraction: 0,
    digits: "00:00",
    caption: "本轮完成",
    tone: "done",
  },
  hour: {
    fraction: 1,
    digits: "1:00:00",
    caption: "倒计时",
    tone: "idle",
  },
  overtime: {
    fraction: 1,
    digits: "1:30:00",
    caption: "倒计时",
    note: "另有 30 分钟",
    tone: "idle",
  },
} as const;
const sample = computed(
  () => samples[state.value as keyof typeof samples] ?? samples.idle,
);
const face = computed(
  () => props.table.identity.theme as "mechanical" | "water" | "sundial",
);
</script>
<template>
  <section class="dial-preview">
    <div class="state-tools" aria-label="代表状态">
      <Button
        v-for="item in states"
        :key="item.id"
        :label="item.label"
        kind="outlined"
        size="sm"
        @click="session.dialState = item.id"
      />
      <Button
        label="复位"
        kind="secondary"
        size="sm"
        @click="session.dialState = 'idle'"
      />
    </div>
    <YikeDial
      v-bind="sample"
      :face="face"
      :inspect-id="`preview.${device.id}.dial`"
    />
    <p role="status">{{ sample.caption }} · {{ sample.digits }}</p>
  </section>
</template>
<style scoped>
.dial-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-lg);
}
.state-tools {
  display: flex;
  flex-wrap: wrap;
  align-self: stretch;
  gap: var(--pb-spacing-xs);
}
p {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-body-sm);
}
</style>
