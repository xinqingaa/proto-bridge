<script setup lang="ts">
import { computed, ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";

const props = withDefaults(
  defineProps<{
    label?: string;
    modelValue?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    inspectId?: string;
    pbKey?: string;
  }>(),
  {
    label: "每日目标",
    modelValue: 3,
    min: 0,
    max: 10,
    step: 1,
    disabled: false,
  },
);
const emit = defineEmits<{ "update:modelValue": [value: number] }>();
const rootRef = ref<HTMLElement | null>(null);

const lower = computed(() => (Number.isFinite(props.min) ? props.min : 0));
const upper = computed(() =>
  Number.isFinite(props.max) ? Math.max(lower.value, props.max) : lower.value,
);
const increment = computed(() =>
  Number.isFinite(props.step) && props.step > 0 ? props.step : 1,
);
const current = computed(() => normalize(props.modelValue));
function normalize(value: number) {
  const bounded = Math.max(
    lower.value,
    Math.min(upper.value, Number.isFinite(value) ? value : lower.value),
  );
  return Number(
    Math.max(
      lower.value,
      Math.min(
        upper.value,
        lower.value +
          Math.round((bounded - lower.value) / increment.value) *
            increment.value,
      ),
    ).toFixed(8),
  );
}
function change(value: number) {
  if (!props.disabled && Number.isFinite(value))
    emit("update:modelValue", normalize(value));
}
function input(event: Event) {
  const el = event.target as HTMLInputElement;
  if (!props.disabled && Number.isFinite(el.valueAsNumber))
    change(el.valueAsNumber);
  el.value = String(current.value);
}

usePbInspect({
  element: rootRef,
  pbId: "ds.stepper",
  componentId: "stepper",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    surface: "color.surface",
    color: "color.on-surface",
    gap: "spacing.sm",
    typography: "typography.content",
    radius: "radius.control",
    padding: "spacing.xs",
    target: "size.touch",
    focus: "border.focus",
    disabledOpacity: "opacity.disabled",
    border: "border.hairline",
    number: "typography.numeric-content",
    focusOffset: "spacing.xxs",
    contentExtent: "size.avatar-large",
  }),
});
</script>
<template>
  <div
    ref="rootRef"
    class="stepper"
    data-pb-role="field"
    role="group"
    :aria-label="label"
    data-no-swipe
  >
    <button
      type="button"
      :aria-label="`减少${label}`"
      :disabled="disabled || current <= lower"
      @click="change(current - increment)"
    >
      −
    </button>
    <input
      type="number"
      :aria-label="label"
      :value="current"
      :min="lower"
      :max="upper"
      :step="increment"
      :disabled="disabled"
      @change="input"
    />
    <button
      type="button"
      :aria-label="`增加${label}`"
      :disabled="disabled || current >= upper"
      @click="change(current + increment)"
    >
      +
    </button>
  </div>
</template>
<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
button,
input {
  min-height: var(--pb-size-touch);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-surface);
  color: inherit;
  font: inherit;
}
button {
  min-width: var(--pb-size-touch);
  padding: var(--pb-spacing-xs);
  cursor: pointer;
}
input {
  width: var(--pb-size-avatar-large);
  min-width: var(--pb-layout-zero);
  text-align: center;
  font: var(--pb-typography-numeric-content);
}
button:focus-visible,
input:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
button:disabled,
input:disabled {
  opacity: var(--pb-opacity-disabled);
  cursor: default;
}
</style>
