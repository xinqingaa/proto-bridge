<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import Button from "@/design-system/components/action/Button.vue";
import SegmentedControl from "@/design-system/components/input/SegmentedControl.vue";
import GroupedList from "@/design-system/components/data/GroupedList.vue";
import DurationPicker from "@/design-system/components/input/DurationPicker.vue";
import Stepper from "@/design-system/components/input/Stepper.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import {
  concreteThemeMode,
  useSystemThemeMode,
} from "@/runtime/theme-pack-preference";
import { themeAssetUrl } from "@/design-system/theme/sources";
import { useYikeRuntime } from "../../runtime";
import { yikeNavigation } from "../../navigation";
import type { YikeFace } from "../../model";
import { scope } from "./screen";
import "../stack.css";

const route = useRoute(),
  router = useRouter();
const { store, session } = useYikeRuntime();
const nav = () => yikeNavigation(router, route, store);
const preference = computed(() => store.data.preferences);
const systemMode = useSystemThemeMode();
const faces: Array<{ id: YikeFace; label: string }> = [
  { id: "mechanical", label: "机械" },
  { id: "water", label: "水位" },
  { id: "sundial", label: "日影" },
];
const mode = computed(() =>
  concreteThemeMode(preference.value.mode, systemMode.value),
);
type Setting =
  | "pomodoroMinutes"
  | "shortBreakMinutes"
  | "longBreakMinutes"
  | "longBreakEvery";
const labels: Record<Setting, string> = {
  pomodoroMinutes: "专注时长",
  shortBreakMinutes: "短休息",
  longBreakMinutes: "长休息",
  longBreakEvery: "长休间隔",
};
const setting = ref<Setting | null>(
  route.query.variant === "configuration-open" ? "pomodoroMinutes" : null,
);
const settingOpen = computed({
  get: () => setting.value !== null,
  set: (open: boolean) => {
    if (!open) setting.value = null;
  },
});
const settingDraft = ref(25),
  settingError = ref("");
const resetOpen = ref(route.query.variant === "reset-confirm");
const feedback = ref("");
const thresholdOpen = ref(route.query.variant === "record-threshold");
const thresholdDraft = ref(preference.value.shortRecordThresholdSeconds);
const thresholds = [5, 10, 60, 180, 300, 600];
const thresholdCustom = ref(!thresholds.includes(thresholdDraft.value));
const thresholdError = ref("");
const thresholdLabel = (seconds: number) =>
  seconds < 60 || seconds % 60 ? `${seconds} 秒` : `${seconds / 60} 分钟`;
