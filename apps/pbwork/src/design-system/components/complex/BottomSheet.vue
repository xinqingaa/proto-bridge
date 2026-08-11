<script setup lang="ts">
import { computed, nextTick, toRefs, watch } from "vue";
import Button from "@/design-system/components/basic/Button.vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";

const props = defineProps<{
  title: string;
  modelValue?: boolean;
  /** CSS selector for overlay host; Runtime defaults to .runtime-app */
  attach?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.bottom-sheet`. */
  inspectId?: string;
}>();
defineEmits<{ "update:modelValue": [value: boolean] }>();

const sheetRef = usePbInspectRef();
const { title, modelValue, attach, inspectId } = toRefs(props);

const attachTarget = computed(() => attach.value ?? ".runtime-app");

const { resync } = usePbInspect({
  element: sheetRef,
  pbId: "ds.bottom-sheet",
  instanceId: inspectId,
  componentId: "bottom-sheet",
  getProps: () => ({
    title: title.value,
    modelValue: modelValue.value ?? false,
    inspectId: inspectId.value,
  }),
  getState: () => ({ open: Boolean(modelValue.value) }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    radius: "radius.lg",
    elevation: "elevation.raised",
    title: "typography.subtitle",
    body: "typography.content",
    padding: "spacing.md",
    fill: "layout.fill",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "radius.lg",
    "elevation.raised",
    "typography.subtitle",
    "typography.content",
    "spacing.md",
    "layout.fill",
  ],
});

watch(modelValue, async (value) => {
  if (!value) return;
  await nextTick();
  resync();
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
      data-pb-role="sheet"
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
  border-radius: var(--pb-radius-lg) var(--pb-radius-lg) var(--pb-radius-none)
    var(--pb-radius-none);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-elevation-raised);
}
.pb-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--pb-spacing-md);
  border-bottom: var(--pb-border-hairline);
  color: inherit;
  font: var(--pb-typography-subtitle);
}
.pb-sheet-body {
  padding: var(--pb-spacing-md);
  color: inherit;
  font: var(--pb-typography-content);
}
</style>

<!-- Overlay attaches outside scoped tree; keep full-bleed width in phone shell. -->
<style>
.pb-sheet-host.v-bottom-sheet > .v-overlay__content,
.pb-sheet-host.v-bottom-sheet > .v-bottom-sheet__content {
  width: var(--pb-layout-fill) !important;
  max-width: var(--pb-layout-fill) !important;
  margin-inline: var(--pb-spacing-none) !important;
}
</style>
