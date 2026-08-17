<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "@/design-system/components/action/Button.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import ScrollableDataList from "@/design-system/components/data/ScrollableDataList.vue";
import DataList from "@/design-system/components/data/DataList.vue";
import Confirm from "@/design-system/components/feedback/ConfirmDialog.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import SwitchControl from "@/design-system/components/input/SwitchControl.vue";
import TextField from "@/design-system/components/input/TextField.vue";
import HengdongShell from "../HengdongShell.vue";
import { replaceHengdongScreen, replaceVariant } from "../nav";
import {
  hengdongState,
  logoutHengdong,
  resetHengdongData,
  saveGoals,
  setThemePreference,
} from "../storage";
import { weeklyTargetKey } from "../model";
import "../hengdong.css";

const WEEKLY_COUNTS = [2, 3, 4, 5] as const;

const route = useRoute();
const router = useRouter();
const variant = computed(() => String(route.query.variant ?? "default"));
const weeklySessions = ref(hengdongState.goals.weeklySessions);
const reminderEnabled = ref(
  variant.value === "reminder-off"
    ? false
    : hengdongState.goals.reminderEnabled,
);
const reminderTime = ref(hengdongState.goals.reminderTime);
const weeklyOpen = ref(variant.value === "weekly-open");
const reminderTimeOpen = ref(variant.value === "reminder-time-open");
const logoutOpen = ref(variant.value === "logout-confirm-open");
const resetOpen = ref(variant.value === "reset-confirm-open");
const leaving = ref(false);
const theme = computed({
  get: () => (route.query.theme === "dark" ? "dark" : "light"),
  set: (value: "light" | "dark") => {
    setThemePreference(value);
    void router.replace({ query: { ...route.query, theme: value } });
  },
});

watch(variant, (value) => {
  weeklyOpen.value = value === "weekly-open";
  reminderTimeOpen.value = value === "reminder-time-open";
  logoutOpen.value = value === "logout-confirm-open";
  resetOpen.value = value === "reset-confirm-open";
  if (value === "reminder-off") reminderEnabled.value = false;
});

function persistGoals() {
  saveGoals({
    weeklySessions: weeklySessions.value,
    reminderEnabled: reminderEnabled.value,
    reminderTime: reminderTime.value,
  });
}

function updateReminderEnabled(value: boolean) {
  reminderEnabled.value = value;
  persistGoals();
}

function updateReminderTime(value: string) {
  reminderTime.value = value;
  persistGoals();
}

function updateDarkMode(value: boolean) {
  theme.value = value ? "dark" : "light";
}

function setWeeklyOpen(open: boolean) {
  weeklyOpen.value = open;
  if (open) {
    void replaceVariant(router, route, "weekly-open");
    return;
  }
  if (variant.value === "weekly-open") {
    void replaceVariant(router, route, "default");
  }
}

function setReminderTimeOpen(open: boolean) {
  reminderTimeOpen.value = open;
  if (open) {
    void replaceVariant(router, route, "reminder-time-open");
    return;
  }
  if (variant.value === "reminder-time-open") {
    void replaceVariant(router, route, "default");
  }
}

function selectWeekly(count: number) {
  weeklySessions.value = count;
  persistGoals();
  setWeeklyOpen(false);
}

function setLogoutOpen(open: boolean) {
  logoutOpen.value = open;
  if (leaving.value) return;
  if (open) {
    void replaceVariant(router, route, "logout-confirm-open");
    return;
  }
  if (variant.value === "logout-confirm-open") {
    void replaceVariant(router, route, "default");
  }
}

function setResetOpen(open: boolean) {
  resetOpen.value = open;
  if (open) {
    void replaceVariant(router, route, "reset-confirm-open");
    return;
  }
  if (variant.value === "reset-confirm-open") {
    void replaceVariant(router, route, "default");
  }
}

function logout() {
  leaving.value = true;
  logoutHengdong();
  void replaceHengdongScreen(router, route, "login");
}

