<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import { loadTokens } from "@/design-system/loaders";
import {
  normalizeTokenCssVarName,
  resolveThemeTokens,
} from "@/design-system/resolveThemeTokens";
import type { TokenCategory, TokenRecord } from "@/design-system/types";
import { TOKEN_CATEGORIES } from "@/design-system/types";

const props = defineProps<{
  category: TokenCategory;
}>();

const query = ref("");
const themeId = ref<"light" | "dark">("light");
const displayMode = ref<"grid" | "table">("grid");
const selectedId = ref<string | null>(null);

const categoryLabels: Record<TokenCategory, string> = {
  color: "颜色",
  typography: "字体",
  spacing: "间距",
  sizing: "尺寸",
  radius: "圆角",
  border: "边框",
  elevation: "阴影",
  opacity: "透明度",
  motion: "动效",
};

const allTokens = computed(() => loadTokens());
const categoryCounts = computed(() =>
  TOKEN_CATEGORIES.map((category) => ({
    category,
    label: categoryLabels[category],
    count: allTokens.value.filter((token) => token.category === category)
      .length,
  })),
);

const tokens = computed(() => {
  const list = allTokens.value.filter(
    (token) => token.category === props.category,
  );
  const q = query.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (token) =>
      token.id.toLowerCase().includes(q) ||
      token.label.toLowerCase().includes(q) ||
      (token.description ?? "").toLowerCase().includes(q),
  );
});

const lightResolved = computed(() => resolveThemeTokens("light"));
const darkResolved = computed(() => resolveThemeTokens("dark"));
const resolved = computed(() =>
  themeId.value === "light" ? lightResolved.value : darkResolved.value,
);

const selected = computed(
  () =>
    tokens.value.find((token) => token.id === selectedId.value) ??
    tokens.value[0] ??
    null,
);

watch(
  () => props.category,
  () => {
    selectedId.value = null;
    query.value = "";
  },
);

watch(
  tokens,
  (list) => {
    if (!list.some((token) => token.id === selectedId.value)) {
      selectedId.value = list[0]?.id ?? null;
    }
  },
  { immediate: true },
);

function parseTypography(value: unknown): { weight: string; size: string } {
  const text = String(value);
  const match = text.match(/^(\d+)\s+(\d+(?:\.\d+)?px)/);
  if (!match) return { weight: "—", size: "—" };
  return { weight: match[1]!, size: match[2]! };
}

function tokenCssVar(token: TokenRecord): string {
  return normalizeTokenCssVarName(token.id);
}

function selectToken(id: string) {
  selectedId.value = id;
}
</script>

<template>
  <ResourcePageShell
    eyebrow="设计令牌"
    :title="categoryLabels[category]"
    description="浏览 Token 的当前主题值、CSS Variable 与用途；浅色和深色差异请在主题页集中比较。"
  >
    <template #stats>
      <button
        v-for="item in categoryCounts"
        :key="item.category"
        type="button"
        class="stat-chip"
        :class="{ 'is-active': item.category === category }"
        @click="$router.push(`/workbench/foundations/tokens/${item.category}`)"
      >
        <strong>{{ item.count }}</strong>
        <span>{{ item.label }}</span>
      </button>
    </template>

    <template #toolbar>
      <v-text-field
        v-model="query"
        label="搜索 Token"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="search-field"
      />
      <div class="toolbar-actions">
        <v-btn-toggle
          v-model="themeId"
          density="compact"
          color="primary"
          variant="outlined"
          divided
          mandatory
          aria-label="突出显示的主题"
        >
          <v-btn value="light" size="small">浅色</v-btn>
          <v-btn value="dark" size="small">深色</v-btn>
        </v-btn-toggle>
        <v-btn-toggle
          v-model="displayMode"
          density="compact"
          color="primary"
          variant="outlined"
          divided
          mandatory
        >
          <v-btn value="grid" size="small">网格</v-btn>
          <v-btn value="table" size="small">表格</v-btn>
        </v-btn-toggle>
        <span class="toolbar-meta">{{ tokens.length }} 项</span>
      </div>
    </template>

    <section class="token-section" aria-labelledby="token-list-title">
      <div class="section-heading compact-heading">
        <div>
          <p class="section-kicker">Token 对照</p>
          <h2 id="token-list-title">{{ categoryLabels[category] }}值</h2>
        </div>
        <span>浅色与深色始终同时可见</span>
      </div>

    <div v-if="displayMode === 'grid'" class="token-grid">
      <button
        v-for="token in tokens"
        :key="token.id"
        type="button"
        class="token-card"
        :class="{ 'is-selected': selected?.id === token.id }"
        @click="selectToken(token.id)"
      >
        <div v-if="category === 'color'" class="single-swatch">
          <span :style="{ background: String(resolved[token.id]) }" />
        </div>
        <div
          v-else-if="category === 'elevation'"
          class="elevation-box"
          :style="{ boxShadow: String(resolved[token.id]) }"
        />
        <div
          v-else-if="category === 'spacing' || category === 'radius' || category === 'sizing'"
          class="metric-box"
          :style="
            category === 'spacing' || category === 'sizing'
              ? {
                  width:
                    typeof resolved[token.id] === 'number'
                      ? `${resolved[token.id]}px`
                      : String(resolved[token.id]),
                }
              : {
                  borderRadius:
                    typeof resolved[token.id] === 'number'
                      ? `${resolved[token.id]}px`
                      : String(resolved[token.id]),
                }
          "
        />
        <p
          v-else-if="category === 'typography'"
          class="typo-sample"
          :style="{ font: String(resolved[token.id]) }"
        >
          Aa
        </p>
        <div v-else class="abstract-sample">
          <span>{{ resolved[token.id] }}</span>
        </div>
        <strong>{{ token.label }}</strong>
        <code>{{ token.id }}</code>
      </button>
    </div>

    <div v-else class="token-table" role="table">
      <div class="token-table-head" role="row">
        <span>名称</span>
        <span>Token ID</span>
        <span>{{ themeId === "light" ? "浅色值" : "深色值" }}</span>
        <span>来源</span>
      </div>
      <button
        v-for="token in tokens"
        :key="token.id"
        type="button"
        class="token-table-row"
        :class="{ 'is-selected': selected?.id === token.id }"
        role="row"
        @click="selectToken(token.id)"
      >
        <strong>{{ token.label }}</strong>
        <code>{{ token.id }}</code>
        <span>{{ resolved[token.id] }}</span>
        <span>{{ themeId === "dark" && darkResolved[token.id] !== lightResolved[token.id] ? "主题覆盖" : "基础值" }}</span>
      </button>
    </div>

    <p v-if="tokens.length === 0" class="empty">没有匹配的 Token。</p>
    </section>

    <section v-if="selected" class="token-detail" aria-live="polite">
      <div class="detail-title">
        <p class="aside-label">当前选择</p>
        <h2>{{ selected.label }}</h2>
        <p>{{ selected.description || "暂无用途说明" }}</p>
      </div>
      <dl class="detail-list">
          <div>
            <dt>Token ID / Key</dt>
            <dd><code>{{ selected.id }}</code></dd>
          </div>
          <div>
            <dt>CSS Variable</dt>
            <dd><code>{{ tokenCssVar(selected) }}</code></dd>
          </div>
          <div>
            <dt>类型</dt>
            <dd>{{ categoryLabels[selected.category] }}</dd>
          </div>
          <div>
            <dt>{{ themeId === "light" ? "浅色主题值" : "深色主题值" }}</dt>
            <dd>
              <span
                v-if="category === 'color'"
                class="inline-swatch"
                :style="{ background: String(resolved[selected.id]) }"
              />
              <code>{{ resolved[selected.id] }}</code>
            </dd>
          </div>
          <div>
            <dt>值来源</dt>
            <dd>{{ themeId === "dark" && darkResolved[selected.id] !== lightResolved[selected.id] ? "深色主题覆盖" : "基础 Token" }}</dd>
          </div>
          <div v-if="category === 'typography'">
            <dt>解析</dt>
            <dd>
              weight {{ parseTypography(resolved[selected.id]).weight }} · size
              {{ parseTypography(resolved[selected.id]).size }}
            </dd>
          </div>
      </dl>
    </section>
  </ResourcePageShell>
