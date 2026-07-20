<script setup lang="ts">
import { computed, ref } from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import { loadThemes, loadTokens } from "@/design-system/loaders";
import { resolveThemeTokens } from "@/design-system/resolveThemeTokens";

const props = defineProps<{ themeId: string }>();
const onlyDifferences = ref(false);
const theme = computed(() => loadThemes().find((item) => item.id === props.themeId));
const themes = computed(() => loadThemes());
const lightValues = computed(() => resolveThemeTokens("light"));
const darkValues = computed(() => resolveThemeTokens("dark"));
const colorTokens = computed(() =>
  loadTokens().filter((token) => token.category === "color"),
);

const groups = [
  { id: "surface", label: "背景与表面", match: ["background", "surface", "scrim"] },
  { id: "content", label: "文字与前景", match: ["on-"] },
  { id: "brand", label: "品牌与强调", match: ["primary", "secondary", "info"] },
  { id: "feedback", label: "反馈状态", match: ["success", "warning", "error", "disabled"] },
  { id: "structure", label: "边框与结构", match: ["border", "outline", "divider"] },
] as const;

function groupId(tokenId: string) {
  const key = tokenId.replace("color.", "");
  if (key.startsWith("on-")) return "content";
  if (["border", "outline", "divider"].includes(key)) return "structure";
  if (["success", "success-soft", "warning", "warning-soft", "error", "error-soft", "disabled"].includes(key)) return "feedback";
  if (["primary", "primary-soft", "secondary", "secondary-soft", "info"].includes(key)) return "brand";
  return "surface";
}

const groupedColors = computed(() =>
  groups
    .map((group) => ({
      ...group,
      tokens: colorTokens.value.filter((token) => {
        if (groupId(token.id) !== group.id) return false;
        return !onlyDifferences.value || lightValues.value[token.id] !== darkValues.value[token.id];
      }),
    }))
    .filter((group) => group.tokens.length),
);

const differenceCount = computed(
  () => colorTokens.value.filter((token) => lightValues.value[token.id] !== darkValues.value[token.id]).length,
);

function hexRgb(value: unknown): [number, number, number] | null {
  const text = String(value).trim();
  const match = text.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
  if (!match) return null;
  const hex = match[1]!;
  return [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)];
}

