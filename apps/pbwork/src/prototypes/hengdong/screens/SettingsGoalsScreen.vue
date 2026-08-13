<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Divider from "@/design-system/components/display/Divider.vue";
import Progress from "@/design-system/components/display/ProgressIndicator.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import Confirm from "@/design-system/components/feedback/ConfirmDialog.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import Menu from "@/design-system/components/input/Menu.vue";
import SwitchControl from "@/design-system/components/input/SwitchControl.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import HengdongShell from "../HengdongShell.vue";
import { recordsInWeek } from "../model";
import { replaceHengdongScreen } from "../nav";
import {
  hengdongState,
  logoutHengdong,
  resetHengdongData,
  saveGoals,
  setThemePreference,
} from "../storage";
import "../hengdong.css";

const route = useRoute();
const router = useRouter();
const weeklySessions = ref(`每周 ${hengdongState.goals.weeklySessions} 次`);
const reminderEnabled = ref(hengdongState.goals.reminderEnabled);
const reminderTime = ref(hengdongState.goals.reminderTime);
const toast = ref(false);
const logoutOpen = ref(false);
const resetOpen = ref(false);
const theme = computed({
  get: () => (route.query.theme === "dark" ? "dark" : "light"),
  set: (value: "light" | "dark") => {
    setThemePreference(value);
    void router.replace({ query: { ...route.query, theme: value } });
  },
});
const weekCount = computed(() => recordsInWeek(hengdongState.records).length);
const targetProgress = computed(() =>
  Math.min(
    100,
    Math.round((weekCount.value / hengdongState.goals.weeklySessions) * 100),
  ),
);

function save() {
  saveGoals({
    weeklySessions: Number.parseInt(
      weeklySessions.value.replace("每周 ", ""),
      10,
    ),
    reminderEnabled: reminderEnabled.value,
    reminderTime: reminderTime.value,
  });
  toast.value = true;
}

function logout() {
  logoutHengdong();
  void replaceHengdongScreen(router, route, "login");
}

function reset() {
  resetHengdongData();
  weeklySessions.value = `每周 ${hengdongState.goals.weeklySessions} 次`;
  reminderEnabled.value = hengdongState.goals.reminderEnabled;
  reminderTime.value = hengdongState.goals.reminderTime;
  void router.replace({ query: { ...route.query, theme: "light" } });
  toast.value = true;
}
</script>

<template>
  <HengdongShell
    title="设置与目标"
    screen-id="hengdong.settings-goals"
    back-to="today"
    dense
  >
    <section
      class="hd-page"
      data-pb-id="hengdong.settings-goals.root"
      data-pb-role="page"
      data-pb-token-background="color.background"
      data-pb-token-color="color.on-background"
    >
      <ScrollableDataList
        class="hd-scroll"
        :pull-refresh="false"
        :load-more="false"
        inspect-id="hengdong.settings-goals.scroll-list"
      >
        <form
          class="hd-content"
          data-pb-id="hengdong.settings-goals.form"
          data-pb-role="form"
          data-pb-token-spacing="spacing.xl"
          @submit.prevent="save"
        >
          <section
            class="hd-settings-section"
            data-pb-id="hengdong.settings-goals.target"
            data-pb-role="summary"
            data-pb-token-spacing="spacing.md"
          >
            <div class="hd-row-main">
              <span class="hd-overline">本周目标</span>
              <h1 class="hd-display hd-display-compact">
                已完成 {{ weekCount }} 次
              </h1>
            </div>
            <Progress
              :value="targetProgress"
              :label="`${weekCount} / ${hengdongState.goals.weeklySessions} 次`"
              inspect-id="hengdong.settings-goals.progress"
            />
            <Menu
              v-model="weeklySessions"
              label="每周活动次数"
              :options="['每周 2 次', '每周 3 次', '每周 4 次', '每周 5 次']"
              inspect-id="hengdong.settings-goals.weekly"
            />
          </section>

          <Divider inspect-id="hengdong.settings-goals.divider.reminder" />

          <section class="hd-settings-section">
            <div class="hd-row-main">
              <h2>轻提醒</h2>
              <p class="hd-caption">原型只记录本地偏好，不请求系统通知权限。</p>
            </div>
            <SwitchControl
              v-model="reminderEnabled"
              label="开启每日提醒"
              inspect-id="hengdong.settings-goals.reminder-enabled"
            />
            <TextField
              v-model="reminderTime"
              label="提醒时间"
              :show-label="true"
              :disabled="!reminderEnabled"
              inspect-id="hengdong.settings-goals.reminder-time"
            />
          </section>

          <Divider inspect-id="hengdong.settings-goals.divider.theme" />

          <section class="hd-settings-section">
            <div class="hd-row-main">
              <h2>外观</h2>
              <p class="hd-caption">切换后立即预览，并保存在当前设备。</p>
            </div>
            <div
              class="hd-period period-segment"
              data-no-swipe
              data-pb-id="hengdong.settings-goals.theme"
              data-pb-role="filter"
              data-pb-token-background="color.surface-recessed"
              data-pb-token-radius="radius.md"
              data-pb-token-spacing="spacing.xs"
            >
              <button
                type="button"
                :class="{ 'is-active': theme === 'light' }"
                @click="theme = 'light'"
              >
                浅色
              </button>
              <button
                type="button"
                :class="{ 'is-active': theme === 'dark' }"
                @click="theme = 'dark'"
              >
                深色
              </button>
            </div>
          </section>

          <Button
            label="保存目标与提醒"
            block
            type="submit"
            inspect-id="hengdong.settings-goals.save"
            data-pb-action="save-settings"
            @click="save"
          />

          <Divider inspect-id="hengdong.settings-goals.divider.data" />

          <section class="hd-settings-section hd-danger-zone">
            <div class="hd-row-main">
              <h2>本地数据</h2>
              <p class="hd-caption">
                退出不会删除记录；重置会恢复固定演示数据。
              </p>
            </div>
            <Button
              label="退出登录"
              bg-color="color.surface"
              border-color="color.border"
              text-color="color.on-surface"
              inspect-id="hengdong.settings-goals.logout"
              @click="logoutOpen = true"
            />
            <Button
              label="重置演示数据"
              bg-color="color.error-soft"
              border-color="color.error-soft"
              text-color="color.error"
              inspect-id="hengdong.settings-goals.reset"
              @click="resetOpen = true"
            />
          </section>
        </form>
      </ScrollableDataList>

      <Confirm
        v-model="logoutOpen"
        title="退出当前账号？"
        message="训练记录仍保留在此设备，下次登录可以继续查看。"
        confirm-label="退出登录"
        inspect-id="hengdong.settings-goals.logout-confirm"
        @confirm="logout"
      />
      <Confirm
        v-model="resetOpen"
        title="重置恒动演示数据？"
        message="自建计划、训练进度和本地账号都会恢复为初始状态。"
        confirm-label="确认重置"
        inspect-id="hengdong.settings-goals.reset-confirm"
        @confirm="reset"
      />
      <Toast
        v-model="toast"
        message="设置已更新"
        inspect-id="hengdong.settings-goals.toast"
      />
    </section>
  </HengdongShell>
</template>
