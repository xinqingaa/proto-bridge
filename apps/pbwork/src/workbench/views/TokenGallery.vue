<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import WorkbenchSegmented from "@/workbench/ui/WorkbenchSegmented.vue";
import WorkbenchStatChip from "@/workbench/ui/WorkbenchStatChip.vue";
import ResourceScopeSelect, {
  type ResourceScope,
} from "@/workbench/ui/ResourceScopeSelect.vue";
import ThemeLineage from "@/workbench/ui/ThemeLineage.vue";
import { loadTokenPresentations } from "@/design-system/loaders";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import {
  normalizeTokenCssVarName,
  resolvePackTheme,
  themePackCssValues,
  themePackDiagnostics,
  valuesToCssVars,
} from "@/design-system/theme/presentation";
import type { TokenCategory, TokenRecord } from "@/design-system/types";
import { isBindTokenId } from "@/design-system/theme/bindings";
import {
  TOKEN_CATEGORY_META,
  tokenCategoryDescription,
} from "@/design-system/tokenCategories";

const props = defineProps<{
  category: TokenCategory;
}>();

const query = ref("");
const scope = ref<ResourceScope>({ kind: "foundation" });
const packId = computed(() => {
  if (scope.value.kind === "foundation") return "pbwork-base";
  if (scope.value.kind === "sample") return scope.value.packId;
  return scope.value.packId;
});
const themeName = ref(
  runtimeThemeSources.packs.get(packId.value)?.manifest.defaultTheme ?? "default",
);
watch(packId, () => {
  themeName.value =
    runtimeThemeSources.packs.get(packId.value)?.manifest.defaultTheme ??
    "default";
});
const mode = ref<"light" | "dark">("light");
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

const allTokens = computed(() => loadTokenPresentations());
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

function catalogKey(id: string) {
  return runtimeThemeSources.keyCatalog.keys.find((key) => key.id === id);
}

function constantRecords(category: TokenCategory): TokenRecord[] {
  return runtimeThemeSources.constants.constants
    .filter((item) => item.id.startsWith(`${category}.`))
    .map((item) => ({
      schemaVersion: 1 as const,
      id: item.id,
      label: item.label ?? item.id,
      category,
      defaultValue: String(item.value),
      ...(item.description ? { description: item.description } : {}),
    }));
}

const categoryTokens = computed(() => {
  const listed = allTokens.value.filter(
    (token) => token.category === props.category,
  );
  if (props.category !== "layout" && props.category !== "layer") return listed;
  const extras = constantRecords(props.category).filter(
    (token) => !listed.some((item) => item.id === token.id),
  );
  return [...listed, ...extras];
});
const categoryTotal = computed(() => categoryTokens.value.length);
const bindCount = computed(
  () => categoryTokens.value.filter((token) => isBindTokenId(token.id)).length,
);

const themeLabel = computed(() => (mode.value === "light" ? "浅色" : "深色"));
const activeTable = computed(() =>
  resolvePackTheme(packId.value, themeName.value, mode.value),
);
const resolved = computed(() =>
  themePackCssValues(packId.value, themeName.value, mode.value),
);
const diagnostics = computed(() => themePackDiagnostics(packId.value));
const previewCssVars = computed(() => valuesToCssVars(resolved.value));

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

const colorGroupMeta = [
  { id: "surface", label: "背景与表面", note: "" },
  { id: "content", label: "文字与前景", note: "" },
  { id: "brand", label: "品牌与强调", note: "" },
  { id: "feedback", label: "反馈状态", note: "" },
  { id: "structure", label: "边框与结构", note: "" },
  {
    id: "component",
    label: "组件色",
    note: "只给对应组件使用，取值引用上面的语义色。",
  },
] as const;

function colorGroupId(tokenId: string): (typeof colorGroupMeta)[number]["id"] {
  if (catalogKey(tokenId)?.tier === "component") return "component";
  const name = tokenId.replace(/^color\./, "");
  if (name.startsWith("on-")) return "content";
  if (["border", "outline", "divider"].includes(name)) return "structure";
  if (
    ["success", "success-soft", "warning", "warning-soft", "error", "error-soft", "disabled"].includes(name)
  ) {
    return "feedback";
  }
  if (["primary", "primary-soft", "secondary", "secondary-soft", "action", "action-soft", "info"].includes(name)) {
    return "brand";
  }
  return "surface";
}

