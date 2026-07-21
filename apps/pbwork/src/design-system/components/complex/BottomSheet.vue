<script setup lang="ts">
import { computed, toRefs } from "vue";
import Button from "@/design-system/components/basic/Button.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  title: string;
  modelValue?: boolean;
  /** CSS selector for overlay host; Runtime defaults to .runtime-app */
  attach?: string;
}>();
defineEmits<{ "update:modelValue": [value: boolean] }>();

const sheetRef = usePbInspectRef();
const { title, modelValue, attach } = toRefs(props);

const attachTarget = computed(() => attach.value ?? ".runtime-app");

usePbInspect({
  element: sheetRef,
  pbId: "ds.bottom-sheet",
  componentId: "bottom-sheet",
  getProps: () => ({
    title: title.value,
    modelValue: modelValue.value ?? false,
  }),
  getState: () => ({ open: Boolean(modelValue.value) }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    radius: "radius.lg",
    elevation: "elevation.raised",
    title: "typography.subtitle",
    body: "typography.content",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "radius.lg",
    "elevation.raised",
    "typography.subtitle",
    "typography.content",
  ],
});
</script>

<template>
  <v-bottom-sheet
    :model-value="modelValue ?? false"
    class="pb-sheet-host"
    scrim
    :attach="attachTarget"
    absolute
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  >
    <v-card
      ref="sheetRef"
      class="pb-sheet sheet"
      data-pb-id="ds.bottom-sheet"
      data-pb-shell="sheet"
      role="dialog"
      aria-modal="true"
      color="surface"
      variant="flat"
    >
      <v-card-title class="pb-sheet-header">
        <span>{{ title }}</span>
        <Button
          label="关闭"
          variant="text"
          @click="$emit('update:modelValue', false)"
        />
      </v-card-title>
      <v-card-text class="pb-sheet-body">
        <slot />
      </v-card-text>
    </v-card>
  </v-bottom-sheet>
</template>

<style scoped>
.pb-sheet {
  border-radius: var(--pb-radius-lg, 16px) var(--pb-radius-lg, 16px) 0 0;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: var(--pb-elevation-raised, none);
}
.pb-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--pb-spacing-md, 16px);
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
  color: inherit;
  font: var(
    --pb-typography-subtitle,
    600 16px/1.4 Inter,
    system-ui,
    sans-serif
  );
}
.pb-sheet-body {
  padding: var(--pb-spacing-md, 16px);
  color: inherit;
  font: var(--pb-typography-content, 400 14px/1.5 Inter, system-ui, sans-serif);
}
</style>