function reset() {
  resetHengdongData();
  weeklySessions.value = hengdongState.goals.weeklySessions;
  reminderEnabled.value = hengdongState.goals.reminderEnabled;
  reminderTime.value = hengdongState.goals.reminderTime;
  void router.replace({ query: { ...route.query, variant: "default", theme: "light" } });
}
</script>

<template>
  <HengdongShell
    title="设置"
    screen-id="hengdong.settings-goals"
    back-to="today"
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
        <div
          class="hd-settings"
          data-pb-id="hengdong.settings-goals.content"
          data-pb-role="section"
          data-pb-token-spacing="spacing.md"
        >
          <section
            class="hd-settings-group"
            data-pb-id="hengdong.settings-goals.training"
            data-pb-role="section"
            data-pb-token-spacing="spacing.xs"
          >
            <h2
              class="hd-settings-heading"
              data-pb-id="hengdong.settings-goals.training-heading"
              data-pb-role="text"
              data-pb-token-color="color.on-surface-muted"
              data-pb-token-typography="typography.caption"
            >
              训练
            </h2>
            <DataList
              rounded="md"
              inspect-id="hengdong.settings-goals.training-list"
            >
              <button
                type="button"
                class="hd-settings-row"
                data-pb-id="hengdong.settings-goals.weekly"
                data-pb-role="button"
                data-pb-token-spacing="spacing.md"
                data-pb-action="open-weekly-target"
                @click="setWeeklyOpen(true)"
              >
                <span
                  class="hd-settings-row__label"
                  data-pb-id="hengdong.settings-goals.weekly-label"
                  data-pb-role="text"
                  data-pb-token-color="color.on-surface"
                  data-pb-token-typography="typography.content"
                >
                  每周活动
                </span>
                <span
                  class="hd-settings-row__value"
                  data-pb-id="hengdong.settings-goals.weekly-value"
                  data-pb-role="text"
                  data-pb-token-color="color.on-surface-muted"
                  data-pb-token-typography="typography.content"
                >
                  {{ weeklySessions }} 次
                </span>
                <Icon name="chevron-right" size="sm" tone="muted" />
              </button>
            </DataList>
          </section>

          <section
            class="hd-settings-group"
            data-pb-id="hengdong.settings-goals.reminder"
            data-pb-role="section"
            data-pb-token-spacing="spacing.xs"
          >
            <h2
              class="hd-settings-heading"
              data-pb-id="hengdong.settings-goals.reminder-heading"
              data-pb-role="text"
              data-pb-token-color="color.on-surface-muted"
              data-pb-token-typography="typography.caption"
            >
              提醒
            </h2>
            <DataList
              rounded="md"
              inspect-id="hengdong.settings-goals.reminder-list"
            >
              <div class="hd-settings-row hd-settings-row--switch">
                <SwitchControl
                  :model-value="reminderEnabled"
                  label="每日提醒"
                  inspect-id="hengdong.settings-goals.reminder-enabled"
                  @update:model-value="updateReminderEnabled"
                />
              </div>
              <button
                v-if="reminderEnabled"
                type="button"
                class="hd-settings-row"
                data-pb-id="hengdong.settings-goals.reminder-time"
                data-pb-role="button"
                data-pb-token-spacing="spacing.md"
                data-pb-action="open-reminder-time"
                @click="setReminderTimeOpen(true)"
              >
                <span
                  class="hd-settings-row__label"
                  data-pb-id="hengdong.settings-goals.reminder-time-label"
                  data-pb-role="text"
                  data-pb-token-color="color.on-surface"
                  data-pb-token-typography="typography.content"
                >
                  提醒时间
                </span>
                <span
                  class="hd-settings-row__value"
                  data-pb-id="hengdong.settings-goals.reminder-time-value"
                  data-pb-role="text"
                  data-pb-token-color="color.on-surface-muted"
                  data-pb-token-typography="typography.content"
                >
                  {{ reminderTime }}
                </span>
                <Icon name="chevron-right" size="sm" tone="muted" />
              </button>
            </DataList>
          </section>

          <section
            class="hd-settings-group"
            data-pb-id="hengdong.settings-goals.appearance"
            data-pb-role="section"
            data-pb-token-spacing="spacing.xs"
          >
            <h2
              class="hd-settings-heading"
              data-pb-id="hengdong.settings-goals.appearance-heading"
              data-pb-role="text"
              data-pb-token-color="color.on-surface-muted"
              data-pb-token-typography="typography.caption"
            >
              外观
            </h2>
            <DataList
              rounded="md"
              inspect-id="hengdong.settings-goals.appearance-list"
            >
              <div class="hd-settings-row hd-settings-row--switch">
                <SwitchControl
                  :model-value="theme === 'dark'"
                  label="深色模式"
                  inspect-id="hengdong.settings-goals.dark-mode"
                  @update:model-value="updateDarkMode"
                />
              </div>
            </DataList>
          </section>

          <section
            class="hd-settings-actions"
            data-pb-id="hengdong.settings-goals.account"
            data-pb-role="section"
            data-pb-token-spacing="spacing.sm"
          >
            <Button
              label="退出登录"
              kind="outlined"
              block
              inspect-id="hengdong.settings-goals.logout"
              data-pb-action="logout"
              @click="setLogoutOpen(true)"
            />
            <Button
              label="重置演示数据"
              kind="secondary"
              block
              inspect-id="hengdong.settings-goals.reset"
              data-pb-action="reset"
              @click="setResetOpen(true)"
            />
            <p
              class="hd-settings-footer"
              data-pb-id="hengdong.settings-goals.data-note"
              data-pb-role="text"
              data-pb-token-color="color.on-surface-muted"
              data-pb-token-typography="typography.caption"
            >
              退出保留记录；重置恢复演示数据。
            </p>
          </section>
        </div>
      </ScrollableDataList>

      <BottomSheet
        :model-value="weeklyOpen"
        title="每周活动"
        inspect-id="hengdong.settings-goals.weekly-sheet"
        @update:model-value="setWeeklyOpen"
      >
        <DataList
          surface="none"
          rounded="none"
          inspect-id="hengdong.settings-goals.weekly-options"
        >
          <button
            v-for="count in WEEKLY_COUNTS"
            :key="count"
            type="button"
            class="hd-settings-row"
            data-pb-id="hengdong.settings-goals.weekly-option"
            :data-pb-key="weeklyTargetKey(count)"
            data-pb-role="list-item"
            data-pb-token-spacing="spacing.md"
            data-pb-action="choose-weekly-target"
            @click="selectWeekly(count)"
          >
            <span class="hd-settings-row__label">每周 {{ count }} 次</span>
            <Icon
              v-if="weeklySessions === count"
              name="check"
              size="sm"
              tone="primary"
            />
          </button>
        </DataList>
      </BottomSheet>

      <BottomSheet
        :model-value="reminderTimeOpen"
        title="提醒时间"
        inspect-id="hengdong.settings-goals.reminder-time-sheet"
        @update:model-value="setReminderTimeOpen"
      >
        <TextField
          :model-value="reminderTime"
          label="提醒时间"
          placeholder="20:30"
          inspect-id="hengdong.settings-goals.reminder-time-field"
          @update:model-value="updateReminderTime"
        />
      </BottomSheet>

      <Confirm
        :model-value="logoutOpen"
        title="退出当前账号？"
        message="训练记录仍保留在此设备，下次登录可以继续查看。"
        confirm-label="退出登录"
        inspect-id="hengdong.settings-goals.logout-confirm"
        @update:model-value="setLogoutOpen"
        @confirm="logout"
      />
      <Confirm
        :model-value="resetOpen"
        title="重置恒动演示数据？"
        message="自建计划、训练进度和本地账号都会恢复为初始状态。"
        confirm-label="确认重置"
        inspect-id="hengdong.settings-goals.reset-confirm"
        @update:model-value="setResetOpen"
        @confirm="reset"
      />
    </section>
  </HengdongShell>
</template>
