<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ChevronDown, ChevronRight, Copy } from "lucide-vue-next";
import { useSelectionStore } from "@/app/stores/selection";
import type {
  ElementSummary,
  JsonRecord,
  StyleInspectGroup,
  StyleInspectRow,
} from "@/runtime/bridge";
import { stylePropertyRole } from "@/runtime/inspect/snapshot";

const selection = useSelectionStore();
const tab = ref<
  "overview" | "component" | "convention" | "styles" | "comments"
>("styles");
const styleMode = ref<"tokens" | "all">("tokens");
const expandedJsonKeys = ref<Set<string>>(new Set());

const selected = computed(() => selection.selected);
const element = computed(() => selected.value?.element ?? null);

watch(
  () => selected.value?.element?.ref.handle ?? selected.value?.element?.ref.pbId,
  (id, prev) => {
    if (id && id !== prev) {
      tab.value = "styles";
      expandedJsonKeys.value = new Set();
    }
  },
);

const conventionHints = computed(() => {
  const el = element.value;
  if (!el) return [] as Array<{ tone: "ok" | "warn"; text: string }>;
  const hints: Array<{ tone: "ok" | "warn"; text: string }> = [];
  const classes = el.classes.join(" ");
  if (/\blist\b/i.test(classes) && !el.pbRole) {
    hints.push({
      tone: "warn",
      text: '看起来像列表，建议补上 data-pb-role="list"',
    });
  }
  if (
    /\b(app-bar|navbar|toolbar)\b/i.test(classes) &&
    el.pbRole !== "app-bar"
  ) {
    hints.push({
      tone: "warn",
      text: '顶栏建议使用 data-pb-role="app-bar"',
    });
  }
  if (/\b(section|card|panel)\b/i.test(classes) && !el.pbRole) {
    hints.push({
      tone: "warn",
      text: '区块建议补 data-pb-role="section"',
    });
  }
  if (/\bsheet\b/i.test(classes) && !el.pbShell) {
    hints.push({
      tone: "warn",
      text: '弹层建议补 data-pb-shell="sheet"',
    });
  }
  if (!el.ref.pbId) {
    hints.push({
      tone: "warn",
      text: "可加稳定 data-pb-id，便于高亮与评论定位",
    });
  }
  if (hints.length === 0) {
    hints.push({ tone: "ok", text: "标记齐全，暂无约定缺口" });
  }
  return hints;
});

const styleRows = computed(() => selected.value?.styles ?? []);
const tokenBindings = computed(() => selected.value?.tokenBindings ?? []);
const hasComponentMeta = computed(() =>
  Boolean(
    selected.value?.componentId ||
      selected.value?.props ||
      selected.value?.state ||
      tokenBindings.value.length,
  ),
);

type KvRow = {
  key: string;
  display: string;
  complex: boolean;
  json?: string;
};

function recordToRows(record: JsonRecord | undefined): KvRow[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => {
    const complex =
      value !== null &&
      typeof value === "object" &&
      !(typeof value === "string");
    if (complex) {
      return {
        key,
        display: Array.isArray(value)
          ? `Array(${value.length})`
          : `Object(${Object.keys(value as object).length})`,
        complex: true,
        json: JSON.stringify(value, null, 2),
      };
    }
    if (value === undefined) {
      return { key, display: "undefined", complex: false };
    }
    return { key, display: String(value), complex: false };
  });
}

const propRows = computed(() => recordToRows(selected.value?.props));
const stateRows = computed(() => recordToRows(selected.value?.state));

