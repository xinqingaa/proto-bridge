<script setup lang="ts">
import { computed } from "vue";
import Button from "@/design-system/components/basic/Button.vue";
import Chip from "@/design-system/components/basic/Chip.vue";
import TextField from "@/design-system/components/basic/TextField.vue";
import Card from "@/design-system/components/basic/Card.vue";
import { loadThemes, loadTokens } from "@/design-system/loaders";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";

const props = defineProps<{ themeId: string }>();

const theme = computed(() => loadThemes().find((item) => item.id === props.themeId));
const themes = computed(() => loadThemes());
const colorTokens = computed(() =>
  loadTokens().filter((token) => token.category === "color"),
);
const resolvedByTheme = computed(() => {
  const map: Record<string, Record<string, string | number>> = {};
  for (const item of themes.value) {
    map[item.id] = resolveThemeTokens(item.id);
  }
  return map;
});
const cssVars = computed(() => {
  if (!theme.value) return {};
  return tokensToCssVars(resolveThemeTokens(theme.value.id));
});
</script>

<template>
  <section v-if="theme" class="theme-preview">
    <header>
      <p>主题</p>
      <h1>{{ theme.label }}</h1>
      <p class="lede">
        与「颜色」共用同一套 Token key；下表对照 light / dark 的不同 value。
      </p>
    </header>

    <div class="matrix" :style="cssVars">
      <Card title="当前主题组件预览" subtitle="基础组件由上方 Token 组成" elevated>
        <div class="matrix-row">
          <Button label="主按钮" />
          <Chip label="状态" tone="success" />
        </div>
        <TextField class="mt-4" label="输入框" model-value="示例文案" />
      </Card>
    </div>

    <div class="compare">
      <div class="compare-head">
        <span>Token</span>
        <span v-for="item in themes" :key="item.id">{{ item.label }}</span>
      </div>
      <div
        v-for="token in colorTokens"
        :key="token.id"
        class="compare-row"
      >
        <div class="token-meta">
          <strong>{{ token.label }}</strong>
          <code>{{ token.id }}</code>
        </div>
        <div v-for="item in themes" :key="`${token.id}-${item.id}`" class="value">
          <span
            class="swatch"
            :style="{ background: String(resolvedByTheme[item.id]?.[token.id]) }"
          />
          <code>{{ resolvedByTheme[item.id]?.[token.id] }}</code>
        </div>
      </div>
    </div>

  
  </section>
  <v-alert v-else type="error" variant="tonal">未知主题：{{ themeId }}</v-alert>
</template>

<style scoped>
.theme-preview {
  width: min(920px, 100%);
}
header p {
  margin: 0 0 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
header h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
}
.lede {
  margin: 0 0 20px !important;
  color: rgba(var(--v-theme-on-surface), 0.62) !important;
  font-size: 0.8125rem !important;
  font-weight: 400 !important;
}
.compare {
  margin-bottom: 24px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}
.compare-head,
.compare-row {
  display: grid;
  grid-template-columns: minmax(140px, 1.2fr) 1fr 1fr;
  gap: 12px;
  padding: 12px 14px;
}
.compare-head {
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.75rem;
  font-weight: 700;
}
.compare-row {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  align-items: center;
}
.token-meta strong {
  display: block;
}
.token-meta code,
.value code {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
}
.value {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.swatch {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.matrix {
  padding: 4px;
  margin-bottom: 24px;
}
.matrix-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
</style>
