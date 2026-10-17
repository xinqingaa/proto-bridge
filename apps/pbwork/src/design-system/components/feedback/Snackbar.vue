<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import TransientNotice from "../_shared/TransientNotice.vue";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    message?: string;
    actionLabel?: string;
    attach?: string;
    inspectId?: string;
    pbKey?: string;
  }>(),
  { modelValue: false, message: "记录已删除", actionLabel: "撤销" },
);
const emit = defineEmits<{ "update:modelValue": [value: boolean]; undo: [] }>();
const rootRef = ref<HTMLElement | null>(null);

const used = ref(false);
watch(
  () => props.modelValue,
  (open) => {
    if (open) used.value = false;
  },
);
const duration = useTokenNumber("toast.duration");
function undo() {
  if (!props.modelValue || used.value) return;
  used.value = true;
  emit("undo");
  emit("update:modelValue", false);
}
watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick();
      resync();
    }
  },
);

const { resync } = usePbInspect({
  element: rootRef,
  pbId: "ds.snackbar",
  componentId: "snackbar",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    surface: "color.inverse-surface",
    color: "color.on-inverse-surface",
    radius: "radius.surface",
    padding: "spacing.sm",
    gap: "spacing.sm",
    typography: "typography.content",
    target: "size.touch",
    focus: "border.focus",
    duration: "toast.duration",
    actionPadding: "spacing.xs",
  }),
});
</script>
<template>
  <TransientNotice
    :model-value="props.modelValue"
    :timeout="duration"
    :attach="attach ?? '.runtime-app'"
    content-class="pb-snackbar-surface"
    @update:model-value="emit('update:modelValue', $event)"
    ><div
      ref="rootRef"
      class="snackbar"
      data-pb-role="toast"
      data-pb-shell="toast"
      role="status"
      aria-live="polite"
    >
      <span>{{ message }}</span
      ><button type="button" :disabled="used" @click="undo">
        {{ actionLabel }}
      </button>
    </div></TransientNotice
  >
</template>
<style scoped>
.snackbar {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm);
  color: var(--pb-color-on-inverse-surface);
  font: var(--pb-typography-content);
}
button {
  min-height: var(--pb-size-touch);
  padding: var(--pb-spacing-xs) var(--pb-spacing-sm);
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
button:focus-visible {
  outline: var(--pb-border-focus);
}
button:disabled {
  cursor: default;
}
</style>

<style>
.pb-snackbar-surface {
  background: var(--pb-color-inverse-surface) !important;
  color: var(--pb-color-on-inverse-surface) !important;
  border-radius: var(--pb-radius-surface) !important;
  box-shadow: none !important;
}
</style>
