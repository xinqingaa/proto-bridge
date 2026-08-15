<script setup lang="ts">
defineProps<{
  pbId: string;
}>();
</script>

<template>
  <span
    class="hd-logo-mark"
    role="img"
    aria-label="恒动标志"
    :data-pb-id="pbId"
    data-pb-role="image"
    data-pb-token-background="color.action"
    data-pb-token-color="color.on-action"
    data-pb-token-radius="radius.lg"
    data-pb-token-size="sizing.avatar-md"
  >
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M10 8v16" />
      <path d="M22 8v16" />
      <path d="M10 18l12-4" />
    </svg>
  </span>
</template>

<style scoped>
.hd-logo-mark {
  display: inline-flex;
  width: var(--pb-sizing-avatar-md);
  height: var(--pb-sizing-avatar-md);
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: var(--pb-radius-lg);
  background: var(--pb-color-action);
  color: var(--pb-color-on-action);
}

.hd-logo-mark svg {
  width: var(--pb-sizing-icon-lg);
  height: var(--pb-sizing-icon-lg);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: var(--pb-sizing-progress-stroke);
}
</style>
