<script setup lang="ts">
import TransientNotice from "../_shared/TransientNotice.vue";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { computed, nextTick, ref, toRefs, watch } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const TOAST_DURATION = useTokenNumber("toast.duration");

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    message: string;
    /** Optional action, such as undo. Absent means a text-only notice. */
    actionLabel?: string;
    /** CSS selector for overlay host; Runtime defaults to .runtime-app */
    attach?: string;
    /** Page-unique inspect / comment anchor; falls back to `ds.toast`. */
    inspectId?: string;
  }>(),
  { actionLabel: "" },
);
const emit = defineEmits<{ "update:modelValue": [boolean]; undo: [] }>();

const rootRef = usePbInspectRef();
const { modelValue, message, actionLabel, attach, inspectId } = toRefs(props);
const used = ref(false);
watch(modelValue, (open) => {
  if (open) used.value = false;
});

function undo() {
  if (!modelValue.value || used.value || !actionLabel.value) return;
  used.value = true;
  emit("undo");
  emit("update:modelValue", false);
}

const attachTarget = computed(() => attach.value ?? ".runtime-app");

const { resync } = usePbInspect({
  element: rootRef,
  pbId: "ds.toast",
  instanceId: inspectId,
  componentId: "toast",
  getProps: () => ({
    modelValue: modelValue.value ?? true,
    message: message.value,
    actionLabel: actionLabel.value,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.inverse-surface",
    "color.on-inverse-surface",
    "radius.surface",
    "spacing.sm",
    "spacing.xs",
    "toast.gap",
    "typography.content",
    "toast.duration",
    "size.touch",
    "border.focus",
  ],
  getTokenBindings: () => ({
    surface: "color.inverse-surface",
    text: "color.on-inverse-surface",
    radius: "radius.surface",
    paddingX: "spacing.sm",
    paddingY: "toast.gap",
    message: "typography.content",
    duration: "toast.duration",
    gap: "spacing.sm",
    target: "size.touch",
    focus: "border.focus",
    actionPadding: "spacing.xs",
  }),
});

watch(modelValue, async (value) => {
  if (!value) return;
  await nextTick();
  resync();
});
</script>

<template>
  <TransientNotice
    class="pb-toast"
    :model-value="modelValue ?? true"
    :content-class="'pb-toast-surface'"
    :attach="attachTarget"
    absolute
    location="bottom"
    multi-line
    :timeout="TOAST_DURATION"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  >
    <div
      ref="rootRef"
      class="pb-toast-content"
      data-pb-id="ds.toast"
      data-pb-role="toast"
      data-pb-shell="toast"
    >
      <span>{{ message }}</span>
      <button
        v-if="actionLabel"
        type="button"
        :disabled="used"
        @click="undo"
      >
        {{ actionLabel }}
      </button>
    </div>
  </TransientNotice>
</template>

<style scoped>
.pb-toast-content {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-toast-gap) var(--pb-spacing-sm);
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
/* Teleported overlay content; keep classes unscoped so attach target still styles. */
.pb-toast-surface {
  border-radius: var(--pb-radius-surface) !important;
  background: var(--pb-color-inverse-surface) !important;
  color: var(--pb-color-on-inverse-surface) !important;
  box-shadow: none !important;
  font: var(--pb-typography-content);
}
.pb-toast.v-snackbar > .v-overlay__content {
  position: absolute !important;
  right: var(--pb-spacing-sm) !important;
  bottom: var(--pb-spacing-sm) !important;
  left: var(--pb-spacing-sm) !important;
  width: auto !important;
}
</style>
