<script setup lang="ts">
import { computed, ref } from "vue";
import TextField from "@/design-system/components/input/TextField.vue";
import SegmentedControl from "@/design-system/components/input/SegmentedControl.vue";
import YikeOptionPicker from "./YikeOptionPicker.vue";
import WheelPicker from "@/design-system/components/input/WheelPicker.vue";
import SwitchControl from "@/design-system/components/input/SwitchControl.vue";
import YikeHabitGlyph, { type YikeHabitIcon } from "./YikeHabitGlyph.vue";
import YikeAction from "./YikeAction.vue";
import {
  habitNameError,
  reminderTimeError,
  type YikeHabitDraft,
} from "./habit-form";
const props = withDefaults(
  defineProps<{
    modelValue: YikeHabitDraft;
    inspectId: string;
    submitting?: boolean;
    saveError?: string;
    validateOnMount?: boolean;
    showSave?: boolean;
  }>(),
  { showSave: true },
);
const emit = defineEmits<{
  "update:modelValue": [YikeHabitDraft];
  save: [YikeHabitDraft];
}>();
const clockColumns = [
  {
    id: "hour",
    label: "小时",
    unit: "时",
    numeric: true,
    options: Array.from({ length: 24 }, (_, value) => ({
      value,
      label: String(value).padStart(2, "0"),
    })),
  },
  {
    id: "minute",
    label: "分钟",
    unit: "分",
    numeric: true,
    options: Array.from({ length: 60 }, (_, value) => ({
      value,
      label: String(value).padStart(2, "0"),
    })),
  },
];
const clockValue = computed(() =>
  props.modelValue.reminderTime.split(":").map(Number),
);
function updateClock(values: Array<string | number>) {
  update(
    "reminderTime",
    values.map((value) => String(value).padStart(2, "0")).join(":"),
  );
}
const attempted = ref(Boolean(props.validateOnMount));
const nameError = computed(() =>
  attempted.value ? habitNameError(props.modelValue.name) : "",
);
const timeError = computed(() =>
  attempted.value ? reminderTimeError(props.modelValue) : "",
);
const icons: Array<{ id: YikeHabitIcon; label: string }> = [
  { id: "leaf", label: "叶子" },
  { id: "book", label: "书" },
  { id: "water", label: "水杯" },
  { id: "run", label: "脚步" },
  { id: "moon", label: "月亮" },
  { id: "stretch", label: "拉伸" },
];
function update<K extends keyof YikeHabitDraft>(
  key: K,
  value: YikeHabitDraft[K],
) {
  emit("update:modelValue", { ...props.modelValue, [key]: value });
}
function save() {
  if (props.submitting) return;
  attempted.value = true;
  if (
    habitNameError(props.modelValue.name) ||
    reminderTimeError(props.modelValue)
  )
    return;
  emit("save", { ...props.modelValue, name: props.modelValue.name.trim() });
}
</script>
<template>
  <form
    class="habit-form"
    :id="inspectId"
    :aria-busy="submitting || undefined"
    :data-pb-id="inspectId"
    data-pb-role="form"
    data-pb-token-gap="spacing.md"
    data-pb-token-color="color.on-surface"
    @submit.prevent="save"
  >
    <TextField
      :model-value="modelValue.name"
      label="习惯名称"
      show-label
      placeholder="比如，读 20 页书"
      :error-message="nameError"
      :disabled="Boolean(submitting)"
      :inspect-id="`${inspectId}.name`"
      @update:model-value="update('name', $event)"
    />
    <fieldset
      :data-pb-id="`${inspectId}.icons`"
      data-pb-role="field"
      data-pb-token-typography="typography.body-sm"
      data-pb-token-color="color.on-surface-muted"
      class="icons"
      :disabled="Boolean(submitting)"
    >
      <legend>图标</legend>
      <div class="icon-options">
        <label
          v-for="icon in icons"
          :key="icon.id"
          :data-pb-id="`${inspectId}.icon.${icon.id}`"
          :data-pb-key="icon.id"
          data-pb-role="filter"
          data-pb-token-size="size.touch"
          data-pb-token-radius="radius.control-compact"
          :data-pb-token-color="
            modelValue.icon === icon.id
              ? 'color.primary'
              : 'color.on-surface-muted'
          "
          :class="{ selected: modelValue.icon === icon.id }"
          :title="icon.label"
        >
          <input
            type="radio"
            :name="`${inspectId}.icon`"
            :aria-label="icon.label"
            :checked="modelValue.icon === icon.id"
            @change="update('icon', icon.id)"
          />
          <YikeHabitGlyph :icon="icon.id" />
        </label>
      </div>
    </fieldset>
    <div class="frequency-field">
      <span
        class="hint"
        :data-pb-id="`${inspectId}.frequency-label`"
        data-pb-role="text"
        data-pb-token-typography="typography.caption"
        >频率</span
      >
      <SegmentedControl
        label="频率"
        material="glass"
        :items="[
          { id: 'daily', label: '每天' },
          { id: 'weekly', label: '每周' },
        ]"
        :model-value="modelValue.frequency"
        :disabled="Boolean(submitting)"
        :inspect-id="`${inspectId}.frequency`"
        @update:model-value="
          update('frequency', $event === 'weekly' ? 'weekly' : 'daily')
        "
      />
    </div>
    <YikeOptionPicker
      v-if="modelValue.frequency === 'weekly'"
      label="每周次数"
      :model-value="modelValue.target"
      :options="
        Array.from({ length: 7 }, (_, i) => ({
          value: i + 1,
          label: `每周 ${i + 1} 次`,
        }))
      "
      :disabled="Boolean(submitting)"
      :inspect-id="`${inspectId}.target`"
      @update:model-value="update('target', Number($event))"
    />
    <SwitchControl
      label="提醒"
      label-position="start"
      :model-value="modelValue.reminder"
      :disabled="Boolean(submitting)"
      :inspect-id="`${inspectId}.reminder`"
      @update:model-value="update('reminder', $event)"
    />
    <div v-if="modelValue.reminder" class="time-field">
      <span>本地时间</span>
      <WheelPicker
        label="提醒时间"
        :columns="clockColumns"
        :model-value="clockValue"
        :disabled="Boolean(submitting)"
        :inspect-id="`${inspectId}.time`"
        :aria-invalid="Boolean(timeError)"
        :aria-describedby="timeError ? `${inspectId}.time-error` : undefined"
        @update:model-value="updateClock"
      />
      <small v-if="timeError" :id="`${inspectId}.time-error`">{{
        timeError
      }}</small>
      <span class="hint">仅保存并显示，不发送系统通知。</span>
    </div>
    <p v-if="saveError" role="alert" class="save-error">{{ saveError }}</p>
    <YikeAction
      v-if="showSave !== false"
      type="submit"
      label="保存"
      block
      :loading="Boolean(submitting)"
      :inspect-id="`${inspectId}.save`"
    />
  </form>
</template>
<style scoped>
.habit-form {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-md);
}
.frequency-field {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
.icons {
  border: none;
  padding: var(--pb-layout-zero);
  min-inline-size: var(--pb-layout-zero);
}
legend,
.time-field {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-body-sm);
}
.icon-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--pb-spacing-sm);
  margin-block-start: var(--pb-spacing-sm);
}
.icon-options label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: var(--pb-size-touch);
  min-block-size: var(--pb-size-touch);
  border-radius: var(--pb-radius-control-compact);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface-muted);
  border: var(--pb-border-default);
}
.icon-options input {
  position: absolute;
  inset: var(--pb-layout-zero);
  inline-size: var(--pb-layout-fill);
  block-size: var(--pb-layout-fill);
  opacity: var(--pb-opacity-hidden);
  cursor: pointer;
}
.icon-options label.selected {
  color: var(--pb-color-primary);
  background: var(--pb-color-primary-soft);
  border-color: var(--pb-color-primary);
}
.icon-options label:has(input:focus-visible) {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
.time-field {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
.hint {
  font: var(--pb-typography-caption);
}
.save-error,
small {
  color: var(--pb-color-error);
  font: var(--pb-typography-caption);
}
</style>
