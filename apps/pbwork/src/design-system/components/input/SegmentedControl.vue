<script setup lang="ts">
import GlassMaterial from "../_shared/GlassMaterial.vue";
import { computed, ref, nextTick } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { vPb } from "@/authoring/pb-style";
import { useComponentParts } from "../_shared/componentParts";

const props = withDefaults(
  defineProps<{
    material?: "solid" | "glass";
    density?: "regular" | "compact";
    label?: string;
    items?: Array<{ id: string; label: string; disabled?: boolean }>;
    modelValue?: string;
    disabled?: boolean;
    inspectId?: string;
    pbKey?: string;
  }>(),
  {
    material: "solid",
    density: "regular",
    label: "统计范围",
    items: () => [
      { id: "week", label: "周" },
      { id: "month", label: "月" },
      { id: "year", label: "年" },
    ],
    modelValue: "week",
    disabled: false,
  },
);
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.segmented-control",
  () => props.pbKey,
);

function choose(id: string) {
  if (
    !props.disabled &&
    props.items.some((item) => item.id === id && !item.disabled) &&
    id !== props.modelValue
  )
    emit("update:modelValue", id);
}
const available = computed(() => props.items.filter((item) => !item.disabled));
const focusId = computed(() =>
  available.value.some((item) => item.id === props.modelValue)
    ? props.modelValue
    : available.value[0]?.id,
);
function key(event: KeyboardEvent) {
  if (
    props.disabled ||
    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
  )
    return;
  const items = available.value;
  if (!items.length) return;
  event.preventDefault();
  const current = items.findIndex(
    (item) => item.id === (event.target as HTMLElement).dataset.value,
  );
  const index =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + items.length) %
          items.length;
  const item = items[index]!;
  choose(item.id);
  void nextTick(() =>
    Array.from(
      rootRef.value?.querySelectorAll<HTMLElement>("[data-value]") ?? [],
    )
      .find((element) => element.dataset.value === item.id)
      ?.focus(),
  );
}

usePbInspect({
  element: rootRef,
  pbId: "ds.segmented-control",
  componentId: "segmented-control",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    compactHeight: "segmented-control.compact-height",
    compactSelectionHeight: "segmented-control.compact-selection-height",
    compactFont: "typography.body-sm",
    duration: "motion.duration-short",
    easing: "motion.easing-standard",
    glassTint: "color.glass-tint",
    glassEdge: "border.glass",
    glassLight: "elevation.glass",
    glassBackdrop: "surface.glass-backdrop",
    glassFallback: "color.surface",
    glassFallbackBorder: "border.default",
    compactRadius: "radius.control-compact",
    selectedText: "color.on-surface",
    inactiveText: "color.on-surface-muted",
    labelFont: "typography.label",
    selectedElevation: "elevation.surface",
    selectedSurface: "color.surface",

    color: "color.on-surface",
    gap: "spacing.sm",
    typography: "typography.content",
    selection: "color.surface-selected",
    track: "color.surface-recessed",
    radius: "radius.control",
    padding: "spacing.xs",
    target: "size.touch",
    focus: "border.focus",
    disabledOpacity: "opacity.disabled",
    focusOffset: "spacing.xxs",
  }),
});
</script>
<template>
  <div
    ref="rootRef"
    class="segments"
    :class="{
      'is-glass': material === 'glass',
      'is-compact': density === 'compact',
    }"
    role="radiogroup"
    data-pb-role="filter"
    data-no-swipe
    :aria-label="label"
    :aria-disabled="disabled"
    @keydown="key"
  >
    <span v-if="density === 'compact'" class="compact-track" aria-hidden="true"
      ><GlassMaterial v-if="material === 'glass'"
    /></span>
    <GlassMaterial v-else-if="material === 'glass'" />
    <button
      v-for="item in items"
      :key="item.id"
      :data-value="item.id"
      type="button"
      role="radio"
      :aria-checked="modelValue === item.id"
      :disabled="disabled || item.disabled"
      :tabindex="!disabled && focusId === item.id ? 0 : -1"
      :class="{ selected: modelValue === item.id }"
      v-pb="
        part(
          'option',
          'button',
          {
            typography:
              density === 'compact' ? 'typography.body-sm' : 'typography.label',
            color: 'color.on-surface',
          },
          item.id,
        )
      "
      @click="choose(item.id)"
    >
      <span class="option-label">{{ item.label }}</span>
    </button>
  </div>
</template>
<style scoped>
.segments {
  position: relative;
  display: flex;
  gap: var(--pb-layout-zero);
  padding: var(--pb-spacing-xs);
  border-radius: var(--pb-radius-control-compact);
  background: var(--pb-color-surface-recessed);
}
button {
  position: relative;
  flex: var(--pb-layout-flex-fill);
  min-height: var(--pb-size-touch);
  padding: var(--pb-spacing-xs) var(--pb-spacing-sm);
  border: none;
  border-radius: var(--pb-radius-control-compact);
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-label);
  cursor: pointer;
}
.segments.is-glass {
  background: transparent;
}
button.selected {
  background: var(--pb-color-surface);
  color: var(--pb-color-on-surface);
  box-shadow: var(--pb-elevation-surface);
}
button:focus-visible,
input:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
button:disabled,
input:disabled {
  opacity: var(--pb-opacity-disabled);
  cursor: default;
}
</style>

<style scoped>
.segments.is-compact {
  min-block-size: var(--pb-size-touch);
  padding: var(--pb-layout-zero) var(--pb-spacing-xs);
  background: transparent;
}
.compact-track {
  position: absolute;
  inset-inline: var(--pb-layout-zero);
  inset-block: var(--pb-layout-zero);
  margin-block: auto;
  block-size: var(--pb-segmented-control-compact-height);
  border-radius: var(--pb-radius-control-compact);
  background: var(--pb-color-surface-recessed);
}
.is-glass .compact-track {
  background: transparent;
}
.is-compact button {
  padding: var(--pb-layout-zero) var(--pb-spacing-sm);
  background: transparent;
  box-shadow: none;
  font: var(--pb-typography-body-sm);
}
.is-compact button::before {
  content: "";
  position: absolute;
  inset-inline: var(--pb-layout-zero);
  inset-block: var(--pb-layout-zero);
  block-size: var(--pb-segmented-control-compact-selection-height);
  margin-block: auto;
  border-radius: calc(var(--pb-radius-control-compact) - var(--pb-spacing-xxs));
  background: transparent;
  transition:
    background-color var(--pb-motion-duration-short)
      var(--pb-motion-easing-standard),
    box-shadow var(--pb-motion-duration-short) var(--pb-motion-easing-standard);
}
.is-compact button.selected::before {
  background: var(--pb-color-surface);
  box-shadow: var(--pb-elevation-surface);
}
.option-label {
  position: relative;
}
@media (prefers-reduced-motion: reduce) {
  .is-compact button::before {
    transition: none;
  }
}
</style>
