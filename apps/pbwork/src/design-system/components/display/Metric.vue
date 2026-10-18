<script setup lang="ts">
import { computed, ref } from "vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";
import { vPb, pbStyle } from "@/authoring/pb-style";
import { useComponentParts } from "../_shared/componentParts";

const props = withDefaults(
  defineProps<{
    label?: string;
    value?: string | number;
    unit?: string;
    change?: number;
    inspectId?: string;
    pbKey?: string;
  }>(),
  { label: "本周完成", value: 24, unit: "次" },
);

const rootRef = ref<HTMLElement | null>(null);
const part = useComponentParts(
  () => props.inspectId ?? "ds.metric",
  () => props.pbKey,
);

const changeColor = computed(() =>
  props.change === undefined || props.change === 0
    ? "color.on-surface-muted"
    : props.change > 0
      ? "color.success"
      : "color.error",
);

usePbInspect({
  element: rootRef,
  pbId: "ds.metric",
  componentId: "metric",
  instanceId: () => props.inspectId,
  pbKey: () => props.pbKey,
  getProps: () => ({ ...props }),
  getTokenBindings: () => ({
    color: "color.on-surface",
    muted: "color.on-surface-muted",
    gap: "spacing.sm",
    value: "typography.numeric-display",
    caption: "typography.caption",
    positive: "color.success",
    negative: "color.error",
  }),
});
</script>
<template>
  <div
    ref="rootRef"
    class="metric"
    data-pb-role="summary"
    :style="pbStyle({ color: 'color.on-surface', gap: 'spacing.sm' })"
  >
    <span
      v-pb="
        part('label', 'text', {
          typography: 'typography.caption',
          color: 'color.on-surface-muted',
        })
      "
      >{{ label }}</span
    >
    <div class="number">
      <strong
        v-pb="
          part('value', 'text', {
            typography: 'typography.numeric-display',
            color: 'color.on-surface',
          })
        "
        >{{ value }}</strong
      ><span
        v-if="unit"
        v-pb="
          part('unit', 'text', {
            typography: 'typography.caption',
            color: 'color.on-surface-muted',
          })
        "
        >{{ unit }}</span
      >
    </div>
    <span
      v-if="change !== undefined"
      v-pb="
        part('change', 'status', {
          typography: 'typography.caption',
          color: changeColor,
        })
      "
      >{{ change === 0 ? "持平" : `${change > 0 ? "+" : ""}${change}%` }}</span
    >
  </div>
</template>
<style scoped>
.metric {
  display: flex;
  flex-direction: column;
}
.number {
  display: flex;
  align-items: baseline;
  gap: var(--pb-spacing-sm);
}
</style>
