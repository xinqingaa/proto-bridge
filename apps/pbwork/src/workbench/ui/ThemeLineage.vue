<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, Layers } from "lucide-vue-next";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import { resolvePackTheme } from "@/design-system/theme/presentation";

const props = defineProps<{
  packId: string;
  themeName: string;
  mode: "light" | "dark";
}>();

const manifest = computed(
  () => runtimeThemeSources.packs.get(props.packId)?.manifest,
);

const isFoundation = computed(() => props.packId === "pbwork-base");
const isSample = computed(() => props.packId === "pbwork-sample");

const table = computed(() =>
  resolvePackTheme(props.packId, props.themeName, props.mode),
);

const base = computed(() => resolvePackTheme("pbwork-base", "default", props.mode));

const overrideCount = computed(() => {
  if (isFoundation.value) return 0;
  return Object.keys(table.value.values).filter(
    (key) =>
      JSON.stringify(table.value.values[key]) !==
      JSON.stringify(base.value.values[key]),
  ).length;
});

const label = computed(() => {
  if (!manifest.value) return "";
  return manifest.value.label;
});

const note = computed(() => {
  if (isFoundation.value) return "所有原型可继承的起点";
  if (isSample.value) return `覆盖 ${overrideCount.value} 项解析值 · 仅验证换肤`;
  return overrideCount.value > 0
    ? `覆盖 ${overrideCount.value} 项解析值`
    : "当前直接使用基础包 · 尚无自有主题覆盖";
});
</script>

<template>
  <div class="theme-lineage">
    <Layers :size="14" />
    <template v-if="isFoundation">
      <strong>基础 DS</strong>
      <span>{{ note }}</span>
    </template>
    <template v-else>
      <strong>基础 DS</strong>
      <ArrowRight :size="13" />
      <strong>{{ label }}</strong>
      <span>{{ note }}</span>
    </template>
    <code>{{ packId }} / {{ themeName }}</code>
  </div>
</template>

<style scoped>
.theme-lineage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.8125rem;
}

.theme-lineage strong {
  color: rgba(var(--v-theme-on-surface), 0.92);
  font-weight: 650;
}

.theme-lineage code {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.75rem;
  font-family: ui-monospace, "SF Mono", Monaco, "Cascadia Code", monospace;
}
</style>
