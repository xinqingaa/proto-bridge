<script setup lang="ts">
import { useTokenNumber } from "@/design-system/theme/runtime-theme";

import { computed, nextTick, toRefs, watch } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
const TOAST_DURATION = useTokenNumber("toast.duration");

const props = defineProps<{
  modelValue?: boolean;
  message: string;
  /** CSS selector for overlay host; Runtime defaults to .runtime-app */
  attach?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.toast`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [boolean] }>();

const rootRef = usePbInspectRef();
const { modelValue, message, attach, inspectId } = toRefs(props);

const attachTarget = computed(() => attach.value ?? ".runtime-app");

const { resync } = usePbInspect({
  element: rootRef,
  pbId: "ds.toast",
  instanceId: inspectId,
  componentId: "toast",
  getProps: () => ({
    modelValue: modelValue.value ?? true,
    message: message.value,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.inverse-surface",
    "color.on-inverse-surface",
    "radius.surface",
    "spacing.sm",
    "toast.gap",
    "typography.content",
    "toast.duration",
  ],
  getTokenBindings: () => ({
    surface: "color.inverse-surface",
    text: "color.on-inverse-surface",
    radius: "radius.surface",
    paddingX: "spacing.sm",
    paddingY: "toast.gap",
    message: "typography.content",
    duration: "toast.duration",
  }),
});

watch(modelValue, async (value) => {
  if (!value) return;
  await nextTick();
  resync();
});
</script>

<template>
  <v-snackbar
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
    </div>
  </v-snackbar>
</template>

<style scoped>
.pb-toast-content {
  display: flex;
  align-items: center;
  padding: var(--pb-toast-gap) var(--pb-spacing-sm);
  font: var(--pb-typography-content);
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
</style>
