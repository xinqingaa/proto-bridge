<script setup lang="ts">
import { computed } from "vue";
import { loadModePresentations } from "@/design-system/loaders";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import PreviewComparison from "@/workbench/preview/PreviewComparison.vue";
import ThemeSample from "@/workbench/preview/ThemeSample.vue";
import ResourcePageShell from "./ResourcePageShell.vue";
const props = defineProps<{ themeId: string }>();
const mode = computed(() =>
  loadModePresentations().find((item) => item.id === props.themeId),
);
const ids = runtimeThemeSources.keyCatalog.keys.map((key) => key.id);
</script>
<template>
  <ResourcePageShell
    v-if="mode"
    eyebrow="主题"
    :title="mode.label"
    description="在同一手机样板中观察主题性格、前景对比度与完整取值；可选择真实原型主题或开启双机比较。"
  >
    <PreviewComparison
      :key="themeId"
      :resource-id="`theme-${themeId}`"
      :token-ids="ids"
      :initial-mode="themeId"
      ><template #default="sample"
        ><ThemeSample :table="sample.table" /></template
    ></PreviewComparison>
  </ResourcePageShell>
  <v-alert v-else type="error">未知主题：{{ themeId }}</v-alert>
</template>
