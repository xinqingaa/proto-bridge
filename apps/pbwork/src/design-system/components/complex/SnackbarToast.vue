<script setup lang="ts">
import { computed, nextTick, toRefs, watch } from "vue";
import { CheckCircle2, AlertCircle } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const TOAST_DURATION = tokenDefaultNumber("motion.duration-toast");
const TOAST_ICON_SIZE = tokenDefaultNumber("sizing.icon-md");

const props = defineProps<{
  modelValue?: boolean;
  message: string;
  tone?: "success" | "error" | "info";
  /** CSS selector for overlay host; Runtime defaults to .runtime-app */
  attach?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.snackbar`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [boolean] }>();

const rootRef = usePbInspectRef();
const { modelValue, message, tone, attach, inspectId } = toRefs(props);

const color = computed(() => tone.value ?? "success");
const attachTarget = computed(() => attach.value ?? ".runtime-app");

const { resync } = usePbInspect({
  element: rootRef,
  pbId: "ds.snackbar",
  instanceId: inspectId,
  componentId: "snackbar",
  getProps: () => ({
    modelValue: modelValue.value ?? true,
    message: message.value,
    tone: tone.value ?? "success",
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    `color.${tone.value ?? "success"}`,
    "color.surface-raised",
    "color.on-surface",
    "radius.lg",
    "elevation.level-4",
    "spacing.md",
    "typography.content",
    "border.accent-width",
    "motion.duration-toast",
    "sizing.icon-md",
  ],
  getTokenBindings: () => ({
    accent: `color.${tone.value ?? "success"}`,
    surface: "color.surface-raised",
    text: "color.on-surface",
    radius: "radius.lg",
    elevation: "elevation.level-4",
    padding: "spacing.md",
    message: "typography.content",
    accentWidth: "border.accent-width",
    duration: "motion.duration-toast",
    iconSize: "sizing.icon-md",
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
    class="pb-snackbar"
    :model-value="modelValue ?? true"
    color="surface"
    :content-class="`pb-snackbar-surface is-${color}`"
    :attach="attachTarget"
    absolute
    location="bottom"
    multi-line
    :timeout="TOAST_DURATION"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  >
    <div
      ref="rootRef"
      class="pb-snackbar-content"
      data-pb-id="ds.snackbar"
      data-pb-role="toast"
      data-pb-shell="toast"
    >
      <component
        :is="tone === 'error' ? AlertCircle : CheckCircle2"
        :size="TOAST_ICON_SIZE"
      />
      <span>{{ message }}</span>
    </div>
    <template #actions>
      <v-btn
        variant="text"
        aria-label="关闭提示"
        @click="$emit('update:modelValue', false)"
      >
        关闭
      </v-btn>
    </template>
  </v-snackbar>
</template>

<style scoped>
.pb-snackbar-content {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm-plus);
}
</style>

<style>
/* Teleported overlay content; keep classes unscoped so attach target still styles. */
.pb-snackbar-surface {
  border-radius: var(--pb-radius-lg) !important;
  background: var(--pb-color-surface-raised) !important;
  color: var(--pb-color-on-surface) !important;
  box-shadow: var(--pb-elevation-level-4);
  border-left: var(--pb-border-accent-width) solid var(--pb-color-success);
  font: var(--pb-typography-content);
}
.pb-snackbar-surface.is-error {
  border-left-color: var(--pb-color-error);
}
.pb-snackbar-surface.is-info {
  border-left-color: var(--pb-color-info);
}
</style>
