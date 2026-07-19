<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useSelectionStore } from "@/app/stores/selection";
import type { ElementSummary, StyleInspectRow } from "@/runtime/bridge";

const selection = useSelectionStore();
const route = useRoute();
const tab = ref<"overview" | "component" | "convention" | "styles" | "comments">(
  "overview",
);

const selected = computed(() => selection.selected);
const element = computed(() => selected.value?.element ?? null);

const screenLabel = computed(() => {
  const slug = String(route.params.screenSlug ?? "");
  const variant =
    typeof route.query.variant === "string" ? route.query.variant : "";
  return [slug, variant].filter(Boolean).join(" · ") || "—";
});

const sizeLabel = computed(() => {
  const box = element.value?.bbox;
  if (!box) return "—";
  return `${Math.round(box.width)} × ${Math.round(box.height)}`;
});

const conventionHints = computed(() => {
  const el = element.value;
  if (!el) return [] as Array<{ tone: "ok" | "warn"; text: string }>;
  const hints: Array<{ tone: "ok" | "warn"; text: string }> = [];
  const classes = el.classes.join(" ");
  if (/\blist\b/i.test(classes) && !el.pbRole) {
    hints.push({
      tone: "warn",
      text: "看起来像列表，建议补上 data-pb-role=\"list\"",
    });
  }
  if (/\b(app-bar|navbar|toolbar)\b/i.test(classes) && el.pbRole !== "app-bar") {
    hints.push({
      tone: "warn",
      text: "顶栏建议使用 data-pb-role=\"app-bar\"",
    });
  }
  if (/\b(section|card|panel)\b/i.test(classes) && !el.pbRole) {
    hints.push({
      tone: "warn",
      text: "区块建议补 data-pb-role=\"section\"",
    });
  }
  if (/\bsheet\b/i.test(classes) && !el.pbShell) {
    hints.push({
      tone: "warn",
      text: "弹层建议补 data-pb-shell=\"sheet\"",
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
const hasComponentMeta = computed(
  () =>
    Boolean(
      selected.value?.componentId ||
        selected.value?.props ||
        selected.value?.state ||
        tokenBindings.value.length,
    ),
);

function formatRef(
  ref: ElementSummary["ref"] | ElementSummary["semanticParent"],
) {
  if (!ref) return "—";
  if (ref.pbId) return ref.pbId;
  if (ref.handle) return ref.handle;
  return "—";
}

function stylePrimary(row: StyleInspectRow): string {
  return row.tokenId ?? row.cssVar ?? "—";
}

function styleSecondary(row: StyleInspectRow): string {
  if (row.tokenId && row.cssVar) return row.cssVar;
  return "";
}
</script>

<template>
  <div class="inspector" data-testid="inspector-body">
    <div v-if="!selected" class="empty">
      <div class="empty-badge">元素检查</div>
      <p class="empty-title">还没有选中节点</p>
      <p class="empty-hint">
        在画布工具栏打开「选择元素」，然后在手机预览里点击即可。
      </p>
      <p v-if="selection.handshakeTimedOut" class="empty-warn">
        Runtime 握手超时，请刷新预览。
      </p>
      <p v-if="selection.lastError" class="empty-warn">
        {{ selection.lastError }}
      </p>
    </div>

    <template v-else>
      <header class="hero">
        <div class="hero-tag">
          <code>&lt;{{ element?.tag }}&gt;</code>
        </div>
        <div class="hero-meta">
          <span>{{ sizeLabel }}</span>
          <span class="dot" aria-hidden="true" />
          <span>{{ screenLabel }}</span>
        </div>
        <p v-if="element?.text" class="hero-text">{{ element.text }}</p>
      </header>

      <div class="tab-bar" role="tablist" aria-label="元素检查分组">
        <button
          v-for="item in [
            { id: 'overview', label: '概览' },
            { id: 'component', label: '组件' },
            { id: 'convention', label: '约定' },
            { id: 'styles', label: '样式' },
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
            <span class="label">位置</span>
            <span class="value" v-if="element?.bbox">
              {{ Math.round(element.bbox.x) }},
              {{ Math.round(element.bbox.y) }}
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
            <pre class="code-block">{{
              JSON.stringify(selected.props ?? {}, null, 2)
            }}</pre>

            <h3 class="block-title">State</h3>
            <pre class="code-block">{{
              JSON.stringify(selected.state ?? {}, null, 2)
            }}</pre>

            <template v-if="tokenBindings.length">
              <h3 class="block-title">Token 绑定</h3>
              <ul class="binding-list">
                <li v-for="row in tokenBindings" :key="row.slot">
                  <span class="slot">{{ row.slot }}</span>
                  <div class="binding-keys">
                    <code class="token-id">{{ row.tokenId }}</code>
                    <code class="css-var">{{ row.cssVar }}</code>
                  </div>
                </li>
              </ul>
            </template>
          </template>
          <div v-else class="soft-empty">
            <p class="soft-title">普通 DOM 节点</p>
            <p class="soft-hint">
              尚未通过 usePbInspect 登记，因此没有 Props / Token 绑定。样式 Tab
              仍可查看计算值与可能匹配的 Token。
            </p>
          </div>
        </section>

        <section v-else-if="tab === 'convention'" class="section">
          <p class="note">以下为 PBWork 源码约定提示，不是 PB Core 推断结果。</p>
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
          <p class="note">
            优先显示跨端 Token ID 与 CSS 变量名；右侧为当前解析值。
          </p>
          <ul class="style-list">
            <li v-for="row in styleRows" :key="row.property">
              <div class="style-prop">{{ row.property }}</div>
              <div class="style-body">
                <code class="token-id">{{ stylePrimary(row) }}</code>
                <code v-if="styleSecondary(row)" class="css-var">{{
                  styleSecondary(row)
                }}</code>
                <span class="style-value">{{ row.value || "—" }}</span>
              </div>
            </li>
          </ul>
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
  gap: 12px;
  min-height: 0;
  height: 100%;
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

.hero {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent);
  border: 1px solid
    color-mix(in srgb, rgb(var(--v-theme-primary)) 18%, transparent);
}

.hero-tag code {
  font-size: 0.8125rem;
  font-weight: 700;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.75rem;
}

.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
}

.hero-text {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.8125rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tab-bar {
  display: flex;
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

.code-block {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.6875rem;
  overflow: auto;
  max-height: 180px;
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
  gap: 8px;
}

.binding-list li {
  display: grid;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.slot {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.binding-keys {
  display: grid;
  gap: 2px;
}

.token-id {
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}

.css-var {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.6875rem;
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

.style-list li {
  display: grid;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.style-prop {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.style-body {
  display: grid;
  gap: 2px;
}

.style-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.78);
  word-break: break-word;
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
