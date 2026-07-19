<script setup lang="ts">
import { computed } from "vue";
import Button from "@/design-system/components/basic/Button.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import TextField from "@/design-system/components/basic/TextField.vue";
import Card from "@/design-system/components/basic/Card.vue";
import { loadThemes } from "@/design-system/loaders";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";

const props = defineProps<{ themeId: string }>();

const theme = computed(() => loadThemes().find((item) => item.id === props.themeId));
const cssVars = computed(() => {
  if (!theme.value) return {};
  return tokensToCssVars(resolveThemeTokens(theme.value.id));
});
</script>

<template>
  <section v-if="theme" class="theme-preview" :style="cssVars">
    <header>
      <p>主题</p>
      <h1>{{ theme.label }}</h1>
    </header>

    <div class="matrix" :data-theme="theme.id">
      <Card title="代表性组件" subtitle="使用当前主题 Token">
        <div class="matrix-row">
          <Button label="主按钮" />
          <Chip label="状态" />
        </div>
        <TextField class="mt-4" label="输入框" model-value="示例文案" />
      </Card>
    </div>
  </section>
  <v-alert v-else type="error" variant="tonal">未知主题：{{ themeId }}</v-alert>
</template>

<style scoped>
.theme-preview {
  width: min(760px, 100%);
}
header p {
  margin: 0 0 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
header h1 {
  margin: 0 0 24px;
  font-size: 1.75rem;
}
.matrix {
  padding: 4px;
}
.matrix-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
</style>
