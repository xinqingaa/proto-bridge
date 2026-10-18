<script setup lang="ts">
import { computed, nextTick, toRefs, watch } from "vue";
import { usePbInspect, usePbInspectRef } from "@/runtime/inspect/usePbInspect";
import { useOverlayReturnFocus } from "@/design-system/components/_shared/useOverlayReturnFocus";
import SheetHeader from "@/design-system/components/_shared/SheetHeader.vue";

const props = defineProps<{
  title: string;
  modelValue?: boolean;
  /** CSS selector for overlay host; Runtime defaults to .runtime-app */
  attach?: string;
  /** Page-unique inspect / comment anchor; falls back to `ds.bottom-sheet`. */
  inspectId?: string;
  detent?: "content" | "medium" | "expanded";
  detents?: Array<"content" | "medium" | "expanded">;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "update:detent": [value: "content" | "medium" | "expanded"];
}>();

const sheetRef = usePbInspectRef();
const { title, modelValue, attach, inspectId } = toRefs(props);
const restoreTriggerFocus = useOverlayReturnFocus(() => Boolean(props.modelValue));

const currentDetent = computed(() => props.detent ?? "content");
const detentLabels = { content: "适应内容", medium: "半屏", expanded: "展开" };
const availableDetents = computed(() => [...new Set(props.detents ?? [])]);
function selectDetent(detent: "content" | "medium" | "expanded") {
  emit("update:detent", detent);
}

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
    detent: currentDetent.value,
    detents: availableDetents.value,
  }),
  getState: () => ({ open: Boolean(modelValue.value) }),
  getTokenBindings: () => ({
    surface: "color.surface",
    border: "color.border",
    radius: "radius.surface",
    elevation: "elevation.raised",
    title: "typography.subtitle",
    body: "typography.content",
    padding: "spacing.md",
    headerControl: "size.touch",
    detentGap: "spacing.sm",
    detentPadding: "spacing.xs",
    detentBorder: "border.hairline",
    detentSelected: "color.surface-selected",
    detentFocus: "border.focus",
    mediumHeight: "size.panel-medium",
    expandedHeight: "size.panel-large",
    duration: "bottom-sheet.duration",
    easing: "motion.easing-gentle",
  }),
  getTokens: () => [
    "color.surface",
    "color.border",
    "radius.surface",
    "elevation.raised",
    "typography.subtitle",
    "typography.content",
    "spacing.md",
    "size.touch",
    "spacing.sm",
    "spacing.xs",
    "border.hairline",
    "color.surface-selected",
    "border.focus",
    "size.panel-medium",
    "size.panel-large",
    "bottom-sheet.duration",
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
    :data-detent="currentDetent"
    scrim
    :attach="attachTarget"
    absolute
    @after-leave="restoreTriggerFocus"
    @update:model-value="$emit('update:modelValue', Boolean($event))"
  >
    <v-card
      ref="sheetRef"
      class="pb-sheet sheet"
      :data-detent="currentDetent"
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
      <div
        v-if="availableDetents.length"
        class="pb-sheet-detents"
        role="group"
        aria-label="面板高度"
      >
        <button
          v-for="detent in availableDetents"
          :key="detent"
          type="button"
          :aria-pressed="currentDetent === detent"
          @click="selectDetent(detent)"
        >
          {{ detentLabels[detent] }}
        </button>
      </div>
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
  border-radius: var(--pb-radius-surface) var(--pb-radius-surface)
    var(--pb-layout-zero) var(--pb-layout-zero);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-elevation-raised);
}
.pb-sheet[data-detent="medium"] {
  height: var(--pb-size-panel-medium);
}
.pb-sheet[data-detent="expanded"] {
  height: var(--pb-size-panel-large);
}
.pb-sheet-detents {
  display: flex;
  gap: var(--pb-spacing-sm);
  padding-inline: var(--pb-spacing-md);
}
.pb-sheet-detents button {
  min-height: var(--pb-size-touch);
  padding: var(--pb-spacing-xs) var(--pb-spacing-sm);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
  cursor: pointer;
}
.pb-sheet-detents button[aria-pressed="true"] {
  background: var(--pb-color-surface-selected);
}
.pb-sheet-detents button:focus-visible {
  outline: var(--pb-border-focus);
}
.pb-sheet-body {
  overflow-y: auto;
  padding: var(--pb-spacing-md);
  padding-bottom: var(--pb-spacing-2xl);
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
  min-width: var(--pb-layout-zero);
}
</style>

<!-- Overlay attaches outside scoped tree; keep full-bleed width in phone shell. -->
<style>
.pb-sheet-host[data-detent="medium"] > .v-overlay__content {
  height: var(--pb-size-panel-medium);
}
.pb-sheet-host[data-detent="expanded"] > .v-overlay__content {
  height: var(--pb-size-panel-large);
}
.pb-sheet-host.v-bottom-sheet > .v-overlay__scrim {
  position: absolute !important;
  inset: var(--pb-layout-zero) !important;
}
.pb-sheet-host.v-bottom-sheet > .v-overlay__content,
.pb-sheet-host.v-bottom-sheet > .v-bottom-sheet__content {
  position: absolute !important;
  right: var(--pb-layout-zero) !important;
  bottom: var(--pb-layout-zero) !important;
  left: var(--pb-layout-zero) !important;
  width: var(--pb-layout-fill) !important;
  max-width: var(--pb-layout-fill) !important;
  margin-inline: var(--pb-layout-zero) !important;
}
.pb-sheet-host.v-bottom-sheet > .v-bottom-sheet__content.v-overlay__content {
  transition-property: transform !important;
  transition-duration: var(--pb-bottom-sheet-duration) !important;
  transition-timing-function: var(--pb-motion-easing-gentle) !important;
}
.pb-sheet-host.v-bottom-sheet
  > .v-bottom-sheet__content.v-overlay__content
  > .pb-sheet {
  border-radius: var(--pb-radius-surface) var(--pb-radius-surface)
    var(--pb-layout-zero) var(--pb-layout-zero) !important;
}
.pb-sheet-host.v-bottom-sheet
  > .v-bottom-sheet__content.v-overlay__content
  > .pb-sheet
  > .pb-sheet-body {
  padding: var(--pb-spacing-md) !important;
  padding-bottom: var(--pb-spacing-2xl) !important;
}
</style>
