<script setup lang="ts">
import { computed } from "vue";
import { Boxes, CircleDot, Layers3, Palette, Shapes } from "lucide-vue-next";
import { useRoute } from "vue-router";

const route = useRoute();

const title = computed(() => String(route.meta.title ?? "资源"));
const context = computed(() => String(route.meta.context ?? "PBWork"));
const resourceId = computed(() => String(route.meta.resourceId ?? ""));

const summaries = computed(() => {
  if (resourceId.value === "tokens")
    return ["颜色", "字体", "间距", "圆角", "阴影"];
  if (resourceId.value === "themes") return ["浅色主题", "深色主题"];
  if (resourceId.value === "basic-components")
    return ["按钮", "图标按钮", "文本框", "Chip", "Card"];
  if (resourceId.value === "complex-components")
    return ["App Bar", "Tabs", "Data List", "Bottom Sheet"];
  return [title.value];
});

const resourceIcon = computed(() => {
  if (resourceId.value === "tokens" || resourceId.value === "themes")
    return Palette;
  if (resourceId.value.includes("components")) return Shapes;
  if (resourceId.value.includes("prototypes")) return Layers3;
  return Boxes;
});
</script>

<template>
  <section class="resource-view" :data-resource-id="resourceId">
    <header class="resource-header">
      <p>{{ context }}</p>
      <h1>{{ title }}</h1>
    </header>

    <div class="resource-body">
      <div class="resource-symbol" aria-hidden="true">
        <component :is="resourceIcon" :size="22" />
      </div>
      <v-list class="resource-summary" lines="two">
        <v-list-item
          v-for="item in summaries"
          :key="item"
          :title="item"
          subtitle="0 项"
        >
          <template #prepend><CircleDot :size="16" /></template>
        </v-list-item>
      </v-list>
    </div>
  </section>
</template>

<style scoped>
.resource-view {
  width: min(760px, 100%);
}
.resource-header {
  margin-bottom: 28px;
}
.resource-header p {
  margin: 0 0 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
.resource-header h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 650;
}
.resource-body {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.resource-symbol {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: rgb(var(--v-theme-primary));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.resource-summary {
  padding: 0;
  background: transparent;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.resource-summary :deep(.v-list-item) {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
