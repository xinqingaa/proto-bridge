<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  completed: number;
  target: number;
  progress: number;
  inspectId: string;
}>();

const ringStyle = computed(() => ({
  "--hd-goal-progress": `${Math.min(100, Math.max(0, props.progress))}%`,
}));
</script>

<template>
  <figure
    class="hd-goal-ring"
    :style="ringStyle"
    :data-pb-id="inspectId"
    data-pb-role="chart"
    data-pb-token-background="color.primary-soft"
    data-pb-token-color="color.primary"
    data-pb-token-size="layout.chart-min-height"
    data-pb-token-stroke="sizing.progress-track"
    :aria-label="`本周已完成 ${completed} 次，目标 ${target} 次`"
  >
    <figcaption class="hd-goal-ring__content">
      <strong>{{ completed }} / {{ target }}</strong>
      <span>本周训练</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.hd-goal-ring {
  position: relative;
  display: flex;
  width: var(--pb-layout-chart-min-height);
  height: var(--pb-layout-chart-min-height);
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: var(--pb-spacing-none);
  border-radius: var(--pb-radius-full);
  background: conic-gradient(
    var(--pb-color-primary) var(--hd-goal-progress),
    var(--pb-color-primary-soft) var(--hd-goal-progress)
  );
  color: var(--pb-color-on-background);
}

.hd-goal-ring::before {
  position: absolute;
  inset: var(--pb-sizing-progress-track);
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-background);
  content: "";
}

.hd-goal-ring__content {
  position: relative;
  z-index: var(--pb-layer-content);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--pb-spacing-xs);
  text-align: center;
}

.hd-goal-ring__content strong {
  color: var(--pb-color-on-background);
  font: var(--pb-typography-title-lg);
}

.hd-goal-ring__content span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}

</style>
