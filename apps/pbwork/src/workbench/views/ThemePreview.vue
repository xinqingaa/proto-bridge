<script setup lang="ts">
import { computed } from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
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

const theme = computed(() =>
  loadThemes().find((item) => item.id === props.themeId),
);
const themes = computed(() => loadThemes());
const tokens = computed(() => loadTokens());
const colorTokens = computed(() =>
  tokens.value.filter((token) => token.category === "color"),
);
const typographyTokens = computed(() =>
  tokens.value.filter((token) => token.category === "typography"),
);
const resolvedByTheme = computed(() => {
  const map: Record<string, Record<string, string | number>> = {};
  for (const item of themes.value) {
    map[item.id] = resolveThemeTokens(item.id);
  }
  return map;
});
const styleByTheme = computed(() => {
  const map: Record<string, Record<string, string | number>> = {};
  for (const item of themes.value) {
    map[item.id] = tokensToCssVars(resolvedByTheme.value[item.id] ?? {});
  }
  return map;
});
const cssVars = computed(() => {
  if (!theme.value) return {};
  return tokensToCssVars(resolveThemeTokens(theme.value.id));
});
const resolved = computed(() =>
  theme.value ? resolveThemeTokens(theme.value.id) : {},
);

const feedbackTones = [
  { id: "success" as const, label: "成功", token: "color.success", chipTone: "success" as const },
  { id: "warning" as const, label: "警告", token: "color.warning", chipTone: "warning" as const },
  { id: "error" as const, label: "错误", token: "color.error", chipTone: "error" as const },
  { id: "info" as const, label: "信息", token: "color.info", chipTone: "primary" as const },
];
</script>

<template>
  <ResourcePageShell
    v-if="theme"
    eyebrow="主题"
    :title="theme.label"
    description="完整对照语义色、字体、表单、列表与反馈状态。与「颜色」共用同一套 Token key。"
    :style="cssVars"
  >
    <template #stats>
      <v-chip size="small" variant="tonal"
        >{{ colorTokens.length }} 颜色</v-chip
      >
      <v-chip size="small" variant="tonal"
        >{{ typographyTokens.length }} 字体</v-chip
      >
      <v-chip size="small" variant="tonal">{{ themes.length }} 主题</v-chip>
    </template>

    <section class="theme-comparison">
      <div class="comparison-heading">
        <div>
          <span>应用示例</span>
          <h2>浅色与深色 UI 对照</h2>
        </div>
        <p>当前路由强调 {{ theme.label }}，两侧始终使用同一组真实组件。</p>
      </div>
      <div class="comparison-grid">
        <article
          v-for="item in themes"
          :key="item.id"
          class="theme-demo"
          :class="{ 'is-current': item.id === theme.id }"
          :style="styleByTheme[item.id]"
        >
          <header><strong>{{ item.label }}</strong><code>{{ item.id }}</code></header>
          <Card title="设备巡检" subtitle="今日 3 项待处理">
            <div class="demo-content">
              <TextField label="搜索工单" model-value="设备编号 A-102" />
              <ul class="sample-list">
                <li><strong>中央空调异常</strong><span>高优先级 · 12 分钟前</span></li>
                <li><strong>例行安全检查</strong><span>计划中 · 今天 14:30</span></li>
              </ul>
              <div class="matrix-row">
                <Chip label="处理中" tone="primary" />
                <Button label="打开工单" />
              </div>
            </div>
          </Card>
        </article>
      </div>
    </section>

    <div class="matrix-grid">
      <section class="panel">
        <h2>语义色矩阵</h2>
        <div class="compare">
          <div class="compare-head">
            <span>Token</span>
            <span v-for="item in themes" :key="item.id">{{ item.label }}</span>
          </div>
          <div v-for="token in colorTokens" :key="token.id" class="compare-row">
            <div class="token-meta">
              <strong>{{ token.label }}</strong>
              <code>{{ token.id }}</code>
            </div>
            <div
              v-for="item in themes"
              :key="`${token.id}-${item.id}`"
              class="value"
            >
              <span
                class="swatch"
                :style="{
                  background: String(resolvedByTheme[item.id]?.[token.id]),
                }"
              />
              <code>{{ resolvedByTheme[item.id]?.[token.id] }}</code>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>字体矩阵</h2>
        <div class="typo-list">
          <article
            v-for="token in typographyTokens"
            :key="token.id"
            class="typo-row"
          >
            <p :style="{ font: String(resolved[token.id]) }">
              {{ token.label }} — The quick brown fox
            </p>
            <code>{{ token.id }} · {{ resolved[token.id] }}</code>
          </article>
        </div>
      </section>

      <section class="panel">
        <h2>表单状态</h2>
        <div class="form-matrix">
          <TextField label="默认" model-value="可编辑内容" />
          <TextField label="已填写" model-value="示例文案" />
          <TextField label="禁用" model-value="不可编辑" disabled />
        </div>
      </section>

      <section class="panel">
        <h2>列表样本</h2>
        <Card title="列表预览" subtitle="表面 / 边框 / 字体来自 Token">
          <ul class="sample-list">
            <li>
              <strong>整理需求</strong>
              <span>今日 · 进行中</span>
            </li>
            <li>
              <strong>联调接口</strong>
              <span>明日 · 待开始</span>
            </li>
            <li>
              <strong>验收走查</strong>
              <span>本周 · 高优先级</span>
            </li>
          </ul>
        </Card>
      </section>

      <section class="panel feedback-panel">
        <h2>反馈状态矩阵</h2>
        <div class="feedback-grid">
          <article
            v-for="tone in feedbackTones"
            :key="tone.id"
            class="feedback-card"
            :style="{
              borderColor: String(resolved[tone.token]),
              background: `color-mix(in srgb, ${String(resolved[tone.token])} 12%, transparent)`,
            }"
          >
            <Chip :label="tone.label" :tone="tone.chipTone" />
            <code>{{ tone.token }}</code>
            <span>{{ resolved[tone.token] }}</span>
          </article>
        </div>
        <div class="matrix-row">
          <Button label="主按钮" />
          <Button label="次按钮" tone="secondary" variant="tonal" />
          <Button label="危险" tone="error" variant="outlined" />
        </div>
      </section>
    </div>
  </ResourcePageShell>
  <v-alert v-else type="error" variant="tonal">未知主题：{{ themeId }}</v-alert>
