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
  border: 1.5px dashed rgba(37, 99, 235, 0.85);
  background: rgba(37, 99, 235, 0.08);
}

.inspect-box.is-select {
  border: 2px solid #2563eb;
  background: rgba(37, 99, 235, 0.12);
}

.inspect-label {
  position: absolute;
  z-index: 1;
  padding: 2px 6px;
  border-radius: 4px;
  background: #1d4ed8;
  color: #fff;
  font: 600 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: nowrap;
  pointer-events: none;
}
</style>
