<script setup lang="ts">
import { computed } from "vue";
import type { ElementBox } from "@/runtime/bridge";

const props = defineProps<{
  hoverBox: ElementBox | null;
  selectBox: ElementBox | null;
}>();

const hoverStyle = computed(() => boxStyle(props.hoverBox));
const selectStyle = computed(() => boxStyle(props.selectBox));
const label = computed(() => {
  const box = props.selectBox ?? props.hoverBox;
  if (!box) return "";
  return `${Math.round(box.width)} × ${Math.round(box.height)}`;
});
const labelStyle = computed(() => {
  const box = props.selectBox ?? props.hoverBox;
  if (!box) return {};
  return {
    left: `${box.x}px`,
    top: `${Math.max(0, box.y - 22)}px`,
  };
});

function boxStyle(box: ElementBox | null) {
  if (!box) return { display: "none" };
  return {
    display: "block",
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  };
}
</script>

<template>
  <div class="pb-inspect-overlay" data-pb-inspect-chrome aria-hidden="true">
    <div
      v-if="hoverBox"
      class="inspect-box is-hover"
      :style="hoverStyle"
    />
    <div
      v-if="selectBox"
      class="inspect-box is-select"
      :style="selectStyle"
    />
    <div v-if="label" class="inspect-label" :style="labelStyle">
      {{ label }}
    </div>
  </div>
</template>

<style scoped>
.pb-inspect-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
}

.inspect-box {
  position: absolute;
  box-sizing: border-box;
  border-radius: 2px;
}

.inspect-box.is-hover {
  border: 1px solid color-mix(in srgb, var(--pb-color-primary, #2f73d2) 55%, transparent);
  background: color-mix(in srgb, var(--pb-color-primary, #2f73d2) 6%, transparent);
}

.inspect-box.is-select {
  border: 1.5px solid var(--pb-color-primary, #2f73d2);
  background: color-mix(in srgb, var(--pb-color-primary, #2f73d2) 8%, transparent);
}

.inspect-label {
  position: absolute;
  z-index: 1;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--pb-color-on-surface, #1f2937);
  color: var(--pb-color-surface, #fff);
  font: 500 10px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0.88;
}
</style>
