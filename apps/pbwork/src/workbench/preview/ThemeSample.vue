<script setup lang="ts">
import type { ResolvedThemeTable } from "@proto-bridge/core/v2";
import ColorSample from "./ColorSample.vue";
const props = defineProps<{ table: ResolvedThemeTable }>();
const pairs = [
  ["color.on-background", "color.background", "页面正文"],
  ["color.on-surface", "color.surface", "表面正文"],
  ["color.on-action", "color.action", "主要操作"],
  ["color.on-primary", "color.primary", "强调色"],
  ["color.on-error", "color.error", "错误反馈"],
];
const personality = [
  "density",
  "surface.treatment",
  "radius.control",
  "radius.surface",
  "motion.personality",
];
function luminance(id: string) {
  const match = String(props.table.values[id]).match(
    /^#([a-f\d]{6})(?:[a-f\d]{2})?$/i,
  );
  if (!match) return null;
  const rgb = [0, 2, 4]
    .map((index) => parseInt(match[1]!.slice(index, index + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return x === null || y === null
    ? "未知"
    : `${((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2)}:1`;
}
</script>
<template>
  <div class="theme-sample">
    <h2>主题性格</h2>
    <dl>
      <div v-for="key in personality" :key="key">
        <dt>{{ key }}</dt>
        <dd>{{ table.values[key] }}</dd>
      </div>
    </dl>
    <h2>关键前景对比度</h2>
    <dl>
      <div v-for="pair in pairs" :key="pair[0]" data-theme-contrast>
        <dt>{{ pair[2] }}</dt>
        <dd>{{ contrast(pair[0]!, pair[1]!) }}</dd>
      </div>
    </dl>
  </div>
  <ColorSample :table="table" />
</template>
<style scoped>
.theme-sample {
  padding: var(--pb-spacing-md);
  font: var(--pb-typography-content);
  color: var(--pb-color-on-background);
}
h2 {
  font: var(--pb-typography-title);
}
dl > div {
  display: flex;
  justify-content: space-between;
  gap: var(--pb-spacing-sm);
  padding-block: var(--pb-spacing-sm);
  border-bottom: var(--pb-border-hairline);
}
dt {
  overflow-wrap: anywhere;
}
dd {
  margin: 0;
}
</style>
