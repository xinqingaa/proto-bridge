<script setup lang="ts">
import { computed, nextTick, toRefs, watch } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import SheetHeader from "@/design-system/components/_shared/SheetHeader.vue";

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
    headerControl: "sizing.touch",
    fill: "layout.fill",
    flexFill: "layout.flex-fill",
    duration: "motion.duration-sheet",
    easing: "motion.easing-gentle",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "radius.lg",
    "elevation.raised",
    "typography.subtitle",
    "typography.content",
    "spacing.md",
    "sizing.touch",
    "layout.fill",
    "layout.flex-fill",
    "motion.duration-sheet",
    "motion.easing-gentle",
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
      <SheetHeader
        :title="title"
        :inspect-id="inspectId ?? 'ds.bottom-sheet'"
        @close="$emit('update:modelValue', false)"
      />
      <v-card-text class="pb-sheet-body">
        <slot />
      </v-card-text>
      <footer v-if="$slots.actions" class="pb-sheet-actions">
        <slot name="actions" />
      </footer>
    </v-card>
  </v-bottom-sheet>
</template>

<style scoped>
.pb-sheet {
  overflow: hidden;
  border-radius: var(--pb-radius-lg) var(--pb-radius-lg) var(--pb-radius-none)
    var(--pb-radius-none);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-elevation-raised);
}
.pb-sheet-body {
  overflow-y: auto;
  padding: var(--pb-spacing-md);
  color: inherit;
  font: var(--pb-typography-content);
}
.pb-sheet-actions {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-sm-plus) var(--pb-spacing-md) var(--pb-spacing-md);
  border-top: var(--pb-border-hairline);
}
.pb-sheet-actions > * {
  flex: var(--pb-layout-flex-fill);
  width: var(--pb-layout-fill);
  min-width: var(--pb-spacing-none);
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
.pb-sheet-host.v-bottom-sheet
  > .v-bottom-sheet__content.v-overlay__content {
  transition-property: transform !important;
  transition-duration: var(--pb-motion-duration-sheet) !important;
  transition-timing-function: var(--pb-motion-easing-gentle) !important;
}
.pb-sheet-host.v-bottom-sheet
  > .v-bottom-sheet__content.v-overlay__content
  > .pb-sheet {
  border-radius: var(--pb-radius-lg) var(--pb-radius-lg) var(--pb-radius-none)
    var(--pb-radius-none) !important;
}
.pb-sheet-host.v-bottom-sheet
  > .v-bottom-sheet__content.v-overlay__content
  > .pb-sheet
  > .pb-sheet-body {
  padding: var(--pb-spacing-md) !important;
}
</style>