function openThreshold() {
  thresholdDraft.value = preference.value.shortRecordThresholdSeconds;
  thresholdCustom.value = !thresholds.includes(thresholdDraft.value);
  thresholdError.value = "";
  thresholdOpen.value = true;
}
function saveThreshold() {
  if (
    !store.updatePreferences({
      shortRecordThresholdSeconds: thresholdDraft.value,
    })
  ) {
    thresholdError.value = "请输入 1–86399 的整数秒数";
    return;
  }
  feedback.value = `短时记录确认阈值已设为 ${thresholdLabel(thresholdDraft.value)}。`;
  thresholdOpen.value = false;
}
watch(
  () => store.presentation.revision,
  () => {
    setting.value =
      route.query.variant === "configuration-open" ? "pomodoroMinutes" : null;
    settingDraft.value = preference.value.pomodoroMinutes;
    resetOpen.value = route.query.variant === "reset-confirm";
    thresholdOpen.value = route.query.variant === "record-threshold";
    thresholdDraft.value = preference.value.shortRecordThresholdSeconds;
    thresholdError.value = "";
    feedback.value = "";
    settingError.value = "";
  },
);
const groups = computed(() => [
  {
    id: "pomodoro",
    title: "计时与记录",
    items: [
      ...Object.entries(labels).map(([id, title]) => ({
        id,
        title,
        description: "",
        icon: "",
        value:
          id === "longBreakEvery"
            ? `每 ${preference.value.longBreakEvery} 轮`
            : `${preference.value[id as Setting]} 分钟`,
      })),
      {
        id: "record-threshold",
        title: "短时记录确认阈值",
        value: thresholdLabel(preference.value.shortRecordThresholdSeconds),
        description: "少于阈值先确认，达到阈值直接记录",
        icon: "",
      },
      {
        id: "sound",
        title: "提示音",
        modelValue: preference.value.sound,
        value: "",
        icon: "",
        navigation: false,
        description: "到点显示提示音反馈，不发送系统通知",
      },
    ],
  },
]);
function chooseSetting({ itemId }: { itemId: string }) {
  if (itemId === "record-threshold") {
    openThreshold();
    return;
  }
  if (!(itemId in labels)) return;
  setting.value = itemId as Setting;
  settingDraft.value = preference.value[setting.value];
  settingError.value = "";
}
function saveSetting() {
  const key = setting.value;
  if (!key) return;
  if (!store.updatePreferences({ [key]: settingDraft.value })) {
    settingError.value = `请选择 ${key === "longBreakEvery" ? "2–8 轮" : key === "pomodoroMinutes" ? "1–180 分钟" : "1–60 分钟"}`;
    return;
  }
  feedback.value = `已更新${labels[key]}，从后续阶段生效。`;
  setting.value = null;
}
async function reset() {
  store.reset();
  session.sync();
  nav().theme("mechanical", "system");
  resetOpen.value = false;
  // Let Runtime stamp the new theme before issuing the final destination.
  await nextTick();
  await nav().home("focus");
}
</script>
<template>
  <PrototypeShell
    title="设置"
    :screen-id="scope.screenId"
    show-back
    @back="nav().back('focus')"
  >
    <div
      :key="store.presentation.revision"
      class="yike-stack"
      v-pb="
        scope.node('root', 'page', {
          tokens: { padding: 'spacing.lg', background: 'color.background' },
        })
      "
    >
      <section class="section">
        <h1>选一件桌上的物件</h1>
        <p class="muted">表盘与浅深模式分别选择，立即应用到所有页面。</p>
        <div class="faces" role="group" aria-label="表盘">
          <button
            v-for="face in faces"
            :key="face.id"
            type="button"
            :aria-label="`${face.label}表盘`"
            :aria-pressed="preference.face === face.id"
            :class="{ selected: preference.face === face.id }"
            v-pb="
              scope.node(`face.${face.id}`, 'button', {
                tokens: {
                  padding: 'spacing.sm',
                  radius: 'radius.control',
                  color: 'color.primary',
                },
              })
            "
            @click="nav().theme(face.id, preference.mode)"
          >
            <img
              :src="themeAssetUrl('yike', `assets/${face.id}-${mode}.svg`)"
              alt=""
            />
            <span>{{ face.label }}</span>
          </button>
        </div>
      </section>
      <SegmentedControl
        :model-value="preference.mode"
        :items="[
          { id: 'light', label: '浅色' },
          { id: 'dark', label: '深色' },
          { id: 'system', label: '跟随系统' },
        ]"
        label="外观模式"
        material="glass"
        :inspect-id="scope.id('mode')"
        @update:model-value="
          (value) =>
            nav().theme(preference.face, value as 'light' | 'dark' | 'system')
        "
      />
      <GroupedList
        :groups="groups"
        :inspect-id="scope.id('configuration')"
        @select="chooseSetting"
        @toggle="
          store.updatePreferences({ sound: $event.value });
          feedback = $event.value
            ? '提示音已开启，到点以可见反馈演示。'
            : '提示音已关闭。';
        "
      />
      <p v-if="feedback" role="status">{{ feedback }}</p>
      <p v-if="store.storageIssue.value" role="alert">
        暂未保存到本机，当前操作仍可继续。
      </p>
      <p class="muted">
        数据仅保存在这台设备。提醒只保存并显示时间，不发送通知。
      </p>
      <Button
        label="重置数据"
        kind="danger"
        :inspect-id="scope.id('reset')"
        @click="resetOpen = true"
      />
    </div>
    <BottomSheet
      v-model="thresholdOpen"
      title="记录确认阈值"
      material="glass"
      inspect-id="yike.settings.threshold-sheet"
    >
      <div class="yike-decision">
        <p>
          少于此时长时先询问是否记录；达到阈值直接记录。取消确认会保留会话。
        </p>
        <div class="threshold-options">
          <Button
            v-for="seconds in thresholds"
            :key="seconds"
            :label="thresholdLabel(seconds)"
            :kind="
              !thresholdCustom && thresholdDraft === seconds
                ? 'accent'
                : 'outlined'
            "
            :aria-pressed="!thresholdCustom && thresholdDraft === seconds"
            :inspect-id="`yike.settings.threshold-${seconds}`"
            @click="
              thresholdDraft = seconds;
              thresholdCustom = false;
            "
          />
          <Button
            label="自定义"
            :kind="thresholdCustom ? 'accent' : 'outlined'"
            :aria-pressed="thresholdCustom"
            inspect-id="yike.settings.threshold-custom"
            @click="thresholdCustom = true"
          />
        </div>
        <p v-if="thresholdCustom">自定义时长以秒为单位。</p>
        <Stepper
          v-if="thresholdCustom"
          v-model="thresholdDraft"
          label="自定义阈值（秒）"
          :min="1"
          :max="86399"
          inspect-id="yike.settings.threshold-seconds"
        />
        <p v-if="thresholdError" role="alert">{{ thresholdError }}</p>
        <Button
          label="保存阈值"
          inspect-id="yike.settings.threshold-save"
          @click="saveThreshold"
        />
        <Button
          label="取消"
          kind="quiet"
          inspect-id="yike.settings.threshold-cancel"
          @click="thresholdOpen = false"
        />
      </div>
    </BottomSheet>
    <BottomSheet
      v-model="settingOpen"
      :title="setting ? labels[setting] : '番茄配置'"
      material="glass"
      :inspect-id="scope.id('configuration-sheet')"
    >
      <div class="yike-decision">
        <Stepper
          v-if="setting === 'longBreakEvery'"
          v-model="settingDraft"
          label="长休间隔"
          :min="2"
          :max="8"
          :inspect-id="scope.id('rounds')"
        />
        <DurationPicker
          v-else
          v-model="settingDraft"
          label="时长"
          :minute-step="1"
          :inspect-id="scope.id('duration')"
        />
        <p v-if="settingError" role="alert">{{ settingError }}</p>
        <Button
          label="确认"
          :inspect-id="scope.id('configuration-save')"
          @click="saveSetting"
        />
        <Button
          label="取消"
          kind="quiet"
          :inspect-id="scope.id('configuration-cancel')"
          @click="settingOpen = false"
        />
      </div>
    </BottomSheet>
    <BottomSheet
      v-model="resetOpen"
      title="重置所有数据？"
      material="glass"
      :inspect-id="scope.id('reset-sheet')"
    >
      <div class="yike-decision">
        <p>
          清除当前会话、历史和用户习惯，恢复默认配置与四个预置习惯。此操作无法撤销。
        </p>
        <Button
          label="取消"
          kind="quiet"
          :inspect-id="scope.id('reset-cancel')"
          @click="resetOpen = false"
        />
        <Button
          label="确认重置"
          kind="danger"
          :inspect-id="scope.id('reset-confirm')"
          @click="reset"
        />
      </div>
    </BottomSheet>
  </PrototypeShell>
</template>
<style scoped>
.threshold-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-sm);
}
.faces {
  display: flex;
  gap: var(--pb-spacing-sm);
}
.faces button {
  display: flex;
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm);
  border: var(--pb-border-default);
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-label);
  cursor: pointer;
}
.faces button.selected {
  border-color: var(--pb-color-primary);
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
}
.faces img {
  inline-size: var(--pb-size-brand);
  max-inline-size: var(--pb-layout-fill);
  block-size: var(--pb-size-brand);
}
.faces button:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
</style>