const colorGroups = computed(() =>
  colorGroupMeta
    .map((group) => ({
      ...group,
      tokens: tokens.value.filter((token) => colorGroupId(token.id) === group.id),
    }))
    .filter((group) => group.tokens.length > 0),
);

const cardGroups = computed(() => {
  if (props.category === "color") return colorGroups.value;
  return [{ id: "all", label: "", note: "", tokens: tokens.value }];
});

function sizingKind(tokenId: string): SizingKind {
  if (tokenId.includes(".icon")) return "icon";
  if (tokenId.includes(".avatar")) return "avatar";
  if (tokenId.includes(".control")) return "control";
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

function readableId(id: string): string {
  return id.replaceAll(".", ".\u200b");
}

function selectToken(id: string) {
  selectedId.value = id;
}

function rawValue(tokenId: string): string | number | undefined {
  const value = resolved.value[tokenId];
  if (value != null) return value;
  const constant = runtimeThemeSources.constants.constants.find(
    (item) => item.id === tokenId,
  );
  return constant?.value;
}

function formatValue(tokenId: string): string {
  const value = rawValue(tokenId);
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
  return String(value);
}

function isTimingToken(tokenId: string): boolean {
  return tokenId.includes("easing") || tokenId.includes("duration");
}

function isAssetToken(tokenId: string): boolean {
  return tokenId.startsWith("asset.");
}

function layoutWidth(tokenId: string): string {
  const value = String(rawValue(tokenId) ?? "");
  if (value.endsWith("%")) return value;
  return "100%";
}

function px(tokenId: string): string {
  const value = rawValue(tokenId);
  if (typeof value === "number") return `${value}px`;
  return String(value ?? "0");
}

function isBorderWidthToken(tokenId: string): boolean {
  return tokenId.startsWith("border.width");
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
      <ResourceScopeSelect v-model="scope" />
      <WorkbenchSegmented
        :model-value="mode"
        :items="[
          { value: 'light', label: '浅色' },
          { value: 'dark', label: '深色' },
        ]"
        label="深浅"
        @update:model-value="
          (value) => {
            if (value === 'light' || value === 'dark') mode = value;
          }
        "
      />
      <v-text-field
        v-model="query"
        label="搜索"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        class="search-field"
      />
    </template>

    <ThemeLineage
      :pack-id="packId"
      :theme-name="themeName"
      :mode="mode"
      class="lineage-banner"
    />

    <section
      class="token-section"
      aria-labelledby="token-list-title"
      :style="previewCssVars"
    >
      <div class="section-heading compact-heading">
        <div>
          <p class="section-kicker">Token 列表</p>
          <h2 id="token-list-title">
            {{ tokenListTitle }}
          </h2>
        </div>
        <span>{{ tokens.length }} 项 · {{ themeLabel }}</span>
      </div>

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
              <code>{{ readableId(token.id) }}</code>
            </button>
          </div>
        </div>
      </template>

      <template v-else>
        <div
          v-for="group in cardGroups"
          :key="group.id"
          class="token-group"
        >
          <h3 v-if="group.label" class="group-title">{{ group.label }}</h3>
          <p v-if="group.note" class="group-note">{{ group.note }}</p>
          <div class="token-grid">
        <button
          v-for="token in group.tokens"
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
              v-else-if="category === 'motion' && isTimingToken(token.id)"
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
              :style="{ font: String(resolved[token.id] ?? '') }"
            >
              Aa
            </p>

            <div v-else-if="category === 'layout'" class="preview-frame">
              <div class="layout-track">
                <span
                  class="layout-fill"
                  :style="{ width: layoutWidth(token.id) }"
                />
              </div>
            </div>

            <div v-else-if="category === 'layer'" class="preview-frame layer-stack">
              <span class="layer-plane is-back" />
              <span class="layer-plane">{{ formatValue(token.id) }}</span>
            </div>

            <div v-else-if="category === 'effect'" class="preview-frame">
              <div
                v-if="token.id.includes('glass') || token.id.includes('backdrop')"
                class="glass-sample"
                :style="{ backdropFilter: String(rawValue(token.id) ?? 'none') }"
              />
              <img
                v-else-if="isAssetToken(token.id) && String(rawValue(token.id) ?? '').startsWith('/')"
                class="asset-sample"
                :src="String(rawValue(token.id))"
                alt=""
              />
              <div v-else class="enum-sample">{{ formatValue(token.id) }}</div>
            </div>

            <div v-else-if="category === 'motion'" class="enum-sample">
              {{ formatValue(token.id) }}
            </div>

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
                category === 'motion' ||
                category === 'layout' ||
                category === 'layer' ||
                category === 'effect'
              "
              class="value-chip"
              >{{ formatValue(token.id) }}</span
            >
            <small
              v-if="category === 'border' && isBorderWidthToken(token.id)"
              class="token-kind-note"
              >仅宽度 · 需与线型、颜色组合</small
            >
            <code>{{ readableId(token.id) }}</code>
          </button>
            </div>
          </div>
      </template>

      <p v-if="tokens.length === 0" class="empty">没有匹配的 Token。</p>
    </section>

    <template #aside>
      <div v-if="selected" class="token-aside" aria-live="polite">
        <p class="aside-label">当前选择 · {{ themeLabel }}</p>
        <h2>{{ selected.label }}</h2>
        <p class="aside-desc">{{ selected.description || "暂无用途说明" }}</p>

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
            <div>
              <dt>来源</dt>
              <dd>
                {{
                  activeTable.provenance[selected.id]?.inherited
                    ? "沿用基础值"
                    : (activeTable.provenance[selected.id]?.sourcePackId ?? "—")
                }}
              </dd>
            </div>
          </dl>
        </div>
        <details class="token-details">
          <summary>技术细节</summary>
          <dl class="detail-list">
            <div>
              <dt>CSS</dt>
              <dd>
                <code>{{ tokenCssVar(selected) }}</code>
              </dd>
            </div>
            <div>
              <dt>引用链</dt>
              <dd>
                <code>{{
                  activeTable.provenance[selected.id]?.chain.join(" → ") || "—"
                }}</code>
              </dd>
            </div>
          </dl>
        </details>
        <details v-if="diagnostics.length" class="token-diagnostics">
          <summary>{{ diagnostics.length }} 条包级对比度说明</summary>
          <ul>
            <li v-for="item in diagnostics" :key="`${item.code}-${item.key ?? ''}-${item.mode ?? ''}`">
              {{ item.message }}
            </li>
          </ul>
        </details>
      </div>
      <p v-else class="empty">选择一个 Token 查看详情。</p>
    </template>
  </ResourcePageShell>
</template>

<style scoped>
.lineage-banner {
  margin-bottom: 16px;
}
.search-field {
  flex: 1 1 220px;
  max-width: 320px;
}
.pack-field {
  flex: 0 0 188px;
  width: 188px;
}
.token-diagnostics {
  margin: 16px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.72rem;
}
.token-diagnostics summary {
  cursor: pointer;
  font-weight: 650;
}
.token-diagnostics ul {
  margin: 8px 0 0;
  padding-left: 18px;
}
.group-note {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
}
.token-card code {
  line-height: 1.35;
}
.compare-note {
  color: rgb(var(--v-theme-primary));
  font-size: 0.68rem;
}
.layout-track {
  width: 100%;
  height: 16px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  overflow: hidden;
}
.layout-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: rgb(var(--v-theme-primary));
}
.layer-stack {
  position: relative;
  height: 56px;
}
.layer-plane {
  position: absolute;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.75rem;
}
.layer-plane.is-back {
  inset: 8px 18px 0 0;
  background: rgba(var(--v-theme-primary), 0.16);
}
.layer-plane:not(.is-back) {
  inset: 0 0 8px 18px;
}
.glass-sample {
  width: 100%;
  height: 44px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.2);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.asset-sample {
  width: 44px;
  height: 44px;
  object-fit: contain;
}
.enum-sample {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-size: 0.84rem;
  font-weight: 700;
}
.toolbar-actions {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
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
  word-break: normal;
  overflow-wrap: break-word;
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

/* Batch 1 additions */
.lineage-banner {
  margin-bottom: 16px;
}
.token-details {
  margin: 12px 0 0;
  padding: 10px 0 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.token-details summary {
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 650;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.detail-list {
  margin: 8px 0 0;
  display: grid;
  gap: 8px;
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
  font-size: 0.75rem;
  word-break: break-word;
}
</style>
