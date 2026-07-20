<script setup lang="ts">
import { toRefs } from "vue";
import Button from "@/design-system/components/basic/Button.vue";
import {
  usePbInspect,
  usePbInspectRef,
} from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  modelValue?: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  contained?: boolean;
}>();

defineEmits<{
  "update:modelValue": [boolean];
  confirm: [];
}>();

const rootRef = usePbInspectRef();
const { modelValue, title, message, confirmLabel, contained } = toRefs(props);

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
    <div
      v-if="modelValue"
      class="pb-dialog-scrim"
      :class="{ 'is-contained': contained }"
      data-pb-id="ds.dialog.surface"
      data-pb-shell="dialog"
      @click.self="$emit('update:modelValue', false)"
    >
      <section role="dialog" aria-modal="true" :aria-label="title">
        <h2>{{ title }}</h2>
        <p>{{ message ?? "请确认是否继续。" }}</p>
        <div>
          <Button
            label="取消"
            variant="text"
            @click="$emit('update:modelValue', false)"
          />
          <Button :label="confirmLabel ?? '确认'" @click="$emit('confirm')" />
        </div>
      </section>
    </div>
  </span>
</template>

<style scoped>
.dialog-host {
  display: contents;
}
.pb-dialog-scrim {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--pb-color-scrim, rgba(2, 6, 23, 0.72));
}
.pb-dialog-scrim.is-contained {
  position: absolute;
  border-radius: inherit;
}
section {
  width: min(320px, 100%);
  padding: var(--pb-spacing-lg);
  border-radius: var(--pb-radius-xl);
  border: 1px solid var(--pb-color-border, #d7dee8);
  background: var(--pb-color-surface-raised, #ffffff);
  color: var(--pb-color-on-surface, #1f2937);
  box-shadow: var(--pb-elevation-level-5, 0 22px 48px rgba(15, 23, 42, 0.24));
}
h2 {
  margin: 0 0 8px;
  font: var(--pb-typography-title);
}
p {
  margin: 0 0 20px;
  font: var(--pb-typography-content);
}
section > div {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
