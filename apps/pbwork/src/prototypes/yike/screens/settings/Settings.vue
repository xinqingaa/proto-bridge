<script setup lang="ts">
import { computed, ref, watch, nextTick, onBeforeUnmount } from "vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import PrototypeShell from "@/runtime/prototype/PrototypeShell.vue";
import Button from "@/design-system/components/action/Button.vue";
import SegmentedControl from "@/design-system/components/input/SegmentedControl.vue";
import GroupedList from "@/design-system/components/data/GroupedList.vue";
import DurationPicker from "../../components/YikeDurationPicker.vue";
import IconButton from "@/design-system/components/action/IconButton.vue";
import FlowSheet from "@/design-system/components/feedback/FlowSheet.vue";
import YikeOptionPicker from "../../components/YikeOptionPicker.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import {
  concreteThemeMode,
  useSystemThemeMode,
} from "@/runtime/theme-pack-preference";
import AppBar from "@/design-system/components/navigation/AppBar.vue";
import YikeActionRows from "../../components/YikeActionRows.vue";
import YikeFacePreview from "../../components/YikeFacePreview.vue";
import Icon from "@/design-system/components/action/Icon.vue";
import { formatDurationLabel } from "../../timer-readout";
import { useYikeRuntime } from "../../runtime";
import { yikeNavigation } from "../../navigation";
import type { YikeFace } from "../../model";
import { scope } from "./screen";
import "../stack.css";

const route = useRoute(),
  router = useRouter();
const { store, session } = useYikeRuntime();
const nav = () => yikeNavigation(router, route, store);
/** 切表盘/模式时让页面颜色在 标准时长 内过渡，而不是瞬间换一套。 */
const theming = ref(false);
let themingTimer: number | undefined;
function applyTheme(face: YikeFace, next: "light" | "dark" | "system") {
  theming.value = true;
  if (themingTimer !== undefined) window.clearTimeout(themingTimer);
  themingTimer = window.setTimeout(() => {
    theming.value = false;
    themingTimer = undefined;
  }, 320);
  nav().theme(face, next);
}
onBeforeUnmount(() => {
  if (themingTimer !== undefined) window.clearTimeout(themingTimer);
});
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
const thresholdOpen = ref(
  ["record-threshold", "threshold-custom"].includes(
    String(route.query.variant),
  ),
);
const thresholds = [5, 10, 60, 180, 300, 600];
const thresholdDraft = ref<string | number>(
  thresholds.includes(preference.value.shortRecordThresholdSeconds)
    ? preference.value.shortRecordThresholdSeconds
    : 10,
);
const thresholdStep = ref(route.query.variant === "threshold-custom" ? 1 : 0);
const customThresholdSeconds = ref(
  Math.max(1, Math.min(86399, preference.value.shortRecordThresholdSeconds)),
);
const thresholdOptions = thresholds.map((value) => ({
  value,
  label: thresholdLabel(value),
}));
const thresholdError = ref("");

