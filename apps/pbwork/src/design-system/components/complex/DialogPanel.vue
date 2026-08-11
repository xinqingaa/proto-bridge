<script setup lang="ts">
import { computed, nextTick, toRefs, watch } from "vue";
import Button from "@/design-system/components/basic/Button.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const DIALOG_MAX_WIDTH = tokenDefaultNumber("layout.dialog-max-width");

const props = defineProps<{
  modelValue?: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  contained?: boolean;
  /** CSS selector for overlay host; Runtime defaults to .runtime-app */
  attach?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.dialog`. */
  inspectId?: string;
}>();

defineEmits<{
  "update:modelValue": [boolean];
  confirm: [];
}>();

const rootRef = usePbInspectRef();
const {
  modelValue,
  title,
  message,
  confirmLabel,
  contained,
  attach,
  inspectId,
} = toRefs(props);

const attachTarget = computed(() => attach.value ?? ".runtime-app");

const { resync } = usePbInspect({
  element: rootRef,
  pbId: "ds.dialog",
  instanceId: inspectId,
  componentId: "dialog",
  getProps: () => ({
    modelValue: modelValue.value ?? false,
    title: title.value,
    message: message.value ?? "",
    confirmLabel: confirmLabel.value ?? "确认",
    contained: contained.value ?? false,
    inspectId: inspectId.value,
  }),
  getTokens: () => [
    "color.scrim",
    "color.surface-raised",
    "color.border",
    "color.on-surface",
    "radius.xl",
    "elevation.level-5",
    "typography.title",
    "typography.content",
    "layout.dialog-max-width",
  ],
  getTokenBindings: () => ({
    scrim: "color.scrim",
    surface: "color.surface-raised",
    border: "color.border",
    text: "color.on-surface",
    radius: "radius.xl",
    elevation: "elevation.level-5",
    title: "typography.title",
    body: "typography.content",
    maxWidth: "layout.dialog-max-width",
  }),
});

watch(modelValue, async (value) => {
  if (!value) return;
  await nextTick();
  resync();
});
</script>

<template>
  <span class="dialog-host">
    <v-dialog
      :model-value="modelValue ?? false"
      :attach="attachTarget"
      :absolute="contained ?? true"
      :max-width="DIALOG_MAX_WIDTH"
      @update:model-value="$emit('update:modelValue', Boolean($event))"
    >
      <v-card
        ref="rootRef"
        class="pb-dialog dialog"
        data-pb-id="ds.dialog"
        data-pb-role="dialog"
        data-pb-shell="dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        variant="flat"
        color="surface"
      >
        <v-card-title>{{ title }}</v-card-title>
        <v-card-text>{{ message ?? "请确认是否继续。" }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <Button
            label="取消"
            variant="text"
            v-bind="inspectId ? { inspectId: `${inspectId}.cancel` } : {}"
            @click="$emit('update:modelValue', false)"
          />
          <Button
            :label="confirmLabel ?? '确认'"
            v-bind="inspectId ? { inspectId: `${inspectId}.confirm` } : {}"
            @click="$emit('confirm')"
          />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </span>
</template>

<style scoped>
.dialog-host {
  display: contents;
}
.pb-dialog {
  border-radius: var(--pb-radius-xl) !important;
  border: var(--pb-border-hairline);
  /* surface-raised is not a Vuetify semantic; keep Token var for raised panel. */
  background: var(--pb-color-surface-raised) !important;
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-elevation-level-5);
}
.pb-dialog :deep(.v-card-title) {
  color: inherit;
  font: var(--pb-typography-title);
}
.pb-dialog :deep(.v-card-text) {
  color: inherit;
  font: var(--pb-typography-content);
}
</style>
