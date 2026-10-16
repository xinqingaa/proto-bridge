<script setup lang="ts">
import { computed } from "vue";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import SecondaryTabs from "@/design-system/components/navigation/SecondaryTabs.vue";
import DsTimerBody from "./DsTimerBody.vue";
import {
  TIMER_MODES,
  TODAY_LABEL,
  formatMinutes,
  type TimerMode,
  type YikeModel,
} from "../model";

const props = defineProps<{ model: YikeModel }>();
const emit = defineEmits<{ settings: []; abandon: [] }>();

const locked = computed(
  () =>
    props.model.timer.status === "running" ||
    props.model.timer.status === "paused",
);

function selectMode(value: string) {
  if (locked.value) return;
  props.model.setMode(value as TimerMode);
}
</script>

<template>
  <section class="yd-page" aria-label="专注">
    <AppBar
      title="专注"
      show-action
      action-icon="settings"
      inspect-id="yike-draft.focus.app-bar"
      @action="emit('settings')"
    />
    <p class="yd-context">
      {{ TODAY_LABEL }} · 今天已专注
      {{ formatMinutes(model.todayMinutes.value) }}
    </p>
    <SecondaryTabs
      class="yd-mode-tabs"
      :model-value="model.timer.mode"
      :items="TIMER_MODES"
      grow
      :swipe="!locked"
      :mouse-swipe="!locked"
      inspect-id="yike-draft.focus.modes"
      @update:model-value="selectMode"
    >
      <template v-for="item in TIMER_MODES" :key="item.value" #[item.value]>
        <DsTimerBody :model="model" @abandon="emit('abandon')" />
      </template>
    </SecondaryTabs>
  </section>
</template>
