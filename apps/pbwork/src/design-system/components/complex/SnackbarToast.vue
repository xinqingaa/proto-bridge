<script setup lang="ts">
import { computed, nextTick, toRefs, watch } from "vue";
import { CheckCircle2, AlertCircle } from "lucide-vue-next";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

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
  ],
  getTokenBindings: () => ({
    accent: `color.${tone.value ?? "success"}`,
    surface: "color.surface-raised",
    text: "color.on-surface",
    radius: "radius.lg",
    elevation: "elevation.level-4",
    padding: "spacing.md",
    message: "typography.content",
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
    timeout="4000"
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
        :size="20"
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
  color: rgb(var(--v-theme-on-surface)) !important;
  box-shadow: var(--pb-elevation-level-4);
  border-left: 4px solid rgb(var(--v-theme-success));
  font: var(--pb-typography-content);
}
.pb-snackbar-surface.is-error {
  border-left-color: rgb(var(--v-theme-error));
}
.pb-snackbar-surface.is-info {
  border-left-color: rgb(var(--v-theme-info));
}
</style>
