<script setup lang="ts">
import { computed, watchEffect } from "vue";
import type { ResolvedThemeTable } from "@proto-bridge/core/v2";
import type { PreviewDeviceSession } from "@/workbench/preview/model";
import Button from "@/design-system/components/action/Button.vue";
import YikeTextNavigation, {
  type YikeDestination,
} from "../components/YikeTextNavigation.vue";
import YikeFocusModes, {
  type YikeFocusMode,
} from "../components/YikeFocusModes.vue";
const props = defineProps<{
  device: PreviewDeviceSession;
  table: ResolvedThemeTable;
  states: Array<{ id: string; label: string }>;
}>();
watchEffect(() => {
  props.device.demo.session ??= {};
});
const session = computed(() => props.device.demo.session!);
const destination = computed<YikeDestination>({
  get: () =>
    ["focus", "checkin", "review"].includes(String(session.value.destination))
      ? (session.value.destination as YikeDestination)
      : "focus",
  set: (value) => {
    session.value.destination = value;
  },
});
const mode = computed<YikeFocusMode>({
  get: () =>
    ["pomodoro", "stopwatch", "countdown"].includes(String(session.value.mode))
      ? (session.value.mode as YikeFocusMode)
      : "pomodoro",
  set: (value) => {
    session.value.mode = value;
  },
});
const disabled = computed(() => session.value.disabled === true);
const face = computed(
  () => props.table.identity.theme as "mechanical" | "water" | "sundial",
);
function prepare(id: string) {
  session.value.disabled = id === "disabled";
  if (["focus", "checkin", "review"].includes(id))
    destination.value = id as YikeDestination;
  if (["pomodoro", "stopwatch", "countdown"].includes(id))
    mode.value = id as YikeFocusMode;
}
function reset() {
  props.device.demo.session = {};
}
</script>

<template>
  <div class="text-controls-preview">
    <div class="state-tools" aria-label="代表状态">
      <Button
        v-for="state in states"
        :key="state.id"
        :label="state.label"
        kind="outlined"
        size="sm"
        @click="prepare(state.id)"
      />
      <Button label="复位" kind="secondary" size="sm" @click="reset" />
    </div>
    <YikeFocusModes
      v-model="mode"
      :face="face"
      :disabled="disabled"
      :inspect-id="`preview.${device.id}.modes`"
    />
    <p role="status">
      {{
        destination === "focus"
          ? "专注"
          : destination === "checkin"
            ? "打卡"
            : "回顾"
      }}
      ·
      {{
        mode === "pomodoro"
          ? "番茄钟"
          : mode === "stopwatch"
            ? "正计时"
            : "倒计时"
      }}{{ disabled ? " · 已禁用" : "" }}
    </p>
    <YikeTextNavigation
      v-model="destination"
      :face="face"
      :inspect-id="`preview.${device.id}.navigation`"
    />
  </div>
</template>

<style scoped>
.text-controls-preview {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-lg);
}
.state-tools {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-xs);
}
p {
  font: var(--pb-typography-body-sm);
  color: var(--pb-color-on-surface-muted);
}
</style>