</template>

<style scoped>
.stat-chip {
  display: grid;
  gap: 2px;
  min-width: 72px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  text-align: left;
  cursor: pointer;
}
.stat-chip.is-active {
  border-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 45%, transparent);
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
}
.stat-chip strong {
  font-size: 1rem;
  line-height: 1;
}
.stat-chip span {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.6875rem;
}
.search-field {
  flex: 1 1 220px;
  max-width: 320px;
}
.toolbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.toolbar-meta {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
.token-section {
  display: grid;
  gap: 14px;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: end;
}
.section-heading h2 {
  margin: 2px 0 0;
  font-size: 1rem;
}
.section-heading > span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.75rem;
}
.section-kicker {
  margin: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.compact-heading {
  margin-top: 4px;
}
.token-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 10px;
}
.token-card {
  grid-column: span 3;
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  text-align: left;
  cursor: pointer;
}
.token-card.is-selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}
.single-swatch {
  display: block;
  height: 56px;
}
.single-swatch span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.metric-box {
  width: 48px;
  height: 16px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
}
.elevation-box {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
}
.typo-sample {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}
.abstract-sample {
  height: 56px;
  display: grid;
  place-items: center;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.7rem;
  text-align: center;
  overflow: hidden;
}
.token-card strong {
  font-size: 0.8125rem;
}
.token-card code,
.token-table code,
.detail-list code {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
}
.token-table {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}
.token-table-head,
.token-table-row {
  display: grid;
  grid-template-columns: minmax(100px, 0.8fr) minmax(160px, 1.2fr) 1fr 1fr;
  gap: 12px;
  padding: 10px 12px;
  text-align: left;
}
.token-table-head {
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.75rem;
  font-weight: 700;
}
.token-table-row {
  width: 100%;
  border: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: transparent;
  cursor: pointer;
}
.token-table-row.is-selected {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent);
}
.aside-label {
  margin: 0 0 4px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
}
.token-detail {
  display: grid;
  grid-template-columns: minmax(180px, 0.8fr) minmax(0, 2fr);
  gap: 24px;
  padding: 18px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}
.token-detail h2 {
  margin: 0 0 12px;
  font-size: 1.125rem;
}
.detail-title > p:last-child {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.8125rem;
}
.detail-list {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.detail-list dt {
  margin: 0 0 2px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
}
.detail-list dd {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  word-break: break-word;
}
.inline-swatch {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.empty {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.8125rem;
}
@media (max-width: 1279px) {
  .token-card {
    grid-column: span 4;
  }
}
@media (max-width: 900px) {
  .token-detail {
    grid-template-columns: 1fr;
  }
  .detail-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .token-card {
    grid-column: span 6;
  }
  .token-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .toolbar-actions {
    margin-left: 0;
    flex-wrap: wrap;
  }
  .section-heading {
    align-items: start;
    flex-direction: column;
  }
  .detail-list {
    grid-template-columns: 1fr;
  }
  .token-card {
    grid-column: span 12;
  }
}
</style>
