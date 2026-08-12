<script setup lang="ts">
import { computed, nextTick, toRefs, watch } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const TOAST_DURATION = tokenDefaultNumber("motion.duration-toast");

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
    "color.toast",
    "color.on-toast",
    "radius.lg",
    "spacing.sm",
    "spacing.xs-plus",
    "typography.content",
    "motion.duration-toast",
  ],
  getTokenBindings: () => ({
    surface: "color.toast",
    text: "color.on-toast",
    radius: "radius.lg",
    paddingX: "spacing.sm",
    paddingY: "spacing.xs-plus",
    message: "typography.content",
    duration: "motion.duration-toast",
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
  padding: var(--pb-spacing-xs-plus) var(--pb-spacing-sm);
  font: var(--pb-typography-content);
}
</style>

<style>
/* Teleported overlay content; keep classes unscoped so attach target still styles. */
.pb-toast-surface {
  border-radius: var(--pb-radius-lg) !important;
  background: var(--pb-color-toast) !important;
  color: var(--pb-color-on-toast) !important;
  box-shadow: none !important;
  font: var(--pb-typography-content);
}
</style>