function toggleJson(scope: string, key: string) {
  const id = `${scope}:${key}`;
  const next = new Set(expandedJsonKeys.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedJsonKeys.value = next;
}

function isJsonOpen(scope: string, key: string): boolean {
  return expandedJsonKeys.value.has(`${scope}:${key}`);
}

function formatRef(
  ref: ElementSummary["ref"] | ElementSummary["semanticParent"],
) {
  if (!ref) return "—";
  if (ref.pbId) return ref.pbId;
  if (ref.handle) return ref.handle;
  return "—";
}

const styleGroupDefinitions: Array<{
  id: StyleInspectGroup;
  label: string;
}> = [
  { id: "color", label: "颜色" },
  { id: "typography", label: "字体" },
  { id: "spacing-size", label: "间距与尺寸" },
  { id: "border-radius", label: "边框与圆角" },
  { id: "shadow-layout", label: "阴影与布局" },
];

const groupedStyleRows = computed(() =>
  styleGroupDefinitions
    .map((group) => ({
      ...group,
      rows: styleRows.value.filter(
        (row) =>
          row.group === group.id &&
          (styleMode.value === "all" ||
            Boolean(row.tokenId) ||
            row.source === "inherited" ||
            isTransparentBackgroundRow(row)),
      ),
    }))
    .filter((group) => group.rows.length > 0),
);

function isTransparentBackgroundRow(row: StyleInspectRow): boolean {
  if (row.property !== "background-color") return false;
  const value = row.value.trim().toLowerCase();
  return (
    value === "transparent" ||
    value === "rgba(0, 0, 0, 0)" ||
    value === "rgba(0,0,0,0)"
  );
}

function styleSourceLabel(source: StyleInspectRow["source"]): string {
  if (source === "binding") return "显式绑定";
  if (source === "value-match") return "值匹配推断";
  if (source === "inherited") return "有效背景（祖先）";
  return "原始 CSS";
}

function styleDisplayValue(row: StyleInspectRow): string {
  if (row.source === "inherited" && row.effectiveValue) {
    return row.effectiveValue;
  }
  return row.value || "—";
}

function inheritedFromLabel(row: StyleInspectRow): string {
  const from = row.inheritedFrom;
  if (!from) return "";
  if (from.pbId) return from.pbId;
  return `<${from.tag}>`;
}

function bindingValue(tokenId: string): string {
  return styleRows.value.find((row) => row.tokenId === tokenId)?.value ?? "—";
}

function isColorProperty(property: string): boolean {
  return (
    property === "color" ||
    property === "background-color" ||
    property === "border-color"
  );
}

async function copyText(value: string) {
  if (!value || value === "—") return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Clipboard access can be unavailable in embedded or insecure contexts.
  }
}
</script>

