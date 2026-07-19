<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import { LIFECYCLE_LABELS } from "@/design-system/types";

const props = defineProps<{
  prototypeId: string;
}>();

const prototype = computed(() =>
  loadPrototypes().find((item) => item.id === props.prototypeId),
);
const screens = computed(() =>
  loadPrototypeScreens().filter(
    (item) => item.prototypeId === props.prototypeId,
  ),
);
const variantTotal = computed(() =>
  screens.value.reduce((sum, screen) => sum + screen.variants.length, 0),
);

const flowEdges = computed(() => {
  if (screens.value.length < 2) return [] as Array<{ from: string; to: string }>;
  const edges: Array<{ from: string; to: string }> = [];
  for (let i = 0; i < screens.value.length - 1; i += 1) {
    edges.push({
      from: screens.value[i]!.label,
      to: screens.value[i + 1]!.label,
    });
  }
  return edges;
});
</script>

<template>
  <ResourcePageShell
    v-if="prototype"
    eyebrow="原型"
    :title="prototype.label"
    description="页面卡片网格展示 Variant 数量、默认态与路径；流程关系与生命周期信息集中在摘要区。"
  >
    <template #stats>
      <v-chip size="small" color="primary" variant="tonal">
        {{ LIFECYCLE_LABELS[prototype.lifecycle] }}
      </v-chip>
      <v-chip size="small" variant="tonal">{{ screens.length }} 页面</v-chip>
      <v-chip size="small" variant="tonal">{{ variantTotal }} Variant</v-chip>
      <v-chip
        v-for="owner in prototype.owners ?? []"
        :key="`owner-${owner}`"
        size="small"
        variant="flat"
      >
        {{ owner }}
      </v-chip>
      <v-chip
        v-for="role in prototype.roles ?? []"
        :key="`role-${role}`"
        size="small"
        variant="outlined"
      >
        {{ role }}
      </v-chip>
    </template>

    <section v-if="flowEdges.length" class="flow-panel">
      <h2>流程关系</h2>
      <ol class="flow-list">
        <li v-for="(edge, index) in flowEdges" :key="`${edge.from}-${edge.to}`">
          <span>{{ edge.from }}</span>
          <span class="arrow" aria-hidden="true">→</span>
          <span>{{ edge.to }}</span>
          <span v-if="index === flowEdges.length - 1" class="flow-note"
            >按注册顺序串联，后续可替换为显式流转图</span
          >
        </li>
      </ol>
    </section>

    <div class="screen-grid">
      <RouterLink
        v-for="screen in screens"
        :key="screen.screenId"
        class="screen-card"
        :to="`/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}`"
      >
        <div class="screen-card-top">
          <h2>{{ screen.label }}</h2>
          <span class="variant-count">{{ screen.variants.length }} Variant</span>
        </div>
        <p class="screen-path">{{ screen.path }}</p>
        <p class="screen-default">
          默认：{{
            screen.variants.find((item) => item.id === screen.defaultVariantId)
              ?.label ?? screen.defaultVariantId
          }}
        </p>
        <ul class="variant-chips">
          <li v-for="variant in screen.variants" :key="variant.id">
            {{ variant.label }}
          </li>
        </ul>
      </RouterLink>
    </div>
  </ResourcePageShell>
  <v-alert v-else type="error" variant="tonal"
    >未知原型：{{ prototypeId }}</v-alert
  >
</template>

<style scoped>
.flow-panel {
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}
.flow-panel h2 {
  margin: 0 0 10px;
  font-size: 0.875rem;
}
.flow-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.flow-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
}
.arrow {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}
.flow-note {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.75rem;
}
.screen-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px;
}
.screen-card {
  grid-column: span 4;
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.screen-card:hover {
  border-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 45%, transparent);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
}
.screen-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.screen-card h2 {
  margin: 0;
  font-size: 1.0625rem;
}
.variant-count {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
  color: rgb(var(--v-theme-primary));
  font-size: 0.6875rem;
  font-weight: 700;
}
.screen-path,
.screen-default {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.75rem;
}
.screen-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.variant-chips {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.variant-chips li {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.6875rem;
}
@media (max-width: 1279px) {
  .screen-card {
    grid-column: span 6;
  }
}
@media (max-width: 720px) {
  .screen-card {
    grid-column: span 12;
  }
}
</style>
