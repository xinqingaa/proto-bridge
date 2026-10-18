<script setup lang="ts">
import { computed, ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { themeConstantNumber } from "@/design-system/theme/constants";
import { useTokenNumber } from "@/design-system/theme/runtime-theme";
const props = withDefaults(
  defineProps<{
    label?: string;
    value?: number;
    max?: number;
    inspectId?: string;
    pbKey?: string;
  }>(),
  { label: "今日目标", value: 68, max: 100 },
);

const rootRef = ref<HTMLElement | null>(null);

const zero = themeConstantNumber("layout.zero");
const coordinate = themeConstantNumber("layout.ring-coordinate-size");
const center = themeConstantNumber("layout.ring-center");
const radius = themeConstantNumber("layout.ring-radius");
const angle = themeConstantNumber("motion.ring-start-angle");
const stroke = useTokenNumber("size.stroke");
const normalized = computed(() =>
  Number.isFinite(props.max) && props.max > 0
    ? Math.max(
        0,
        Math.min(props.max, Number.isFinite(props.value) ? props.value : 0),
      )
    : 0,
);
const ratio = computed(() =>
  props.max > 0 ? normalized.value / props.max : 0,
);
const circumference = 2 * Math.PI * radius;
const dash = computed(() => ({
  strokeDasharray: String(circumference),
  strokeDashoffset: String(circumference * (1 - ratio.value)),
}));

usePbInspect({
  element: rootRef,
  pbId: "ds.ring-progress",
  componentId: "ring-progress",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    fill: "color.primary",
    track: "color.primary-soft",
    color: "color.on-surface",
    typography: "typography.numeric-title",
    diameter: "size.ring",
    stroke: "size.stroke",
  }),
});
</script>
<template>
  <div
    ref="rootRef"
    class="ring"
    data-pb-role="status"
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="normalized"
    :aria-valuemin="0"
    :aria-valuemax="props.max > 0 ? props.max : 1"
  >
    <svg
      aria-hidden="true"
      :viewBox="`${zero} ${zero} ${coordinate} ${coordinate}`"
    >
      <circle
        class="track"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="stroke"
      />
      <circle
        class="fill"
        :cx="center"
        :cy="center"
        :r="radius"
        :stroke-width="stroke"
        :transform="`rotate(${angle} ${center} ${center})`"
        :style="dash"
      /></svg
    ><span>{{ Math.round(ratio * 100) }}%</span>
  </div>
</template>
<style scoped>
.ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--pb-size-avatar-large);
  height: var(--pb-size-avatar-large);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-numeric-content);
}
svg {
  position: absolute;
  inset: var(--pb-layout-zero);
  width: var(--pb-layout-fill);
  height: var(--pb-layout-fill);
  fill: none;
}
.track {
  stroke: var(--pb-color-primary-soft);
}
.fill {
  stroke: var(--pb-color-primary);
  stroke-linecap: round;
}
</style>
