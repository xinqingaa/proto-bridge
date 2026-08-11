<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import WorkbenchStatChip from "@/workbench/ui/WorkbenchStatChip.vue";
import { loadTokens } from "@/design-system/loaders";
import {
  normalizeTokenCssVarName,
  resolveThemeTokens,
  tokensToCssVars,
  tokenValueToCssValue,
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

type SizingKind = "control" | "icon" | "avatar" | "other";

const sizingGroupMeta: Array<{ kind: SizingKind; label: string }> = [
  { kind: "control", label: "控件高度" },
  { kind: "icon", label: "图标" },
  { kind: "avatar", label: "头像" },
  { kind: "other", label: "触控与其它" },
];

const numericSortCategories = new Set<TokenCategory>([
  "spacing",
  "sizing",
  "radius",
  "opacity",
]);

const allTokens = computed(() => loadTokens());
const pageDescription = computed(() =>
  tokenCategoryDescription(props.category),
);
const tokenListTitle = computed(() =>
  props.category === "border"
    ? "复合边框与宽度值"
    : `${TOKEN_CATEGORY_META[props.category].label}值`,
);
const tokenListHint = computed(() =>
  props.category === "border"
    ? "复合边框包含宽度、线型与颜色；宽度值只负责粗细"
    : `通过工具栏切换 ${themeLabel.value}主题`,
);

const categoryTokens = computed(() =>
  allTokens.value.filter((token) => token.category === props.category),
);
const categoryTotal = computed(() => categoryTokens.value.length);
const bindCount = computed(
  () => categoryTokens.value.filter((token) => isBindTokenId(token.id)).length,
);

const themeLabel = computed(() =>
  themeId.value === "light" ? "浅色" : "深色",
);
const resolved = computed(() => resolveThemeTokens(themeId.value));
const previewCssVars = computed(() => tokensToCssVars(resolved.value));

function numericValue(tokenId: string): number {
  const value = resolved.value[tokenId];
  if (typeof value === "number") return value;
  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function sortTokens(list: TokenRecord[]): TokenRecord[] {
  if (!numericSortCategories.has(props.category)) return list;
  return [...list].sort((a, b) => {
    const diff = numericValue(a.id) - numericValue(b.id);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}

const tokens = computed(() => {
  const list = categoryTokens.value;
  const q = query.value.trim().toLowerCase();
  const filtered = !q
    ? list
    : list.filter(
        (token) =>
          token.id.toLowerCase().includes(q) ||
          token.label.toLowerCase().includes(q) ||
          (token.description ?? "").toLowerCase().includes(q),
      );
  return sortTokens(filtered);
});

function sizingKind(tokenId: string): SizingKind {
  if (tokenId.includes(".icon-")) return "icon";
  if (tokenId.includes(".avatar-")) return "avatar";
  if (
    tokenId.includes(".control-") ||
    tokenId.endsWith(".menu-item") ||
    tokenId.endsWith(".tab") ||
    tokenId.endsWith(".bottom-navigation")
  ) {
    return "control";
  }
  return "other";
}

const sizingGroups = computed(() =>
  sizingGroupMeta
    .map((group) => ({
      ...group,
      tokens: tokens.value.filter(
        (token) => sizingKind(token.id) === group.kind,
      ),
    }))
    .filter((group) => group.tokens.length > 0),
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

function tokenCssVar(token: TokenRecord): string {
  return normalizeTokenCssVarName(token.id);
}

function selectToken(id: string) {
  selectedId.value = id;
}

function formatValue(tokenId: string): string {
  const value = resolved.value[tokenId];
  if (value == null) return "—";
  if (props.category === "opacity" && typeof value === "number") {
    return `${Math.round(value * 100)}% · ${value}`;
  }
  if (
    (props.category === "spacing" ||
      props.category === "sizing" ||
      props.category === "radius") &&
    typeof value === "number"
  ) {
    if (props.category === "radius" && value >= 999) return "full";
    return `${value}px`;
  }
  return tokenValueToCssValue(tokenId, value);
}

function px(tokenId: string): string {
  const value = resolved.value[tokenId];
  if (typeof value === "number") return `${value}px`;
  return String(value ?? "0");
}

function isBorderWidthToken(tokenId: string): boolean {
  return tokenId.endsWith("width-hairline") || tokenId.endsWith("accent-width");
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

    <section
      class="token-section"
      aria-labelledby="token-list-title"
      :style="previewCssVars"
    >
      <div class="section-heading compact-heading">
        <div>
          <p class="section-kicker">Token 对照</p>
          <h2 id="token-list-title">
            {{ tokenListTitle }}
          </h2>
        </div>
        <span>{{ tokenListHint }}</span>
      </div>

      <template v-if="displayMode === 'grid'">
        <template v-if="category === 'sizing'">
          <div
            v-for="group in sizingGroups"
            :key="group.kind"
            class="token-group"
          >
            <h3 class="group-title">{{ group.label }}</h3>
            <div class="token-grid">
              <button
                v-for="token in group.tokens"
                :key="token.id"
                type="button"
                class="token-card"
                :class="{ 'is-selected': selected?.id === token.id }"
                @click="selectToken(token.id)"
              >
                <div class="preview-frame">
                  <div
                    v-if="sizingKind(token.id) === 'control'"
                    class="height-bar"
                    :style="{ height: px(token.id) }"
                  />
                  <div
                    v-else-if="sizingKind(token.id) === 'icon'"
                    class="square-sample is-icon"
                    :style="{ width: px(token.id), height: px(token.id) }"
                  />
                  <div
                    v-else-if="sizingKind(token.id) === 'avatar'"
                    class="square-sample is-avatar"
                    :style="{ width: px(token.id), height: px(token.id) }"
                  />
                  <div
                    v-else
                    class="square-sample is-touch"
                    :style="{ width: px(token.id), height: px(token.id) }"
                  />
                </div>
                <strong>{{ token.label }}</strong>
                <span class="value-chip">{{ formatValue(token.id) }}</span>
                <code>{{ token.id }}</code>
              </button>
            </div>
          </div>
        </template>

        <div v-else class="token-grid">
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
              class="preview-frame elevation-frame"
            >
              <div
                class="elevation-box"
                :style="{ boxShadow: String(resolved[token.id]) }"
              />
            </div>

            <div v-else-if="category === 'spacing'" class="preview-frame">
              <div class="spacing-bar" :style="{ width: px(token.id) }" />
            </div>

            <div v-else-if="category === 'radius'" class="preview-frame">
              <div
                class="radius-sample"
                :style="{ borderRadius: px(token.id) }"
              />
            </div>

            <div v-else-if="category === 'border'" class="preview-frame">
              <div
                class="border-sample"
                :class="{ 'is-width-only': isBorderWidthToken(token.id) }"
                :style="
                  isBorderWidthToken(token.id)
                    ? {
                        '--workbench-border-width': String(resolved[token.id]),
                      }
                    : { border: String(resolved[token.id]) }
                "
              />
            </div>

            <div v-else-if="category === 'opacity'" class="preview-frame">
              <div class="opacity-sample">
                <span class="opacity-base" />
                <span
                  class="opacity-overlay"
                  :style="{ opacity: Number(resolved[token.id]) }"
                />
              </div>
            </div>

            <div
              v-else-if="category === 'motion'"
              class="preview-frame motion-frame"
            >
              <span
                class="motion-dot"
                :style="
                  token.id.includes('easing')
                    ? {
                        animationDuration: '720ms',
                        animationTimingFunction: String(resolved[token.id]),
                      }
                    : {
                        animationDuration: String(resolved[token.id]),
                        animationTimingFunction:
                          'var(--pb-motion-easing-standard, ease)',
                      }
                "
              />
            </div>

            <p
              v-else-if="category === 'typography'"
              class="typo-sample"
              :style="{ font: String(resolved[token.id]) }"
            >
              Aa
            </p>

            <div v-else class="abstract-sample">
              <span>{{ formatValue(token.id) }}</span>
            </div>

            <strong>{{ token.label }}</strong>
            <span
              v-if="
                category === 'spacing' ||
                category === 'radius' ||
                category === 'border' ||
                category === 'opacity' ||
                category === 'motion'
              "
              class="value-chip"
              >{{ formatValue(token.id) }}</span
            >
            <small
              v-if="category === 'border' && isBorderWidthToken(token.id)"
              class="token-kind-note"
              >仅宽度 · 需与线型、颜色组合</small
            >
            <code>{{ token.id }}</code>
          </button>
        </div>
      </template>

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
            <code>{{ formatValue(token.id) }}</code>
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
              <dd>
                <code>{{ selected.id }}</code>
              </dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd class="value-with-swatch">
                <code>{{ formatValue(selected.id) }}</code>
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
.token-group {
  display: grid;
  gap: 10px;
}
.group-title {
  margin: 8px 0 0;
  font-size: 0.8125rem;
  font-weight: 700;
}
.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
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
.preview-frame {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
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
.spacing-bar {
  height: 12px;
  min-width: 2px;
  max-width: 100%;
  border-radius: 3px;
  background: rgb(var(--v-theme-primary));
}
.height-bar {
  width: 28px;
  min-height: 2px;
  max-height: 72px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
}
.square-sample {
  flex: 0 0 auto;
  background: rgb(var(--v-theme-primary));
}
.square-sample.is-icon {
  border-radius: 4px;
}
.square-sample.is-avatar {
  border-radius: 999px;
}
.square-sample.is-touch {
  border-radius: 8px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 35%, transparent);
  border: 1px dashed rgb(var(--v-theme-primary));
}
.radius-sample {
  width: 52px;
  height: 52px;
  background: rgb(var(--v-theme-primary));
}
.border-sample {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  box-sizing: border-box;
}
.border-sample.is-width-only {
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
}
.border-sample.is-width-only::before {
  width: 100%;
  border-top: var(--workbench-border-width) solid rgb(var(--v-theme-primary));
  content: "";
}
.token-kind-note {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.7rem;
}
.opacity-sample {
  position: relative;
  width: 100%;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.opacity-base {
  position: absolute;
  inset: 0;
  background: repeating-conic-gradient(
      rgba(var(--v-theme-on-surface), 0.12) 0% 25%,
      transparent 0% 50%
    )
    0 0 / 12px 12px;
}
.opacity-overlay {
  position: absolute;
  inset: 0;
  background: rgb(var(--v-theme-primary));
}
.motion-frame {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  overflow: hidden;
  position: relative;
}
.motion-dot {
  position: absolute;
  top: 50%;
  left: 8px;
  width: 14px;
  height: 14px;
  margin-top: -7px;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
  animation-name: token-motion-travel;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}
@keyframes token-motion-travel {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(96px);
  }
}
.elevation-frame {
  justify-content: center;
  padding: 10px 0;
}
.elevation-box {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
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
.value-chip {
  justify-self: start;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.6875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.token-card strong {
  font-size: 0.8125rem;
}
.token-card code,
.token-table code,
.token-aside code {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
  word-break: break-all;
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

@media (prefers-reduced-motion: reduce) {
  .motion-dot {
    animation: none;
    left: 50%;
    margin-left: -7px;
  }
}
</style>
