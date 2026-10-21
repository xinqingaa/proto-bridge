<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "@/design-system/components/action/Icon.vue";
import { useRoute, useRouter } from "vue-router";
import { vPb } from "@/authoring/pb-style";
import { yikeNavigation } from "../../navigation";
import { useYikeSession } from "../../session";
import { useClock } from "@/runtime/useClock";
import { useYikeScroll } from "../../runtime";
import { scope } from "./screen";
import FocusPanel from "./FocusPanel.vue";
const modeNames: YikeTimerMode[] = ["pomodoro", "stopwatch", "countdown"];
import YikeFocusModes from "../../components/YikeFocusModes.vue";
import YikeAction from "../../components/YikeAction.vue";
import Button from "@/design-system/components/action/Button.vue";
import ConfirmDialog from "@/design-system/components/feedback/ConfirmDialog.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import DurationPicker from "../../components/YikeDurationPicker.vue";
import { useYikeStore } from "../../model";
import { durationLabel } from "../../statistics";
import { elapsedMs, type YikeTimerMode } from "../../timer-engine";

const route = useRoute();
const router = useRouter();
const store = useYikeStore();
const now = useClock();
const root = ref<HTMLElement | null>(null);
useYikeScroll(root, "focus");
const commands = useYikeSession();
const mode = commands.mode;
const countdownSeconds = commands.countdownSeconds;
const pendingMode = commands.pendingMode;
const shortRecordOpen = computed(
  () =>
    Boolean(commands.pendingRecord.value) &&
    route.params.screenSlug === "focus",
);
function resolveShortRecord(value: boolean) {
  commands.resolveRecord(value);
  syncVariant();
}
const confirmAbandon = ref(route.query.variant === "abandon-confirm");
const customOpen = ref(route.query.variant === "custom-duration");
const customSeconds = ref(countdownSeconds.value);
const customError = ref("");
function openCustom() {
  customSeconds.value = countdownSeconds.value;
  customError.value = "";
  customOpen.value = true;
}
function saveCustom() {
  if (
    !Number.isInteger(customSeconds.value) ||
    customSeconds.value < 1 ||
    customSeconds.value > 86399
  ) {
    customError.value = "请选择 1 秒至 23 小时 59 分 59 秒";
    return;
  }
  countdownSeconds.value = customSeconds.value;
  customOpen.value = false;
  syncVariant();
}
const session = computed(() => store.data.session);
const recoveryOpen = computed({
  get: () => store.recoveryNeeded.value && route.params.screenSlug === "focus",
  set: (value: boolean) => {
    if (!value) store.recoveryNeeded.value = false;
  },
});
const elapsed = computed(() =>
  session.value ? elapsedMs(session.value, now.value.getTime()) : 0,
);
const isBreak = computed(() =>
  Boolean(session.value?.phase && session.value.phase !== "focus"),
);
const todayDuration = computed(() => {
  void now.value;
  return durationLabel(
    store.data.focusRecords.reduce(
      (sum, record) =>
        sum +
        record.intervals
          .filter((interval) => interval.date === store.today())
          .reduce((seconds, interval) => seconds + interval.durationSeconds, 0),
      0,
    ),
  );
});
function syncVariant() {
  if (route.params.screenSlug === "focus")
    void yikeNavigation(router, route, store).variant();
}
function toggle() {
  commands.toggle();
  syncVariant();
}
function chooseMode(next: YikeTimerMode) {
  commands.requestMode(next);
}
function resolveMode(choice: "cancel" | "record" | "discard") {
  commands.resolveMode(choice);
  syncVariant();
}
function finish() {
  commands.finish();
  syncVariant();
}
function abandon() {
  commands.abandon();
  confirmAbandon.value = false;
  syncVariant();
}
</script>

