<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
export type WheelOption = { value: string | number; label: string };
const props = defineProps<{
  modelValue: string | number;
  options: WheelOption[];
  label: string;
  id: string;
  unit?: string;
  numeric?: boolean;
  disabled?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string | number] }>();
const viewport = ref<HTMLElement | null>(null);
const settleDelay = useTokenNumber("motion.duration-short");
const rowSize = useTokenNumber("size.control");
let timer: ReturnType<typeof setTimeout> | undefined;
const selected = computed(() =>
  Math.max(
    0,
    props.options.findIndex((option) => option.value === props.modelValue),
  ),
);
function sync() {
  const el = viewport.value;
  const item = el?.children[selected.value] as HTMLElement | undefined;
  if (el && item)
    el.scrollTop = item.offsetTop - (el.clientHeight - item.clientHeight) / 2;
}
function choose(index: number) {
  if (props.disabled || !props.options[index]) return;
  emit("update:modelValue", props.options[index]!.value);
  void nextTick(sync);
}
function scroll() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const el = viewport.value;
    if (!el || props.disabled) return sync();
    const center = el.scrollTop + el.clientHeight / 2;
    let closest = selected.value,
      distance = Infinity;
    Array.from(el.children).forEach((item, index) => {
      const node = item as HTMLElement;
      const delta = Math.abs(node.offsetTop + node.clientHeight / 2 - center);
      if (delta < distance) {
        closest = index;
        distance = delta;
      }
    });
    if (closest !== selected.value) choose(closest);
  }, settleDelay.value);
}
function key(event: KeyboardEvent) {
  if (
    props.disabled ||
    !["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)
  )
    return;
  event.preventDefault();
  choose(
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? props.options.length - 1
        : Math.max(
            0,
            Math.min(
              props.options.length - 1,
              selected.value + (event.key === "ArrowDown" ? 1 : -1),
            ),
          ),
  );
}
watch(
  () => [props.modelValue, props.options, rowSize.value],
  () => void nextTick(sync),
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(timer));
</script>
<template>
  <div class="picker-column" :class="{ 'is-numeric': numeric }" data-no-swipe>
    <div class="picker-band" aria-hidden="true" />
    <div
      ref="viewport"
      class="picker-wheel"
      role="listbox"
      :aria-label="label"
      :aria-disabled="Boolean(disabled)"
      :aria-activedescendant="`${id}-${selected}`"
      :tabindex="disabled ? -1 : 0"
      @scroll="scroll"
      @keydown="key"
    >
      <button
        v-for="(option, index) in options"
        :id="`${id}-${index}`"
        :key="option.value"
        type="button"
        role="option"
        tabindex="-1"
        :aria-selected="index === selected"
        :disabled="disabled"
        :class="{ selected: index === selected }"
        @click="choose(index)"
      >
        {{ option.label }}
      </button>
    </div>
    <span v-if="unit" class="picker-unit">{{ unit }}</span>
  </div>
</template>
<style scoped>
.picker-column {
  position: relative;
  flex: var(--pb-layout-flex-fill);
  min-inline-size: var(--pb-layout-zero);
}
.picker-wheel {
  position: relative;
  block-size: calc(
    var(--pb-size-control) * var(--pb-layout-wheel-visible-rows)
  );
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  padding-block: var(--pb-size-control);
  scrollbar-width: none;
  mask-image: var(--pb-layout-wheel-mask);
}
.picker-wheel::-webkit-scrollbar {
  display: none;
}
.picker-band {
  position: absolute;
  inset-inline: var(--pb-layout-zero);
  inset-block-start: var(--pb-layout-half);
  transform: translateY(var(--pb-layout-half-negative));
  block-size: var(--pb-size-control);
  border-radius: var(--pb-radius-control-compact);
  background: var(--pb-color-surface);
}
button {
  display: block;
  inline-size: var(--pb-layout-fill);
  block-size: var(--pb-size-control);
  padding: var(--pb-spacing-xs) var(--pb-spacing-md);
  border: none;
  border-radius: var(--pb-radius-control);
  scroll-snap-align: center;
  background: transparent;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-content);
  text-align: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
button.selected {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-subtitle);
}
.is-numeric button {
  font: var(--pb-typography-numeric-content);
}
.is-numeric button.selected {
  font: var(--pb-typography-numeric-title);
}
button:disabled {
  opacity: var(--pb-opacity-disabled);
  cursor: default;
}
.picker-wheel:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-spacing-xxs);
}
.picker-unit {
  position: absolute;
  inset-block-start: var(--pb-layout-half);
  inset-inline-end: var(--pb-spacing-sm);
  transform: translateY(var(--pb-layout-half-negative));
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  pointer-events: none;
}
</style>