function luminance(value: unknown) {
  const rgb = hexRgb(value);
  if (!rgb) return null;
  const channels = rgb.map((channel) => {
    const n = channel / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(foreground: unknown, background: unknown) {
  const a = luminance(foreground);
  const b = luminance(background);
  if (a === null || b === null) return "—";
  return `${((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2)}:1`;
}

const contrastPairs = [
  ["color.on-background", "color.background", "页面正文"],
  ["color.on-surface", "color.surface", "表面正文"],
  ["color.on-primary", "color.primary", "主按钮"],
  ["color.on-error", "color.error", "错误反馈"],
] as const;
</script>

<template>
  <ResourcePageShell
    v-if="theme"
    eyebrow="主题"
    :title="theme.label"
    description="主题页专门比较浅色与深色的语义颜色、覆盖关系和前景对比度。"
  >
    <template #stats>
      <v-chip size="small" variant="tonal">{{ colorTokens.length }} 个语义色</v-chip>
      <v-chip size="small" variant="tonal">{{ differenceCount }} 个深色覆盖</v-chip>
      <v-chip size="small" variant="tonal">{{ themes.length }} 个主题</v-chip>
    </template>

    <template #toolbar>
      <v-switch v-model="onlyDifferences" label="只看差异" color="primary" hide-details density="compact" />
      <span class="toolbar-note">当前强调：{{ theme.label }}</span>
    </template>

    <section v-for="group in groupedColors" :key="group.id" class="theme-group">
      <header>
        <h2>{{ group.label }}</h2>
        <span>{{ group.tokens.length }} 项</span>
      </header>
      <div class="compare-table">
        <div class="compare-head">
          <span>语义角色</span>
          <span :class="{ 'is-current': theme.id === 'light' }">浅色主题</span>
          <span :class="{ 'is-current': theme.id === 'dark' }">深色主题</span>
          <span>差异</span>
        </div>
        <div v-for="token in group.tokens" :key="token.id" class="compare-row">
          <div class="token-meta">
            <strong>{{ token.label }}</strong>
            <code>{{ token.id }}</code>
            <small>{{ token.description }}</small>
          </div>
          <div class="theme-value" :class="{ 'is-current': theme.id === 'light' }">
            <i :style="{ background: String(lightValues[token.id]) }" />
            <code>{{ lightValues[token.id] }}</code>
          </div>
          <div class="theme-value" :class="{ 'is-current': theme.id === 'dark' }">
            <i :style="{ background: String(darkValues[token.id]) }" />
            <code>{{ darkValues[token.id] }}</code>
          </div>
          <span class="difference" :class="{ 'is-changed': lightValues[token.id] !== darkValues[token.id] }">
            {{ lightValues[token.id] !== darkValues[token.id] ? "深色覆盖" : "相同" }}
          </span>
        </div>
      </div>
    </section>

    <section class="contrast-section">
      <header><h2>关键前景对比度</h2><span>用于快速检查语义组合</span></header>
      <div class="contrast-grid">
        <article v-for="pair in contrastPairs" :key="pair[2]">
          <strong>{{ pair[2] }}</strong>
          <code>{{ pair[0] }} / {{ pair[1] }}</code>
          <div><span>浅色</span><b>{{ contrast(lightValues[pair[0]], lightValues[pair[1]]) }}</b></div>
          <div><span>深色</span><b>{{ contrast(darkValues[pair[0]], darkValues[pair[1]]) }}</b></div>
        </article>
      </div>
    </section>
  </ResourcePageShell>
  <v-alert v-else type="error" variant="tonal">未知主题：{{ themeId }}</v-alert>
</template>

<style scoped>
.toolbar-note { margin-left: auto; color: rgba(var(--v-theme-on-surface), 0.58); font-size: 0.75rem; }
.theme-group, .contrast-section { display: grid; gap: 10px; }
.theme-group > header, .contrast-section > header { display: flex; align-items: baseline; justify-content: space-between; }
h2 { margin: 0; font-size: 1rem; }
header span { color: rgba(var(--v-theme-on-surface), 0.52); font-size: 0.75rem; }
.compare-table { overflow: hidden; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 14px; background: rgb(var(--v-theme-surface)); }
.compare-head, .compare-row { display: grid; grid-template-columns: minmax(200px, 1.3fr) minmax(140px, 1fr) minmax(140px, 1fr) 88px; align-items: stretch; }
.compare-head { background: rgba(var(--v-theme-on-surface), 0.045); color: rgba(var(--v-theme-on-surface), 0.62); font-size: 0.72rem; font-weight: 700; }
.compare-head span { padding: 10px 12px; }
.compare-head .is-current { color: rgb(var(--v-theme-primary)); }
.compare-row + .compare-row { border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.token-meta, .theme-value { padding: 11px 12px; }
.token-meta { display: grid; gap: 2px; }
.token-meta code, .token-meta small { color: rgba(var(--v-theme-on-surface), 0.55); font-size: 0.7rem; }
.theme-value { display: flex; align-items: center; gap: 9px; border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.theme-value.is-current { background: color-mix(in srgb, rgb(var(--v-theme-primary)) 6%, transparent); }
.theme-value i { width: 38px; height: 30px; flex: 0 0 auto; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 8px; }
.theme-value code { font-size: 0.72rem; }
.difference { align-self: center; justify-self: center; padding: 3px 7px; border-radius: 999px; background: rgba(var(--v-theme-on-surface), 0.06); font-size: 0.68rem; }
.difference.is-changed { background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent); color: rgb(var(--v-theme-primary)); }
.contrast-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.contrast-grid article { display: grid; gap: 7px; padding: 12px; border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 12px; background: rgb(var(--v-theme-surface)); }
.contrast-grid code { color: rgba(var(--v-theme-on-surface), 0.52); font-size: 0.66rem; overflow-wrap: anywhere; }
.contrast-grid div { display: flex; justify-content: space-between; font-size: 0.75rem; }
@media (max-width: 900px) { .compare-head, .compare-row { grid-template-columns: minmax(170px, 1fr) 120px 120px 78px; } .contrast-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
