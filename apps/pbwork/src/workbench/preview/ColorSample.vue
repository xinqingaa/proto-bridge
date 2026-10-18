<script setup lang="ts">
import { computed } from "vue";
import type { ResolvedThemeTable } from "@proto-bridge/core/v2";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
defineProps<{ table: ResolvedThemeTable }>();
const colors = computed(() =>
  runtimeThemeSources.keyCatalog.keys.filter(
    (key) => key.valueType === "color",
  ),
);
const pairs = [
  {
    title: "页面与正文",
    background: "color.background",
    foreground: "color.on-background",
  },
  {
    title: "表面与正文",
    background: "color.surface",
    foreground: "color.on-surface",
  },
  {
    title: "主要操作",
    background: "color.action",
    foreground: "color.on-action",
  },
  {
    title: "错误反馈",
    background: "color.error",
    foreground: "color.on-error",
  },
];
</script>
<template>
  <div class="color-sample">
    <h2>色彩</h2>
    <p>同样的内容，观察不同主题的前景与表面。</p>
    <section
      v-for="pair in pairs"
      :key="pair.title"
      class="color-pair"
      :style="{
        background: String(table.values[pair.background]),
        color: String(table.values[pair.foreground]),
      }"
    >
      <strong>{{ pair.title }}</strong
      ><span>今天的安排，清晰可见。</span
      ><small>{{ pair.foreground }} / {{ pair.background }}</small>
    </section>
    <h3>全部色彩 · {{ colors.length }} 项</h3>
    <div
      v-for="key in colors"
      :key="key.id"
      class="color-entry"
      :data-color-key="key.id"
    >
      <i :style="{ background: String(table.values[key.id]) }" />
      <div>
        <strong>{{ key.label ?? key.id }}</strong
        ><code>{{ key.id }}</code
        ><span>{{ table.values[key.id] }}</span>
      </div>
    </div>
    <p v-if="!colors.length">没有匹配的 Token。</p>
  </div>
</template>
<style scoped>
.color-sample {
  padding: var(--pb-spacing-md);
  font: var(--pb-typography-content);
}
h2 {
  font: var(--pb-typography-title);
  margin: 0;
}
h3 {
  font: var(--pb-typography-label);
  margin-block: var(--pb-spacing-lg) var(--pb-spacing-sm);
}
p {
  color: var(--pb-color-on-surface-muted);
}
.color-pair {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
  padding: var(--pb-spacing-md);
  margin-block: var(--pb-spacing-sm);
  border-radius: var(--pb-radius-surface);
  border: var(--pb-border-hairline);
}
.color-pair small {
  font: var(--pb-typography-caption);
  overflow-wrap: anywhere;
}
.color-entry {
  display: flex;
  align-items: center;
  gap: var(--pb-spacing-sm);
  padding-block: var(--pb-spacing-sm);
  border-bottom: var(--pb-border-hairline);
}
.color-entry > i {
  width: var(--pb-size-control);
  height: var(--pb-size-control);
  flex: none;
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-control-compact);
}
.color-entry > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.color-entry code,
.color-entry span {
  font: var(--pb-typography-caption);
  overflow-wrap: anywhere;
}
</style>