<template>
  <div
    ref="root"
    class="yike-focus"
    v-pb="
      scope.node('root', 'page', {
        tokens: { background: 'color.background', padding: 'spacing.lg' },
      })
    "
  >
    <header class="yike-focus-head">
      <div>
        <span class="yike-date">{{
          new Date(`${store.today()}T12:00:00`).toLocaleDateString("zh-CN", {
            month: "long",
            day: "numeric",
            weekday: "long",
          })
        }}</span
        ><span class="yike-total"
          >今天已专注 <b>{{ todayDuration }}</b></span
        >
      </div>
      <button
        class="yike-icon"
        type="button"
        aria-label="设置"
        @click="yikeNavigation(router, route, store).settings()"
        v-pb="
          scope.node('settings', 'button', {
            tokens: { size: 'size.touch', color: 'color.on-surface-muted' },
          })
        "
      >
        <Icon name="settings" />
      </button>
    </header>
    <YikeFocusModes
      class="yike-mode-pages"
      :model-value="mode"
      inspect-id="yike.focus.mode-tabs"
      @update:model-value="chooseMode"
    >
      <template v-for="panel in modeNames" :key="panel" #[panel]>
        <FocusPanel
          :mode="panel"
          @custom="openCustom"
          @abandon="confirmAbandon = true"
        />
      </template>
    </YikeFocusModes>
    <ConfirmDialog
      :model-value="shortRecordOpen"
      title="记录这次短时专注？"
      :message="`本次专注 ${Math.round((elapsed / 1000) * 10) / 10} 秒，少于设置的 ${store.data.preferences.shortRecordThresholdSeconds} 秒确认阈值。仍然记录吗？`"
      confirm-label="仍然记录"
      cancel-label="暂不结束"
      material="glass"
      inspect-id="yike.focus.short-record-confirm"
      @confirm="resolveShortRecord(true)"
      @update:model-value="
        (value) => {
          if (!value && commands.pendingRecord.value) resolveShortRecord(false);
        }
      "
    />
    <BottomSheet
      v-model="customOpen"
      title="倒计时时长"
      material="glass"
      inspect-id="yike.focus.custom-sheet"
    >
      <div class="yike-sheet-content">
        <DurationPicker
          v-model="customSeconds"
          label="倒计时时长"
          precision="second"
          :min="1"
          :max="86399"
          inspect-id="yike.focus.custom-duration"
        />
        <p v-if="customError" role="alert">{{ customError }}</p>
      </div>
      <template #actions>
        <Button
          label="确认时长"
          kind="accent"
          shape="pill"
          size="lg"
          inspect-id="yike.focus.custom-save"
          @click="saveCustom"
        />
      </template>
    </BottomSheet>
    <BottomSheet
      material="glass"
      :model-value="Boolean(pendingMode)"
      title="切换计时模式？"
      inspect-id="yike.focus.switch-sheet"
      @update:model-value="
        (value) => {
          if (!value) resolveMode('cancel');
        }
      "
    >
      <p>
        先结束当前阶段再切换。短于设置阈值时会再次确认是否记录，休息不计入专注。
      </p>
      <template #actions>
        <div class="yike-modal-actions">
          <Button
            label="结束并切换"
            kind="accent"
            shape="pill"
            size="lg"
            inspect-id="yike.focus.switch-record"
            @click="resolveMode('record')"
          />
          <Button
            label="放弃并切换"
            kind="danger"
            shape="pill"
            size="lg"
            inspect-id="yike.focus.switch-discard"
            @click="resolveMode('discard')"
          />
          <Button
            label="取消"
            kind="secondary"
            shape="pill"
            size="lg"
            inspect-id="yike.focus.switch-cancel"
            @click="resolveMode('cancel')"
          />
        </div>
      </template>
    </BottomSheet>
    <BottomSheet
      material="glass"
      v-model="confirmAbandon"
      title="放弃这次专注？"
      inspect-id="yike.focus.abandon-sheet"
    >
      <p>本次专注不会生成新记录。倒计时已完成部分会保留。</p>
      <template #actions>
        <Button
          label="继续保留"
          kind="secondary"
          shape="pill"
          inspect-id="yike.focus.abandon-cancel"
          @click="confirmAbandon = false"
        />
        <Button
          label="确认放弃"
          kind="danger"
          shape="pill"
          inspect-id="yike.focus.abandon-confirm"
          @click="abandon"
        />
      </template>
    </BottomSheet>
    <BottomSheet
      material="glass"
      v-model="recoveryOpen"
      title="计时已暂停"
      inspect-id="yike.focus.recovery-sheet"
    >
      <p>已恢复到最后保存的进度，关闭期间没有计时。</p>
      <template #actions>
        <div class="yike-modal-actions">
          <Button
            label="继续计时"
            kind="accent"
            shape="pill"
            size="lg"
            inspect-id="yike.focus.recovery-resume"
            @click="
              toggle();
              recoveryOpen = false;
            "
          />
          <Button
            :label="isBreak ? '跳过休息' : '结束并记录'"
            kind="secondary"
            shape="pill"
            size="lg"
            inspect-id="yike.focus.recovery-finish"
            @click="
              finish();
              recoveryOpen = false;
            "
          />
          <Button
            v-if="!isBreak"
            label="放弃本次"
            kind="quiet"
            shape="pill"
            size="lg"
            inspect-id="yike.focus.recovery-abandon"
            @click="
              recoveryOpen = false;
              confirmAbandon = true;
            "
          />
        </div>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
.yike-focus {
  display: flex;
  min-block-size: var(--pb-layout-fill);
  block-size: var(--pb-layout-fill);
  overflow: hidden;
  flex-direction: column;
  padding: var(--pb-spacing-lg) var(--pb-spacing-lg) var(--pb-spacing-xs);
  background: var(--pb-color-background);
  color: var(--pb-color-on-surface);
}
.yike-laps {
  font: var(--pb-typography-numeric-content);
  padding-inline-start: var(--pb-spacing-lg);
}
.yike-modal-actions,
.yike-sheet-content {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
.yike-focus-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.yike-focus-head {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.yike-focus-head > div {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-xs);
}
.yike-total b {
  color: var(--pb-color-on-surface);
  font-weight: var(--pb-typography-body-lg-weight);
}
.yike-icon {
  display: inline-flex;
  min-inline-size: var(--pb-size-touch);
  min-block-size: var(--pb-size-touch);
  align-items: center;
  justify-content: center;
  color: var(--pb-color-on-surface);
}
.yike-icon svg {
  inline-size: var(--pb-size-icon);
  block-size: var(--pb-size-icon);
}
.yike-mode-pages {
  flex: var(--pb-layout-flex-fill);
  min-block-size: var(--pb-layout-zero);
}
</style>
