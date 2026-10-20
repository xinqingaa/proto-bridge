<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from "vue";
import { useToken } from "@/design-system/theme/runtime-theme";
import { useReducedMotion } from "@/runtime/useReducedMotion";
import artwork from "./dial-artwork.json";

const props = defineProps<{
  value: string;
  x: number;
  y: number;
  slots: number;
  direction: "up" | "down" | "crossfade";
}>();
const root = ref<SVGGElement | null>(null);
const type = useToken("typography.numeric-display");
const reduced = useReducedMotion();
const clipId = `digits-${useId().replace(/[^a-zA-Z0-9_-]/g, "-")}`;
const layout = ref<{
  starts: number[];
  widths: number[];
  top: number;
  height: number;
}>();
const scale = computed(() =>
  props.slots > artwork.readout.hourSlots
    ? artwork.readout.longScale
    : props.slots > artwork.readout.shortSlots
      ? artwork.readout.hourScale
      : artwork.full,
);
const transform = computed(
  () => `translate(${props.x} ${props.y}) scale(${scale.value})`,
);

// Measure the actual system font, including its colon and tabular digit advance.
// The temporary probe is removed synchronously and never becomes an Evidence node.
async function measure() {
  await nextTick();
  if (!root.value || !props.value || typeof SVGElement === "undefined") return;
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  if (typeof text.getComputedTextLength !== "function") return;
  text.textContent = props.value;
  text.style.visibility = "hidden";
  root.value.append(text);
  const bounds = text.getBBox();
  const width = text.getComputedTextLength();
  // A hidden/transitioning SVG can report no addressable characters even with
  // textContent. Wait for visibility before asking for substring geometry.
  if (
    bounds.height <= 0 ||
    width <= 0 ||
    text.getNumberOfChars() < props.value.length
  ) {
    text.remove();
    return;
  }
  const starts = Array.from(
    props.value,
    (_, index) => -width / 2 + (index ? text.getSubStringLength(0, index) : 0),
  );
  const widths = Array.from(props.value, (_, index) =>
    text.getSubStringLength(index, 1),
  );
  text.remove();
  layout.value = { starts, widths, top: bounds.y, height: bounds.height };
}
let observer: ResizeObserver | undefined;
onMounted(() => {
  void measure();
  void document.fonts?.ready.then(measure);
  // Kept-mounted mode panels have no measurable font box while display:none.
  // Re-measure when the owning SVG becomes visible, without changing navigation.
  if (typeof ResizeObserver !== "undefined" && root.value?.ownerSVGElement) {
    observer = new ResizeObserver(() => {
      void measure();
    });
    observer.observe(root.value.ownerSVGElement);
  }
});
onBeforeUnmount(() => observer?.disconnect());
watch([() => props.value, type], measure, { flush: "post" });
</script>

<template>
  <g ref="root" class="readout" :transform="transform" :aria-label="value">
    <text v-if="!layout" text-anchor="middle">{{ value }}</text>
    <template v-else>
      <defs>
        <clipPath
          v-for="(character, index) in value"
          :id="`${clipId}-${index}`"
          :key="index"
        >
          <rect
            :x="layout.starts[index]"
            :y="layout.top"
            :width="layout.widths[index]"
            :height="layout.height"
          />
        </clipPath>
      </defs>
      <g
        v-for="(character, index) in value"
        :key="index"
        :clip-path="`url(#${clipId}-${index})`"
        :style="{ '--yike-digit-travel': `${layout.height}px` }"
      >
        <Transition :name="`digit-${direction}`" :css="!reduced">
          <text :key="character" :x="layout.starts[index]">{{
            character
          }}</text>
        </Transition>
      </g>
    </template>
  </g>
</template>

<style scoped>
.readout {
  fill: currentColor;
  font: var(--pb-typography-numeric-display);
  font-variant-numeric: tabular-nums;
  letter-spacing: var(--pb-tracking-display);
}
.digit-up-enter-active,
.digit-up-leave-active,
.digit-down-enter-active,
.digit-down-leave-active,
.digit-crossfade-enter-active,
.digit-crossfade-leave-active {
  transition:
    transform var(--pb-motion-duration-short) var(--pb-motion-easing-standard),
    opacity var(--pb-motion-duration-short) var(--pb-motion-easing-standard);
}
.digit-up-enter-from,
.digit-down-leave-to {
  transform: translateY(var(--yike-digit-travel));
}
.digit-up-leave-to,
.digit-down-enter-from {
  transform: translateY(calc(var(--pb-layout-zero) - var(--yike-digit-travel)));
}
.digit-crossfade-enter-from,
.digit-crossfade-leave-to {
  opacity: var(--pb-opacity-hidden);
}
@media (prefers-reduced-motion: reduce) {
  text {
    transition: none;
  }
}
</style>
