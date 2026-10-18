<script setup lang="ts">
import { computed, watchEffect } from "vue";
import type { PreviewDeviceSession } from "@/workbench/preview/model";
import Button from "@/design-system/components/action/Button.vue";
import BottomSheet from "@/design-system/components/feedback/BottomSheet.vue";
import Toast from "@/design-system/components/feedback/Toast.vue";
import GroupedList from "@/design-system/components/data/GroupedList.vue";
import DurationPicker from "@/design-system/components/input/DurationPicker.vue";
import Stepper from "@/design-system/components/input/Stepper.vue";
import YikeAction from "../components/YikeAction.vue";
import YikeHabitForm from "../components/YikeHabitForm.vue";
import { emptyHabitDraft, type YikeHabitDraft } from "../components/habit-form";
const props = defineProps<{
  device: PreviewDeviceSession;
  attach: string;
  states: Array<{ id: string; label: string }>;
}>();
watchEffect(() => {
  const state = (props.device.demo.session ??= {});
  state.draft ??= emptyHabitDraft();
});
const session = computed(() => props.device.demo.session!);
const draft = computed<YikeHabitDraft>({
  get: () => session.value.draft as YikeHabitDraft,
  set: (value) => {
    session.value.draft = value;
  },
});
const saved = computed(() => session.value.saved as YikeHabitDraft | undefined);
const panel = (id: string) =>
  computed({
    get: () => session.value.panel === id,
    set: (value) => {
      if (!value) session.value.panel = "";
    },
  });
const editor = panel("editor"),
  confirm = panel("confirm"),
  setting = panel("setting");