/** 四个常用倒计时槽位：可改、可清空，留空的不出现在专注页。 */
const presetsOpen = ref(
  ["countdown-presets", "countdown-preset-edit"].includes(
    String(route.query.variant),
  ),
);
const presetValues = computed(() => preference.value.countdownPresets);
const presetStep = ref(route.query.variant === "countdown-preset-edit" ? 1 : 0);
const presetSlot = ref(0);
const presetDraft = ref(
  typeof presetValues.value[0] === "number" ? presetValues.value[0] : 300,
);
const presetError = ref("");
const presetCount = computed(
  () => presetValues.value.filter((value) => typeof value === "number").length,
);
function presetLabel(index: number) {
  const value = presetValues.value[index];
  return typeof value === "number" ? formatDurationLabel(value) : "未设置";
}
function openPresets() {
  presetStep.value = 0;
  presetError.value = "";
  presetsOpen.value = true;
}
function editPreset(index: number) {
  presetSlot.value = index;
  presetDraft.value =
    typeof presetValues.value[index] === "number"
      ? (presetValues.value[index] as number)
      : 300;
  presetError.value = "";
  presetStep.value = 1;
}
function savePreset() {
  const seconds = Math.round(presetDraft.value);
  if (seconds < 1 || seconds > 86399) {
    presetError.value = "请选择 1 秒至 23:59:59";
    return;
  }
  if (
    presetValues.value.some(
      (value, index) => index !== presetSlot.value && value === seconds,
    )
  ) {
    presetError.value = "和其他常用项重复";
    return;
  }
  const next = [...presetValues.value];
  next[presetSlot.value] = seconds;
  if (!store.updatePreferences({ countdownPresets: next })) {
    presetError.value = "暂时无法保存";
    return;
  }
  presetStep.value = 0;
  feedback.value = "已更新常用倒计时。";
}
function clearPreset() {
  const next = [...presetValues.value];
  next[presetSlot.value] = null;
  if (!store.updatePreferences({ countdownPresets: next })) {
    presetError.value = "暂时无法保存";
    return;
  }
  presetStep.value = 0;
  feedback.value = "已清空这一项。";
}
function restorePresets() {
  if (!store.updatePreferences({ countdownPresets: [180, 300, 600, 1200] })) {
    presetError.value = "暂时无法保存";
    return;
  }
  feedback.value = "已恢复默认常用项。";
}
function thresholdLabel(seconds: number) {
  return seconds < 60 || seconds % 60
    ? `${seconds} 秒`
    : `${seconds / 60} 分钟`;
}
function openThreshold() {
  const seconds = preference.value.shortRecordThresholdSeconds;
  thresholdDraft.value = thresholds.includes(seconds) ? seconds : 10;
  customThresholdSeconds.value = Math.max(1, Math.min(86399, seconds));
  thresholdStep.value = thresholds.includes(
    preference.value.shortRecordThresholdSeconds,
  )
    ? 0
    : 1;
  thresholdError.value = "";
  thresholdOpen.value = true;
}
function saveThreshold() {
  const seconds =
    thresholdStep.value === 1
      ? customThresholdSeconds.value
      : Number(thresholdDraft.value);
  if (
    !store.updatePreferences({
      shortRecordThresholdSeconds: seconds,
    })
  ) {
    thresholdError.value = "请选择 1–86399 秒";
    return;
  }
  feedback.value = `短时记录确认阈值已设为 ${thresholdLabel(seconds)}。`;
  thresholdOpen.value = false;
}
watch(
  () => store.presentation.revision,
  () => {
    setting.value =
      route.query.variant === "configuration-open" ? "pomodoroMinutes" : null;
    settingDraft.value = preference.value.pomodoroMinutes;
    resetOpen.value = route.query.variant === "reset-confirm";
    thresholdOpen.value = ["record-threshold", "threshold-custom"].includes(
      String(route.query.variant),
    );
    thresholdDraft.value = thresholds.includes(
      preference.value.shortRecordThresholdSeconds,
    )
      ? preference.value.shortRecordThresholdSeconds
      : 10;
    customThresholdSeconds.value = Math.max(
      1,
      Math.min(86399, preference.value.shortRecordThresholdSeconds),
    );
    thresholdStep.value = route.query.variant === "threshold-custom" ? 1 : 0;
    thresholdError.value = "";
    feedback.value = "";
    settingError.value = "";
  },
);
const groups = computed(() => [
  {
    id: "pomodoro",
    title: "番茄钟",
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
    ],
  },
  {
    id: "countdown",
    title: "倒计时",
    items: [
      {
        id: "countdown-presets",
        title: "常用倒计时",
        description: "",
        icon: "",
        value: presetCount.value ? `${presetCount.value} 项` : "未设置",
      },
    ],
  },
  {
    id: "recording",
    title: "记录与反馈",
    items: [
      {
        id: "record-threshold",
        title: "短时记录确认阈值",
        value: thresholdLabel(preference.value.shortRecordThresholdSeconds),
        description: "",
        icon: "",
      },
      {
        id: "sound",
        title: "提示音",
        modelValue: preference.value.sound,
        value: "",
        icon: "",
        navigation: false,
        description: "",
      },
    ],
  },
]);
function chooseSetting({ itemId }: { itemId: string }) {
  if (itemId === "countdown-presets") {
    openPresets();
    return;
  }
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
  applyTheme("mechanical", "system");
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
    <template #app-bar
      ><AppBar
        title=""
        show-back
        back-label="专注"
        background="transparent"
        dense
        :inspect-id="scope.id('app-bar')"
        @back="nav().back('focus')"
    /></template>
    <div
      :key="store.presentation.revision"
      class="yike-stack"
      :class="{ 'is-theming': theming }"
      v-pb="
        scope.node('root', 'page', {
          tokens: { padding: 'spacing.lg', background: 'color.background' },
        })
      "
    >
      <h1>设置</h1>
      <section class="section">
        <h2>外观</h2>
        <h3 class="setting-label">表盘</h3>
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
            @click="applyTheme(face.id, preference.mode)"
          >
            <YikeFacePreview
              :face="face.id"
              :mode="mode"
              :inspect-id="scope.id(`preview.${face.id}`)"
            />
            <span>{{ face.label }}</span>
          </button>
        </div>
        <h3 class="setting-label">显示模式</h3>
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
              applyTheme(preference.face, value as 'light' | 'dark' | 'system')
          "
        />
      </section>
      <GroupedList
        density="compact"
        :groups="groups"
        :inspect-id="scope.id('configuration')"
        @select="chooseSetting"
        @toggle="
          store.updatePreferences({ sound: $event.value });
          feedback = $event.value ? '提示音已开启。' : '提示音已关闭。';
        "
      />
      <p v-if="feedback" role="status">{{ feedback }}</p>
      <p v-if="store.storageIssue.value" role="alert">
        暂未保存到本机，当前操作仍可继续。
      </p>
      <YikeActionRows
        :inspect-id="scope.id('danger-actions')"
        :items="[
          {
            id: 'reset',
            inspectId: scope.id('reset'),
            label: '重置所有数据',
            danger: true,
          },
        ]"
        @select="resetOpen = true"
      />
      <p class="muted">一刻只在这台设备上保存数据。</p>
    </div>
    <FlowSheet
      v-model="thresholdOpen"
      v-model:step="thresholdStep"
      :step-count="2"
      :swipe="false"
      :title="thresholdStep === 1 ? '自定义时长' : '记录确认阈值'"
      material="glass"
      inspect-id="yike.settings.threshold-sheet"
    >
      <template #header-start>
        <IconButton
          icon="sliders-horizontal"
          ariaLabel="自定义时长"
          inspect-id="yike.settings.threshold-custom"
          size="sm"
          @click="thresholdStep = 1"
        />
      </template>
      <section :inert="thresholdStep !== 0" :aria-hidden="thresholdStep !== 0">
        <YikeOptionPicker
          v-model="thresholdDraft"
          :options="thresholdOptions"
          label="记录确认阈值"
          inspect-id="yike.settings.threshold-options"
        />
      </section>
      <section :inert="thresholdStep !== 1" :aria-hidden="thresholdStep !== 1">
        <DurationPicker
          v-model="customThresholdSeconds"
          precision="second"
          :min="1"
          :max="86399"
          label="自定义时长"
          inspect-id="yike.settings.threshold-duration"
        />
      </section>
      <template #actions>
        <p v-if="thresholdError" role="alert">{{ thresholdError }}</p>
        <Button
          label="确认"
          kind="accent"
          shape="pill"
          size="lg"
          inspect-id="yike.settings.threshold-save"
          @click="saveThreshold"
        />
      </template>
    </FlowSheet>
    <FlowSheet
      v-model="presetsOpen"
      v-model:step="presetStep"
      :step-count="2"
      :swipe="false"
      :title="presetStep === 1 ? `第 ${presetSlot + 1} 项` : '常用倒计时'"
      material="glass"
      inspect-id="yike.settings.presets-sheet"
    >
      <template #header-start>
        <IconButton
          v-if="presetStep === 1"
          icon="chevron-left"
          ariaLabel="返回常用倒计时"
          inspect-id="yike.settings.presets-back"
          size="sm"
          @click="presetStep = 0"
        />
      </template>
      <section :inert="presetStep !== 0" :aria-hidden="presetStep !== 0">
        <div class="yike-preset-list">
          <button
            v-for="(value, index) in presetValues"
            :key="index"
            type="button"
            class="yike-preset-row"
            :data-pb-id="`yike.settings.presets.${index}`"
            data-pb-role="button"
            :aria-label="`第 ${index + 1} 项：${presetLabel(index)}`"
            @click="editPreset(index)"
          >
            <span>第 {{ index + 1 }} 项</span>
            <b :class="{ 'is-empty': typeof value !== 'number' }">{{
              presetLabel(index)
            }}</b>
            <Icon name="chevron-right" size="sm" tone="muted" />
          </button>
        </div>
        <Button
          label="恢复默认"
          kind="quiet"
          shape="pill"
          inspect-id="yike.settings.presets-restore"
          @click="restorePresets"
        />
      </section>
      <section :inert="presetStep !== 1" :aria-hidden="presetStep !== 1">
        <DurationPicker
          v-model="presetDraft"
          precision="second"
          :min="1"
          :max="86399"
          label="这一项的时长"
          inspect-id="yike.settings.presets-duration"
        />
        <p v-if="presetError" role="alert">{{ presetError }}</p>
      </section>
      <template #actions>
        <Button
          v-if="presetStep === 1"
          label="清空"
          kind="quiet"
          shape="pill"
          inspect-id="yike.settings.presets-clear"
          @click="clearPreset"
        />
        <Button
          v-if="presetStep === 1"
          label="保存"
          kind="accent"
          shape="pill"
          size="lg"
          inspect-id="yike.settings.presets-save"
          @click="savePreset"
        />
        <Button
          v-else
          label="完成"
          kind="accent"
          shape="pill"
          size="lg"
          inspect-id="yike.settings.presets-done"
          @click="presetsOpen = false"
        />
      </template>
    </FlowSheet>
    <BottomSheet
      v-model="settingOpen"
      :title="setting ? labels[setting] : '番茄配置'"
      material="glass"
      :inspect-id="scope.id('configuration-sheet')"
    >
      <div class="yike-decision">
        <YikeOptionPicker
          v-if="setting === 'longBreakEvery'"
          :model-value="settingDraft"
          :options="
            Array.from({ length: 7 }, (_, i) => ({
              value: i + 2,
              label: `每 ${i + 2} 轮`,
            }))
          "
          label="长休间隔"
          :inspect-id="scope.id('rounds')"
          @update:model-value="settingDraft = Number($event)"
        />
        <DurationPicker
          v-else
          v-model="settingDraft"
          label="时长"
          :minute-step="1"
          :min="1"
          :max="setting === 'pomodoroMinutes' ? 180 : 60"
          :inspect-id="scope.id('duration')"
        />
        <p v-if="settingError" role="alert">{{ settingError }}</p>
      </div>
      <template #actions>
        <Button
          label="确认"
          kind="accent"
          shape="pill"
          size="lg"
          :inspect-id="scope.id('configuration-save')"
          @click="saveSetting"
        />
      </template>
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
      </div>
      <template #actions>
        <Button
          label="取消"
          kind="secondary"
          shape="pill"
          :inspect-id="scope.id('reset-cancel')"
          @click="resetOpen = false"
        />
        <Button
          label="确认重置"
          kind="danger"
          shape="pill"
          :inspect-id="scope.id('reset-confirm')"
          @click="reset"
        />
      </template>
    </BottomSheet>
  </PrototypeShell>