<template>
  <div class="inspector" data-testid="inspector-body">
    <div v-if="!selected" class="empty">
      <div class="empty-badge">元素检查</div>
      <p class="empty-title">还没有选中节点</p>
      <p class="empty-hint">
        在画布工具栏打开「选择元素」，然后在手机预览里点击即可。按住
        ⌥/Alt 点击可选中语义父级；选中后按 ↑ 继续上溯。
      </p>
      <p v-if="selection.handshakeTimedOut" class="empty-warn">
        Runtime 握手超时，请刷新预览。
      </p>
      <p v-if="selection.lastError" class="empty-warn">
        {{ selection.lastError }}
      </p>
    </div>

    <template v-else>
      <div class="tab-bar" role="tablist" aria-label="元素检查分组">
        <button
          v-for="item in [
            { id: 'styles', label: '样式' },
            { id: 'component', label: '组件' },
            { id: 'overview', label: '结构' },
            { id: 'convention', label: '约定' },
            { id: 'comments', label: '评论' },
          ]"
          :key="item.id"
          type="button"
          role="tab"
          class="tab"
          :class="{ 'is-active': tab === item.id }"
          :aria-selected="tab === item.id"
          @click="tab = item.id as typeof tab"
        >
          {{ item.label }}
        </button>
      </div>

      <div class="pane">
        <section v-if="tab === 'overview'" class="section">
          <div class="field">
            <span class="label">标签</span>
            <span class="value mono">&lt;{{ element?.tag }}&gt;</span>
          </div>
          <div class="field">
            <span class="label">Class</span>
            <span class="value wrap">{{
              element?.classes.join(" ") || "—"
            }}</span>
          </div>
          <div class="field">
            <span class="label">路径</span>
            <span class="value mono wrap">{{ element?.domPath || "—" }}</span>
          </div>
          <div class="field">
            <span class="label">引用</span>
            <span class="value mono">{{ formatRef(element?.ref) }}</span>
          </div>
          <div class="field">
            <span class="label">尺寸</span>
            <span class="value" v-if="element?.bbox">
              {{ Math.round(element.bbox.width) }} ×
              {{ Math.round(element.bbox.height) }}
            </span>
            <span v-else class="value">—</span>
          </div>
        </section>

        <section v-else-if="tab === 'component'" class="section">
          <template v-if="hasComponentMeta">
            <div class="field">
              <span class="label">组件</span>
              <span class="value">{{ selected.componentId || "—" }}</span>
            </div>
            <div class="field">
              <span class="label">语义父级</span>
              <span class="value mono">{{
                formatRef(element?.semanticParent)
              }}</span>
            </div>

            <h3 class="block-title">Props</h3>
            <div v-if="propRows.length" class="kv-table" role="table">
              <div
                v-for="row in propRows"
                :key="`prop-${row.key}`"
                class="kv-row"
                role="row"
              >
                <div class="kv-head" role="rowheader">
                  <code class="kv-key">{{ row.key }}</code>
                  <button
                    v-if="row.complex"
                    type="button"
                    class="json-toggle"
                    :aria-expanded="isJsonOpen('props', row.key)"
                    @click="toggleJson('props', row.key)"
                  >
                    <ChevronDown
                      v-if="isJsonOpen('props', row.key)"
                      :size="14"
                      aria-hidden="true"
                    />
                    <ChevronRight v-else :size="14" aria-hidden="true" />
                    <span>{{ row.display }}</span>
                  </button>
                  <span v-else class="kv-value">{{ row.display }}</span>
                </div>
                <pre
                  v-if="row.complex && isJsonOpen('props', row.key)"
                  class="code-block"
                  >{{ row.json }}</pre
                >
              </div>
            </div>
            <p v-else class="soft-inline">无 Props</p>

            <h3 class="block-title">State</h3>
            <div v-if="stateRows.length" class="kv-table" role="table">
              <div
                v-for="row in stateRows"
                :key="`state-${row.key}`"
                class="kv-row"
                role="row"
              >
                <div class="kv-head" role="rowheader">
                  <code class="kv-key">{{ row.key }}</code>
                  <button
                    v-if="row.complex"
                    type="button"
                    class="json-toggle"
                    :aria-expanded="isJsonOpen('state', row.key)"
                    @click="toggleJson('state', row.key)"
                  >
                    <ChevronDown
                      v-if="isJsonOpen('state', row.key)"
                      :size="14"
                      aria-hidden="true"
                    />
                    <ChevronRight v-else :size="14" aria-hidden="true" />
                    <span>{{ row.display }}</span>
                  </button>
                  <span v-else class="kv-value">{{ row.display }}</span>
                </div>
                <pre
                  v-if="row.complex && isJsonOpen('state', row.key)"
                  class="code-block"
                  >{{ row.json }}</pre
                >
              </div>
            </div>
            <p v-else class="soft-inline">无 State</p>

            <template v-if="tokenBindings.length">
              <h3 class="block-title">Token 绑定</h3>
              <ul class="binding-list">
                <li v-for="row in tokenBindings" :key="row.slot">
                  <span class="slot">{{ row.slot }}</span>
                  <div class="copy-line">
                    <code class="token-id">{{ row.tokenId }}</code>
                    <button
                      type="button"
                      class="copy-btn"
                      aria-label="复制 Token ID"
                      @click="copyText(row.tokenId)"
                    >
                      <Copy :size="13" aria-hidden="true" />
                    </button>
                  </div>
                  <code class="binding-value">{{
                    bindingValue(row.tokenId)
                  }}</code>
                </li>
              </ul>
            </template>
          </template>
          <div v-else class="soft-empty">
            <p class="soft-title">普通 DOM 节点</p>
            <p class="soft-hint">
              尚未通过 usePbInspect 登记，因此没有 Props / Token 绑定。
            </p>
          </div>
        </section>

        <section v-else-if="tab === 'convention'" class="section">
          <p class="note">
            以下为 PBWork 源码约定提示，不是 PB Core 推断结果。
          </p>
          <div class="field">
            <span class="label">data-pb-id</span>
            <span class="value mono">{{ element?.ref.pbId || "—" }}</span>
          </div>
          <div class="field">
            <span class="label">data-pb-role</span>
            <span class="value mono">{{ element?.pbRole || "—" }}</span>
          </div>
          <div class="field">
            <span class="label">data-pb-shell</span>
            <span class="value mono">{{ element?.pbShell || "—" }}</span>
          </div>
          <h3 class="block-title">提示</h3>
          <ul class="hint-list">
            <li
              v-for="(hint, idx) in conventionHints"
              :key="idx"
              :class="hint.tone === 'ok' ? 'is-ok' : 'is-warn'"
            >
              {{ hint.text }}
            </li>
          </ul>
        </section>

        <section v-else-if="tab === 'styles'" class="section">
          <div class="style-toolbar">
            <strong>Token 映射</strong>
            <div class="style-mode" role="group" aria-label="样式显示范围">
              <button
                type="button"
                :class="{ 'is-active': styleMode === 'tokens' }"
                @click="styleMode = 'tokens'"
              >
                Token
              </button>
              <button
                type="button"
                :class="{ 'is-active': styleMode === 'all' }"
                @click="styleMode = 'all'"
              >
                全部
              </button>
            </div>
          </div>

          <div
            v-for="group in groupedStyleRows"
            :key="group.id"
            class="style-group"
          >
            <h3>{{ group.label }}</h3>
            <ul class="style-list">
              <li
                v-for="row in group.rows"
                :key="row.property"
                class="style-row"
              >
                <div class="style-main">
                  <div class="token-line">
                    <span class="style-role">{{
                      stylePropertyRole(row.property)
                    }}</span>
                    <code v-if="row.tokenId" class="token-id">{{
                      row.tokenId
                    }}</code>
                    <code v-else class="style-prop">{{ row.property }}</code>
                    <button
                      v-if="row.tokenId"
                      type="button"
                      class="copy-btn"
                      aria-label="复制 Token ID"
                      @click="copyText(row.tokenId!)"
                    >
                      <Copy :size="13" aria-hidden="true" />
                    </button>
                  </div>
                  <div class="value-line">
                    <i
                      v-if="isColorProperty(row.property)"
                      class="value-swatch"
                      :style="{ background: styleDisplayValue(row) }"
                      aria-hidden="true"
                    />
                    <code class="style-value">{{
                      styleDisplayValue(row)
                    }}</code>
                    <button
                      type="button"
                      class="copy-btn"
                      aria-label="复制 Value"
                      @click="copyText(styleDisplayValue(row))"
                    >
                      <Copy :size="13" aria-hidden="true" />
                    </button>
                  </div>
                  <p
                    v-if="row.source === 'inherited' && row.inheritedFrom"
                    class="inherited-note"
                  >
                    自身透明 · 来自 {{ inheritedFromLabel(row) }}
                  </p>
                  <p
                    v-else-if="isTransparentBackgroundRow(row)"
                    class="inherited-note"
                  >
                    透明（无 token）
                  </p>
                </div>
                <div class="style-meta">
                  <span class="source-badge" :class="`is-${row.source}`">{{
                    styleSourceLabel(row.source)
                  }}</span>
                  <code v-if="row.cssVar" class="css-var">{{ row.cssVar }}</code>
                </div>
              </li>
            </ul>
          </div>

          <div v-if="groupedStyleRows.length === 0" class="soft-empty">
            <p class="soft-title">没有匹配到 Token</p>
            <p class="soft-hint">切换到“全部”查看该元素的原始计算样式。</p>
          </div>
        </section>

        <section v-else class="section">
          <div class="soft-empty">
            <p class="soft-title">评论即将到来</p>
            <p class="soft-hint">M5 会支持在选中元素上落点、持久化与定位。</p>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.inspector {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.empty {
  display: grid;
  gap: 8px;
  place-content: center;
  min-height: 220px;
  padding: 20px 16px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.empty-badge {
  justify-self: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent);
  color: rgb(var(--v-theme-primary));
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.empty-title {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.92);
  font-size: 0.9375rem;
  font-weight: 700;
}

.empty-hint,
.empty-warn {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.empty-warn {
  color: rgb(var(--v-theme-error));
}

.tab-bar {
  display: flex;
  flex: 0 0 auto;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  overflow-x: auto;
}

.tab {
  flex: 1 0 auto;
  min-width: 0;
  padding: 7px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.tab.is-active {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.pane {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-bottom: 8px;
}

.section {
  display: grid;
  gap: 10px;
}

.field {
  display: grid;
  gap: 3px;
}

.label {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.value {
  font-size: 0.8125rem;
  word-break: break-word;
}

.value.wrap,
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
}

.block-title {
  margin: 6px 0 0;
  font-size: 0.75rem;
  font-weight: 700;
}

.kv-table {
  display: grid;
  gap: 6px;
}

.kv-row {
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.kv-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.kv-key {
  flex: 0 1 auto;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
  font-weight: 700;
}

.kv-value {
  flex: 1;
  text-align: right;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  word-break: break-word;
}

.json-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.code-block {
  margin: 8px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.6875rem;
  overflow: auto;
  max-height: 180px;
}

.soft-inline {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.75rem;
}

.note {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
  line-height: 1.45;
}

.binding-list,
.hint-list,
.style-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.binding-list li {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.slot {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.token-id {
  color: rgb(var(--v-theme-primary));
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8125rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.css-var {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6875rem;
  overflow-wrap: anywhere;
}

.binding-value {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  font-weight: 600;
}

.hint-list li {
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.hint-list .is-ok {
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 12%, transparent);
  color: rgb(var(--v-theme-success));
}

.hint-list .is-warn {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 14%, transparent);
  color: rgb(var(--v-theme-warning));
}

.style-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.style-toolbar strong {
  font-size: 0.8125rem;
}

.style-mode {
  display: inline-flex;
  padding: 2px;
  border-radius: 7px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.style-mode button {
  min-width: 44px;
  height: 26px;
  padding: 0 8px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.6875rem;
  font-weight: 700;
  cursor: pointer;
}

.style-mode button.is-active {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

.style-group {
  display: grid;
  gap: 6px;
}

.style-group h3 {
  margin: 2px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.6875rem;
  font-weight: 800;
  text-transform: uppercase;
}

.style-row {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.style-main {
  display: grid;
  gap: 4px;
}

.token-line,
.value-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.style-role {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.6875rem;
  font-weight: 700;
}

.token-line code,
.value-line code {
  min-width: 0;
  flex: 1;
}

.style-prop {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.75rem;
  font-weight: 600;
}

.style-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8125rem;
  font-weight: 700;
  word-break: break-word;
}

.style-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.source-badge {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.625rem;
  font-weight: 700;
}

.source-badge.is-binding {
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 14%, transparent);
  color: rgb(var(--v-theme-success));
}

.source-badge.is-value-match {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 14%, transparent);
  color: rgb(var(--v-theme-warning));
}

.source-badge.is-inherited {
  background: color-mix(in srgb, rgb(var(--v-theme-info)) 14%, transparent);
  color: rgb(var(--v-theme-info));
}

.inherited-note {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.6875rem;
  line-height: 1.35;
}

.copy-line {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.copy-btn {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.45);
  cursor: pointer;
}

.copy-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}

.value-swatch {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 3px;
}

.soft-empty {
  display: grid;
  gap: 6px;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.soft-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
}

.soft-hint {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.8125rem;
  line-height: 1.45;
}
</style>
