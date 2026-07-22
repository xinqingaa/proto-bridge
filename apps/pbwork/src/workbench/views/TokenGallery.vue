<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import WorkbenchStatChip from "@/workbench/ui/WorkbenchStatChip.vue";
import { loadTokens } from "@/design-system/loaders";
import {
  normalizeTokenCssVarName,
  resolveThemeTokens,
} from "@/design-system/resolveThemeTokens";
import type { TokenCategory, TokenRecord } from "@/design-system/types";
import { isBindTokenId } from "@/design-system/bindTokens";
import {
  TOKEN_CATEGORY_META,
  tokenCategoryDescription,
} from "@/design-system/tokenCategories";

const props = defineProps<{
  category: TokenCategory;
}>();

const query = ref("");
const themeId = ref<"light" | "dark">("light");
const displayMode = ref<"grid" | "table">("grid");
const selectedId = ref<string | null>(null);

const allTokens = computed(() => loadTokens());
const pageDescription = computed(() => tokenCategoryDescription(props.category));

const categoryTokens = computed(() =>
  allTokens.value.filter((token) => token.category === props.category),
);
const categoryTotal = computed(() => categoryTokens.value.length);
const bindCount = computed(
  () => categoryTokens.value.filter((token) => isBindTokenId(token.id)).length,
);

const tokens = computed(() => {
  const list = categoryTokens.value;
  const q = query.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (token) =>
      token.id.toLowerCase().includes(q) ||
      token.label.toLowerCase().includes(q) ||
      (token.description ?? "").toLowerCase().includes(q),
  );
});

const themeLabel = computed(() =>
  themeId.value === "light" ? "浅色" : "深色",
);
const resolved = computed(() => resolveThemeTokens(themeId.value));

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

function tokenCssVar(token: TokenRecord): string {
  return normalizeTokenCssVarName(token.id);
}

function selectToken(id: string) {
  selectedId.value = id;
}

function formatValue(value: unknown): string {
  return String(value ?? "—");
}
</script>

<template>
  <ResourcePageShell
    eyebrow="设计令牌"
    :title="TOKEN_CATEGORY_META[category].label"
    :description="pageDescription"
    with-aside
  >
    <template #stats>
      <WorkbenchStatChip :value="categoryTotal" label="项" />
      <WorkbenchStatChip :value="bindCount" label="项已绑定到组件" />
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
          aria-label="主题"
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
          <h2 id="token-list-title">{{ TOKEN_CATEGORY_META[category].label }}值</h2>
        </div>
        <span>通过工具栏切换 {{ themeLabel }}主题</span>
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
            v-else-if="
              category === 'spacing' ||
              category === 'radius' ||
              category === 'sizing'
            "
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
          <span>{{ themeLabel }}值</span>
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
          <span class="value-with-swatch">
            <code>{{ formatValue(resolved[token.id]) }}</code>
            <span
              v-if="category === 'color'"
              class="inline-swatch"
              :style="{ background: String(resolved[token.id]) }"
            />
          </span>
        </button>
      </div>

      <p v-if="tokens.length === 0" class="empty">没有匹配的 Token。</p>
    </section>

    <template #aside>
      <div v-if="selected" class="token-aside" aria-live="polite">
        <p class="aside-label">当前选择 · {{ themeLabel }}</p>
        <h2>{{ selected.label }}</h2>
        <p class="aside-desc">{{ selected.description || "暂无用途说明" }}</p>
        <p class="aside-css">
          <span>CSS</span>
          <code>{{ tokenCssVar(selected) }}</code>
        </p>

        <div class="theme-row">
          <dl>
            <div>
              <dt>Key</dt>
              <dd><code>{{ selected.id }}</code></dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd class="value-with-swatch">
                <code>{{ formatValue(resolved[selected.id]) }}</code>
                <span
                  v-if="category === 'color'"
                  class="inline-swatch"
                  :style="{ background: String(resolved[selected.id]) }"
                />
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <p v-else class="empty">选择一个 Token 查看详情。</p>
    </template>
  </ResourcePageShell>
</template>

<style scoped>
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
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.token-card {
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
  height: 44px;
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
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
}
.typo-sample {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}
.abstract-sample {
  height: 44px;
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
.token-aside code {
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
  grid-template-columns: minmax(88px, 0.7fr) minmax(140px, 1.1fr) 1fr;
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
.token-aside h2 {
  margin: 0 0 6px;
  font-size: 1.0625rem;
}
.aside-desc {
  margin: 0 0 10px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.8125rem;
}
.aside-css {
  margin: 0 0 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  font-size: 0.75rem;
}
.aside-css > span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.6875rem;
}
.theme-row {
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.theme-row dl {
  margin: 0;
  display: grid;
  gap: 8px;
}
.theme-row dt {
  margin: 0 0 2px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
}
.theme-row dd {
  margin: 0;
  font-size: 0.8125rem;
  word-break: break-word;
}
.value-with-swatch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.inline-swatch {
  flex: 0 0 auto;
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
@media (max-width: 640px) {
  .toolbar-actions {
    margin-left: 0;
    flex-wrap: wrap;
  }
  .section-heading {
    align-items: start;
    flex-direction: column;
  }
  .token-table-head,
  .token-table-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
