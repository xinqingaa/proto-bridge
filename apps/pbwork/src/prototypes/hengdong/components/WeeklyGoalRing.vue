<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    completed: number;
    target: number;
    progress: number;
    inspectId: string;
    actionLabel: string;
    actionId: string;
    state?: "active" | "complete" | "select-plan";
  }>(),
  { state: "active" },
);

defineEmits<{ activate: [] }>();

const ringStyle = computed(() => ({
  "--hd-goal-progress": `${Math.min(100, Math.max(0, props.progress))}%`,
}));
</script>

<template>
  <button
    type="button"
    class="hd-goal-ring"
    :class="`is-${state}`"
    :style="ringStyle"
    :data-pb-id="inspectId"
    data-pb-role="button"
    data-pb-token-background="color.primary-soft"
    data-pb-token-color="color.primary"
    data-pb-token-size="layout.chart-min-height"
    data-pb-token-stroke="sizing.progress-track"
    data-pb-token-motion="motion.duration-fast"
    :data-pb-action="actionId"
    :aria-label="`${actionLabel}。本周已完成 ${completed} 次，目标 ${target} 次`"
    @click="$emit('activate')"
  >
    <span class="hd-goal-ring__content">
      <strong>{{ completed }} / {{ target }}</strong>
      <span>本周活动</span>
      <small>{{ actionLabel }}</small>
    </span>
  </button>
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
  padding: var(--pb-spacing-none);
  border: none;
  border-radius: var(--pb-radius-full);
  background: conic-gradient(
    var(--pb-color-primary) var(--hd-goal-progress),
    var(--pb-color-primary-soft) var(--hd-goal-progress)
  );
  color: var(--pb-color-on-background);
  cursor: pointer;
  transition:
    transform var(--pb-motion-duration-fast) var(--pb-motion-easing-standard),
    opacity var(--pb-motion-duration-fast) var(--pb-motion-easing-standard);
}

.hd-goal-ring.is-complete {
  background: conic-gradient(
    var(--pb-color-success) var(--hd-goal-progress),
    var(--pb-color-success-soft) var(--hd-goal-progress)
  );
}

.hd-goal-ring::before {
  position: absolute;
  inset: var(--pb-sizing-progress-track);
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-background);
  content: "";
}

.hd-goal-ring:hover {
  opacity: var(--pb-opacity-hover);
}

.hd-goal-ring:active {
  transform: scale(var(--pb-motion-scale-pressed));
}

.hd-goal-ring:focus-visible {
  outline: var(--pb-border-focus);
  outline-offset: var(--pb-layout-focus-inset);
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

.hd-goal-ring__content small {
  color: var(--pb-color-primary);
  font: var(--pb-typography-micro);
}

.hd-goal-ring.is-complete .hd-goal-ring__content small {
  color: var(--pb-color-success);
}

@media (prefers-reduced-motion: reduce) {
  .hd-goal-ring {
    transition: none;
  }
}
</style>