</template>
<style scoped>
.yike-stack {
  gap: var(--pb-spacing-md);
  padding-block-start: var(--pb-layout-zero);
}
.yike-stack .section {
  gap: var(--pb-spacing-sm);
}
.yike-stack .muted {
  line-height: var(--pb-typography-body-line-height);
}
.yike-stack h2 {
  font: var(--pb-typography-caption-strong);
  color: var(--pb-color-on-surface-muted);
}
.setting-label {
  margin: var(--pb-layout-zero);
  font: var(--pb-typography-label);
  color: var(--pb-color-on-surface-muted);
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
.face-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: var(--pb-size-brand);
  max-inline-size: var(--pb-layout-fill);
  block-size: var(--pb-size-brand);
}
.faces button:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}

.yike-stack.is-theming,
.yike-stack.is-theming :deep(*) {
  transition:
    background-color var(--pb-motion-duration-medium)
      var(--pb-motion-easing-standard),
    color var(--pb-motion-duration-medium) var(--pb-motion-easing-standard),
    border-color var(--pb-motion-duration-medium)
      var(--pb-motion-easing-standard),
    fill var(--pb-motion-duration-medium) var(--pb-motion-easing-standard),
    stroke var(--pb-motion-duration-medium) var(--pb-motion-easing-standard) !important;
}
@media (prefers-reduced-motion: reduce) {
  .yike-stack.is-theming,
  .yike-stack.is-theming :deep(*) {
    transition: none !important;
  }
}

.yike-preset-list {
  display: flex;
  flex-direction: column;
}
.yike-preset-row {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  min-block-size: var(--pb-size-touch);
  padding-block: var(--pb-spacing-sm);
  border-block-end: var(--pb-border-hairline);
  color: var(--pb-color-on-surface);
  text-align: start;
}
.yike-preset-row span {
  flex: none;
  inline-size: var(--pb-size-avatar-large);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-body-sm);
}
.yike-preset-row b {
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
  font: var(--pb-typography-numeric-content);
  font-variant-numeric: tabular-nums;
}
.yike-preset-row b.is-empty {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-body-sm);
}
</style>