const actionKind = computed(() =>
  ["primary", "secondary", "danger", "quiet"].includes(
    String(session.value.actionKind),
  )
    ? (session.value.actionKind as "primary" | "secondary" | "danger" | "quiet")
    : "primary",
);
const notice = computed({
  get: () => session.value.notice === true,
  set: (value) => {
    session.value.notice = value;
  },
});
function prepare(id: string) {
  if (
    ["primary", "secondary", "danger", "quiet", "loading", "disabled"].includes(
      id,
    )
  ) {
    session.value.actionKind = id;
    session.value.actionState = id;
    return;
  }
  if (id === "confirm") {
    session.value.panel = "confirm";
    return;
  }
  if (id === "undo") {
    punch();
    return;
  }
  session.value.editorKind = id === "edit" ? "编辑习惯" : "新建习惯";
  draft.value =
    id === "edit" || id === "failure"
      ? {
          ...(saved.value ?? {
            ...emptyHabitDraft(),
            name: "读 20 页书",
            icon: "book" as const,
          }),
        }
      : emptyHabitDraft();
  if (id === "weekly")
    draft.value = {
      ...draft.value,
      name: "跑步",
      icon: "run",
      frequency: "weekly",
    };
  if (id === "reminder")
    draft.value = {
      ...draft.value,
      name: "23 点前睡",
      icon: "moon",
      reminder: true,
      reminderTime: "22:30",
    };
  session.value.saveError =
    id === "failure" ? "保存失败，输入仍保留。请重试。" : "";
  session.value.formVersion = Number(session.value.formVersion ?? 0) + 1;
  session.value.panel = "editor";
}
function save(value: YikeHabitDraft) {
  session.value.saved = { ...value };
  session.value.saveError = "";
  session.value.panel = "";
  session.value.result = `已保存：${value.name}`;
}
function punch() {
  session.value.previousCheck = session.value.checked === true;
  session.value.checked = session.value.checked !== true;
  session.value.notice = true;
}
function undo() {
  session.value.checked = session.value.previousCheck === true;
  session.value.result = "已撤销本次打卡变化";
}
const settings = computed(() => [
  {
    id: "focus",
    title: "番茄配置",
    items: [
      {
        id: "focus",
        title: "专注时长",
        value: `${Number(session.value.focus ?? 25)} 分钟`,
        description: "",
        icon: "",
      },
      {
        id: "short",
        title: "短休息",
        value: `${Number(session.value.short ?? 5)} 分钟`,
        description: "",
        icon: "",
      },
      {
        id: "long",
        title: "长休息",
        value: `${Number(session.value.long ?? 15)} 分钟`,
        description: "",
        icon: "",
      },
      {
        id: "rounds",
        title: "长休间隔",
        value: `每 ${Number(session.value.rounds ?? 4)} 轮`,
        description: "",
        icon: "",
      },
      {
        id: "sound",
        title: "提示音",
        modelValue: session.value.sound !== false,
        value: "",
        navigation: false,
        description: "",
        icon: "",
      },
    ],
  },
]);
function chooseSetting(item: { itemId: string }) {
  session.value.settingKey = item.itemId;
  session.value.settingDraft = Number(
    session.value[item.itemId] ??
      ({ focus: 25, short: 5, long: 15, rounds: 4 } as Record<string, number>)[
        item.itemId
      ],
  );
  session.value.settingError = "";
  session.value.panel = "setting";
}
const settingDraft = computed({
  get: () => Number(session.value.settingDraft ?? 25),
  set: (value) => {
    session.value.settingDraft = value;
    session.value.settingError = "";
  },
});
function saveSetting() {
  const key = String(session.value.settingKey);
  const max = key === "focus" ? 180 : key === "rounds" ? 8 : 60;
  const min = key === "rounds" ? 2 : 1;
  if (settingDraft.value < min || settingDraft.value > max) {
    session.value.settingError = `请选择 ${min}–${max}${key === "rounds" ? " 轮" : " 分钟"}`;
    return;
  }
  session.value[key] = settingDraft.value;
  session.value.panel = "";
}
function reset() {
  props.device.demo.session = {};
}
</script>
<template>
  <section class="composition-preview">
    <div class="tools" aria-label="代表状态">
      <Button
        v-for="item in states"
        :key="item.id"
        :label="item.label"
        kind="outlined"
        size="sm"
        @click="prepare(item.id)"
      /><Button label="复位" kind="secondary" size="sm" @click="reset" />
    </div>
    <YikeAction
      label="开始专注"
      :kind="actionKind"
      :disabled="session.actionState === 'disabled'"
      :loading="session.actionState === 'loading'"
      :inspect-id="`preview.${device.id}.action`"
      @click="session.result = '主操作已触发'"
    />
    <GroupedList
      :groups="settings"
      :inspect-id="`preview.${device.id}.settings`"
      @select="chooseSetting"
      @toggle="session.sound = $event.value"
    />
    <div class="tools">
      <Button label="新建习惯" @click="prepare('new')" /><Button
        label="编辑习惯"
        kind="secondary"
        @click="prepare('edit')"
      /><Button
        label="删除确认"
        kind="outlined"
        @click="prepare('confirm')"
      /><Button
        :label="session.checked ? '取消今日打卡' : '今日打卡'"
        kind="outlined"
        @click="punch"
      />
    </div>
    <p role="status">{{ session.result || "选择一个资源，操作后可复位。" }}</p>
    <BottomSheet
      v-model="editor"
      :title="String(session.editorKind ?? '新建习惯')"
      :attach="attach"
      detent="expanded"
      :inspect-id="`preview.${device.id}.editor`"
    >
      <YikeHabitForm
        :key="String(session.formVersion ?? '')"
        v-model="draft"
        :save-error="String(session.saveError ?? '')"
        :inspect-id="`preview.${device.id}.form`"
        @save="save"
      />
    </BottomSheet>
    <BottomSheet
      v-model="confirm"
      title="删除这个习惯？"
      :attach="attach"
      :inspect-id="`preview.${device.id}.confirm`"
    >
      <div class="decision">
        <p>
          习惯和它的全部打卡记录都会删除。此处只演示确认资源，不操作真实业务数据。
        </p>
        <YikeAction
          label="删除"
          kind="danger"
          :inspect-id="`preview.${device.id}.delete`"
          @click="
            session.result = '已确认删除（资源演示）';
            confirm = false;
          "
        /><YikeAction
          label="取消"
          kind="quiet"
          :inspect-id="`preview.${device.id}.cancel`"
          @click="confirm = false"
        />
      </div>
    </BottomSheet>
    <BottomSheet
      v-model="setting"
      title="番茄配置"
      :attach="attach"
      :inspect-id="`preview.${device.id}.setting`"
    >
      <div class="decision">
        <Stepper
          v-if="session.settingKey === 'rounds'"
          v-model="settingDraft"
          label="长休间隔"
          :min="2"
          :max="8"
          :inspect-id="`preview.${device.id}.rounds`"
        /><DurationPicker
          v-else
          v-model="settingDraft"
          label="时长"
          :minute-step="1"
          :inspect-id="`preview.${device.id}.duration`"
        />
        <p v-if="session.settingError" role="alert">
          {{ session.settingError }}
        </p>
        <YikeAction
          label="确认"
          :inspect-id="`preview.${device.id}.setting-save`"
          @click="saveSetting"
        />
      </div>
    </BottomSheet>
    <Toast
      v-model="notice"
      :message="session.checked ? '今天已打卡' : '今天已取消打卡'"
      action-label="撤销"
      :attach="attach"
      :inspect-id="`preview.${device.id}.notice`"
      @undo="undo"
    />
  </section>
</template>
<style scoped>
.composition-preview,
.decision {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--pb-spacing-md);
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
.decision {
  align-items: center;
}
</style>
