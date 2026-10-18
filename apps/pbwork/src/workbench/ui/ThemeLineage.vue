<script setup lang="ts">
import { computed } from "vue";
import { ArrowRight, Layers } from "lucide-vue-next";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import { resolveRuntimeTheme } from "@/design-system/theme/runtime-theme";
import { comparePreviewTables } from "@/workbench/preview/model";

const props = defineProps<{
  packId: string;
  themeName: string;
  mode: string;
}>();

const manifest = computed(
  () => runtimeThemeSources.packs.get(props.packId)?.manifest,
);

const facts = computed(() => {
  const currentManifest = manifest.value;
  if (!currentManifest) return { note: `主题包不存在：${props.packId}` };
  try {
    const table = resolveRuntimeTheme(
      props.packId,
      props.themeName,
      props.mode,
    );
    if (!currentManifest.extends) return { note: "共享基础包" };
    const referenceManifest = runtimeThemeSources.packs.get(
      currentManifest.extends,
    )?.manifest;
    if (!referenceManifest || !referenceManifest.modes.includes(props.mode))
      return { note: "基础对照未知", baseLabel: currentManifest.extends };
    // Explicitly compare the parent's declared default, not an inferred theme mapping.
    const reference = resolveRuntimeTheme(
      referenceManifest.id,
      referenceManifest.defaultTheme,
      props.mode,
    );
    const differences = comparePreviewTables(table, reference).filter(
      (row) => row.changed,
    ).length;
    const authored = Object.values(table.provenance).filter(
      (source) => !source.inherited,
    ).length;
    return {
      baseLabel: referenceManifest.label,
      note: `当前包定义 ${authored} 项；相对 ${referenceManifest.id}/${referenceManifest.defaultTheme}/${props.mode} 最终值差异 ${differences} 项${currentManifest.scope === "playground" ? " · 仅演示" : ""}`,
    };
  } catch (error) {
    return { note: error instanceof Error ? error.message : String(error) };
  }
});
</script>

<template>
  <div class="theme-lineage">
    <Layers :size="14" />
    <template v-if="facts.baseLabel"
      ><strong>{{ facts.baseLabel }}</strong
      ><ArrowRight :size="13"
    /></template>
    <strong>{{ manifest?.label ?? packId }}</strong>
    <span>{{ facts.note }}</span>
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
