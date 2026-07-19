<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import { loadTokens } from "@/design-system/loaders";
import {
  normalizeTokenCssVarName,
  resolveThemeTokens,
  tokensToCssVars,
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
  radius: "圆角",
  elevation: "阴影",
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

const resolved = computed(() => resolveThemeTokens(themeId.value));
const cssVars = computed(() => tokensToCssVars(resolved.value));

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
    description="按类别浏览 Token；右侧详情展示 Key、CSS Variable、类型、主题值与用途。颜色 key 与主题共用。"
    with-aside
    :style="cssVars"
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
      <v-btn-toggle
        v-model="themeId"
        density="compact"
        color="primary"
        variant="outlined"
        divided
        mandatory
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
    </template>

    <div v-if="displayMode === 'grid'" class="token-grid">
      <button
        v-for="token in tokens"
        :key="token.id"
        type="button"
        class="token-card"
        :class="{ 'is-selected': selected?.id === token.id }"
        @click="selectToken(token.id)"
      >
        <div
          v-if="category === 'color'"
          class="swatch-chip"
          :style="{ background: String(resolved[token.id]) }"
        />
        <div
          v-else-if="category === 'elevation'"
          class="elevation-box"
          :style="{ boxShadow: String(resolved[token.id]) }"
        />
        <div
          v-else-if="category === 'spacing' || category === 'radius'"
          class="metric-box"
          :style="
            category === 'spacing'
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
          v-else
          class="typo-sample"
          :style="{ font: String(resolved[token.id]) }"
        >
          Aa
        </p>
        <strong>{{ token.label }}</strong>
        <code>{{ token.id }}</code>
      </button>
    </div>

    <div v-else class="token-table" role="table">
      <div class="token-table-head" role="row">
        <span>Label</span>
        <span>Token ID</span>
        <span>Value</span>
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
      </button>
    </div>

    <p v-if="tokens.length === 0" class="empty">没有匹配的 Token。</p>

    <template #aside>
      <template v-if="selected">
        <p class="aside-label">详情</p>
        <h2>{{ selected.label }}</h2>
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
            <dt>主题值（{{ themeId }}）</dt>
            <dd>
              <span
                v-if="category === 'color'"
                class="inline-swatch"
                :style="{ background: String(resolved[selected.id]) }"
              />
              <code>{{ resolved[selected.id] }}</code>
            </dd>
          </div>
          <div v-if="category === 'typography'">
            <dt>解析</dt>
            <dd>
              weight {{ parseTypography(resolved[selected.id]).weight }} · size
              {{ parseTypography(resolved[selected.id]).size }}
            </dd>
          </div>
          <div>
            <dt>用途</dt>
            <dd>{{ selected.description || "—" }}</dd>
          </div>
        </dl>
      </template>
      <p v-else class="empty">选择一个 Token 查看详情。</p>
    </template>
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
.toolbar-meta {
  margin-left: auto;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
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
.swatch-chip {
  height: 56px;
  border-radius: 8px;
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
  grid-template-columns: minmax(100px, 0.8fr) minmax(160px, 1.2fr) 1fr;
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
.resource-aside h2,
:deep(.resource-aside) h2 {
  margin: 0 0 12px;
  font-size: 1.125rem;
}
.detail-list {
  margin: 0;
  display: grid;
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
  .token-card {
    grid-column: span 6;
  }
  .token-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .token-card {
    grid-column: span 12;
  }
}
</style>