</template>

<style scoped>
.theme-comparison {
  display: grid;
  gap: 14px;
}
.comparison-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 20px;
}
.comparison-heading span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.comparison-heading h2 {
  margin: 2px 0 0;
  font-size: 1rem;
}
.comparison-heading p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
.comparison-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.theme-demo {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--pb-color-border, #d7dee8);
  border-radius: 16px;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.theme-demo.is-current {
  box-shadow: 0 0 0 2px var(--pb-color-primary, #2563eb);
}
.theme-demo > header {
  display: flex;
  justify-content: space-between;
}
.theme-demo code {
  color: var(--pb-color-on-surface-muted, #64748b);
  font-size: 0.6875rem;
}
.demo-content {
  display: grid;
  gap: 12px;
}
.matrix-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}
.panel {
  grid-column: span 6;
  padding: 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}
.feedback-panel {
  grid-column: span 12;
}
.panel h2 {
  margin: 0 0 12px;
  font-size: 0.9375rem;
}
.compare {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
}
.compare-head,
.compare-row {
  display: grid;
  grid-template-columns: minmax(120px, 1.1fr) 1fr 1fr;
  gap: 10px;
  padding: 10px 12px;
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
.value code,
.typo-row code,
.feedback-card code,
.feedback-card span {
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
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.typo-list,
.form-matrix {
  display: grid;
  gap: 10px;
}
.typo-row p {
  margin: 0 0 4px;
}
.sample-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.sample-list li {
  display: grid;
  gap: 2px;
  padding: 10px 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.sample-list li:first-child {
  border-top: 0;
  padding-top: 0;
}
.sample-list span {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.75rem;
}
.feedback-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
.feedback-card {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid;
  border-radius: 12px;
}
.matrix-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
@media (max-width: 1279px) {
  .comparison-grid {
    grid-template-columns: 1fr;
  }
  .panel,
  .feedback-panel {
    grid-column: span 12;
  }
  .feedback-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .feedback-grid {
    grid-template-columns: 1fr;
  }
  .compare-head,
  .compare-row {
    grid-template-columns: 1fr;
  }
}
</style>
