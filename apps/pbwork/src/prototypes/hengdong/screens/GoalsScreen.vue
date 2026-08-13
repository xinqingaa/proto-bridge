<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Card from "@/design-system/components/display/Card.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import Menu from "@/design-system/components/input/Menu.vue";
import SwitchControl from "@/design-system/components/input/SwitchControl.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import HengdongShell from "../HengdongShell.vue";
import { getGoals, saveGoals } from "../storage";
import "../hengdong.css";

const route = useRoute();
const stored = getGoals();
const weeklySessions = ref(stored.weeklySessions);
const sessionMinutes = ref(stored.sessionMinutes);
const reminderTime = ref(stored.reminderTime);
const reminderEnabled = ref(stored.reminderEnabled);
const toast = ref(false);
const variant = computed(() => String(route.query.variant ?? "default"));

function save() {
  saveGoals({
    weeklySessions: weeklySessions.value,
    sessionMinutes: sessionMinutes.value,
    reminderTime: reminderTime.value,
    reminderEnabled: reminderEnabled.value,
  });
  toast.value = true;
}
</script>

<template>
  <HengdongShell
    title="目标与提醒"
    screen-id="hengdong.goals"
    back-to="profile"
  >
    <section
      class="hd-page"
      data-pb-id="hengdong.goals.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.goals.scroll-list"
        ><form
          class="hd-content"
          data-pb-id="hengdong.goals.form"
          data-pb-role="form"
          data-pb-token-spacing="spacing.md"
          @submit.prevent="save"
        >
          <Card
            semantic-role="summary"
            inspect-id="hengdong.goals.current-progress"
            ><div class="hd-card-body">
              <span class="hd-eyebrow">本周目标</span>
              <h1 class="hd-card-title">已完成 3 / 4 次</h1>
              <Progress :value="75" label="还差 1 次" /></div
          ></Card>
          <section class="hd-section">
            <h2 class="hd-section-title">训练目标</h2>
            <Menu
              v-model="weeklySessions"
              label="每周训练次数"
              :options="['2 次', '3 次', '4 次', '5 次']"
              inspect-id="hengdong.goals.weekly"
            /><Menu
              v-model="sessionMinutes"
              label="单次目标时长"
              :options="['15 分钟', '20 分钟', '30 分钟', '45 分钟']"
              inspect-id="hengdong.goals.duration"
            />
          </section>
          <section class="hd-section">
            <h2 class="hd-section-title">轻提醒</h2>
            <SwitchControl
              v-model="reminderEnabled"
              label="开启每日提醒"
              inspect-id="hengdong.goals.reminder-enabled"
            /><TextField
              v-model="reminderTime"
              label="提醒时间"
              :show-label="true"
              :disabled="!reminderEnabled"
              inspect-id="hengdong.goals.reminder-time"
            />
            <p class="hd-caption">
              提醒仅作为原型中的本地偏好，不会请求系统通知权限。
            </p>
          </section>
          <p
            v-if="variant === 'validation-error'"
            class="hd-goals-error"
            role="alert"
            data-pb-id="hengdong.goals.validation"
            data-pb-role="error-state"
            data-pb-token-color="color.error"
            data-pb-token-typography="typography.caption"
          >
            请选择合理目标并填写提醒时间。
          </p>
          <Button
            label="保存目标"
            block
            inspect-id="hengdong.goals.save"
            data-pb-action="save-goals"
            @click="save"
          /></form
      ></ScrollableDataList>
      <Toast
        v-model="toast"
        message="目标与提醒已保存"
        inspect-id="hengdong.goals.toast"
      />
    </section>
  </HengdongShell>
</template>

<style scoped>
.hd-goals-error {
  margin: var(--pb-spacing-none);
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
}
</style>
