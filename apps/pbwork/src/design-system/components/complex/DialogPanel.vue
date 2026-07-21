<script setup lang="ts">
import { computed, toRefs } from "vue";
import Button from "@/design-system/components/basic/Button.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  modelValue?: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  contained?: boolean;
  /** CSS selector for overlay host; Runtime defaults to .runtime-app */
  attach?: string;
}>();

defineEmits<{
  "update:modelValue": [boolean];
  confirm: [];
}>();

const rootRef = usePbInspectRef();
const { modelValue, title, message, confirmLabel, contained, attach } =
  toRefs(props);

const attachTarget = computed(() => attach.value ?? ".runtime-app");

usePbInspect({
  element: rootRef,
  pbId: "ds.dialog",
  componentId: "dialog",
  getProps: () => ({
    modelValue: modelValue.value ?? false,
    title: title.value,
    message: message.value ?? "",
    confirmLabel: confirmLabel.value ?? "确认",
    contained: contained.value ?? false,
  }),
  getTokens: () => [
    "color.scrim",
    "color.surface-raised",
    "color.on-surface",
    "radius.xl",
    "elevation.level-5",
    "spacing.lg",
    "typography.title",
  ],
  getTokenBindings: () => ({
    scrim: "color.scrim",
    surface: "color.surface-raised",
    text: "color.on-surface",
    radius: "radius.xl",
    elevation: "elevation.level-5",
    padding: "spacing.lg",
    title: "typography.title",
  }),
});
</script>

<template>
  <span ref="rootRef" class="dialog-host" data-pb-id="ds.dialog">
    <v-dialog
      :model-value="modelValue ?? false"
      :attach="attachTarget"
      :absolute="contained ?? true"
      max-width="320"
      @update:model-value="$emit('update:modelValue', Boolean($event))"
    >
      <v-card
        class="pb-dialog dialog"
        data-pb-id="ds.dialog.surface"
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
            @click="$emit('update:modelValue', false)"
          />
          <Button :label="confirmLabel ?? '确认'" @click="$emit('confirm')" />
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
  border: 1px solid var(--pb-color-border, #d7dee8);
  /* surface-raised is not a Vuetify semantic; keep Token var for raised panel. */
  background: var(--pb-color-surface-raised, #ffffff) !important;
  color: rgb(var(--v-theme-on-surface));
  box-shadow: var(--pb-elevation-level-5, 0 22px 48px rgba(15, 23, 42, 0.24));
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
