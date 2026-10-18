<script setup lang="ts">
import { computed } from "vue";
import PreviewComparison from "@/workbench/preview/PreviewComparison.vue";
import TypographySample from "@/workbench/preview/TypographySample.vue";
import ColorSample from "@/workbench/preview/ColorSample.vue";
import FoundationSample from "@/workbench/preview/FoundationSample.vue";
import ResourcePageShell from "./ResourcePageShell.vue";
import WorkbenchStatChip from "@/workbench/ui/WorkbenchStatChip.vue";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import { themeKeyCategory } from "@/design-system/theme/presentation";
import { isBindTokenId } from "@/design-system/theme/bindings";
import { TOKEN_CATEGORY_META } from "@/design-system/tokenCategories";
import type { TokenCategory } from "@/design-system/types";
const props = defineProps<{ category: TokenCategory }>();
const tokenIds = computed(() => [
  ...runtimeThemeSources.keyCatalog.keys
    .filter((key) => themeKeyCategory(key) === props.category)
    .map((key) => key.id),
  ...runtimeThemeSources.constants.constants
    .filter((key) => key.id.startsWith(`${props.category}.`))
    .map((key) => key.id),
]);
const bindCount = computed(() => tokenIds.value.filter(isBindTokenId).length);
</script>
<template>
  <ResourcePageShell
    eyebrow="设计令牌"
    :title="TOKEN_CATEGORY_META[category].label"
    :description="TOKEN_CATEGORY_META[category].description"
  >
    <template #stats
      ><WorkbenchStatChip
        :value="tokenIds.length"
        label="项" /><WorkbenchStatChip
        :value="bindCount"
        label="项已绑定到组件"
    /></template>
    <PreviewComparison
      :key="category"
      :resource-id="category"
      :token-ids="tokenIds"
    >
      <template #default="sample"
        ><ColorSample
          v-if="category === 'color'"
          :table="sample.table" /><TypographySample
          v-else-if="category === 'typography'" /><FoundationSample
          v-else
          :category="category"
          :table="sample.table"
      /></template>
    </PreviewComparison>
  </ResourcePageShell>
</template>
