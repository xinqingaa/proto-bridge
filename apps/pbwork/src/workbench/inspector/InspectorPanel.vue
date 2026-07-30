<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  LocateFixed,
  MessageSquarePlus,
  MoreHorizontal,
  RotateCcw,
} from "lucide-vue-next";
import { useSelectionStore } from "@/app/stores/selection";
import { useCaptureStore } from "@/app/stores/capture";
import { useCanvasStore } from "@/app/stores/canvas";
import {
  COMMENT_MAX_LENGTH,
  useCommentsStore,
  type CommentTarget,
  type LocalComment,
} from "@/app/stores/comments";
import { loadPrototypeScreens } from "@/design-system/loaders";
import type {
  ElementSummary,
  JsonRecord,
  StyleInspectGroup,
  StyleInspectRow,
} from "@/runtime/bridge";
import { stylePropertyRole } from "@/runtime/inspect/snapshot";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";
import WorkbenchSegmented from "@/workbench/ui/WorkbenchSegmented.vue";

const selection = useSelectionStore();
const capture = useCaptureStore();
const canvas = useCanvasStore();
const comments = useCommentsStore();
const route = useRoute();
const tab = ref<
  "overview" | "component" | "convention" | "styles" | "comments"
>("styles");
const styleMode = ref<"tokens" | "all">("tokens");
const expandedJsonKeys = ref<Set<string>>(new Set());
const commentDraft = ref("");
const commentError = ref<string | null>(null);
const commentScope = ref<"screen" | "context">("screen");
const commentStatus = ref<"all" | "open" | "resolved">("open");
const editingCommentId = ref<string | null>(null);
const deleteCommentId = ref<string | null>(null);
const clearDialogOpen = ref(false);
const locatingCommentId = ref<string | null>(null);
const manageComments = ref(false);
const selectedCommentIds = ref<Set<string>>(new Set());
const batchDeleteOpen = ref(false);
const commentAnchorFilter = ref<"all" | "missing">("all");
const visibleCommentLimit = ref(30);
const expandedCommentIds = ref<Set<string>>(new Set());

const selected = computed(() => selection.selected);
const element = computed(() => selected.value?.element ?? null);
const captureElementRef = computed(() => {
  const current = element.value;
  if (current?.ref.pbId) return current.ref;
  if (current?.semanticParent?.pbId) return current.semanticParent;
  return null;
});
const captureUsesSemanticParent = computed(() =>
  Boolean(captureElementRef.value && !element.value?.ref.pbId),
);
const currentScreen = computed(() =>
  loadPrototypeScreens().find(
    (item) =>
      item.prototypeId === String(route.params.prototypeId ?? "") &&
      item.screenSlug === String(route.params.screenSlug ?? ""),
  ),
);
const commentContext = computed(() => {
  const screen = currentScreen.value;
  if (!screen) return null;
  return {
    prototypeId: screen.prototypeId,
    screenId: screen.screenId,
    screenSlug: screen.screenSlug,
    ...(typeof route.query.variant === "string"
      ? { variantId: route.query.variant }
      : {}),
    ...(typeof route.query.theme === "string"
      ? { themeId: route.query.theme }
      : {}),
  };
});
const currentCommentTarget = computed((): CommentTarget | null => {
  const target = selection.commentTarget;
  if (target) {
    return {
      ...(target.element?.ref.pbId
        ? { elementId: target.element.ref.pbId }
        : {}),
      ...(target.element?.ref.pbKey
        ? { elementKey: target.element.ref.pbKey }
        : {}),
      ...(target.selector ? { selector: target.selector } : {}),
      ...(target.element
        ? {
            elementLabel: elementDisplayLabel(target.element),
            ...(target.element.text
              ? { textSnapshot: target.element.text.slice(0, 160) }
              : {}),
          }
        : {}),
      point: target.point,
      ...(target.bbox ? { bbox: target.bbox } : {}),
    };
  }
  const el = element.value;
  if (!el) return null;
  return {
    ...(el.ref.pbId ? { elementId: el.ref.pbId } : {}),
    ...(el.ref.pbKey ? { elementKey: el.ref.pbKey } : {}),
    ...(el.ref.selector ? { selector: el.ref.selector } : {}),
    elementLabel: elementDisplayLabel(el),
    ...(el.text ? { textSnapshot: el.text.slice(0, 160) } : {}),
    ...(el.bbox
      ? {
          point: {
            x: el.bbox.x + el.bbox.width / 2,
            y: el.bbox.y + el.bbox.height / 2,
          },
          bbox: el.bbox,
        }
      : {}),
  };
});

function elementDisplayLabel(summary: ElementSummary): string {
  const text = summary.text?.replace(/\s+/g, " ").trim();
  if (text) return text.length > 42 ? `${text.slice(0, 42)}…` : text;
  if (summary.pbRole) return summary.pbRole;
  return `<${summary.tag}>`;
}

function addSelectedFragmentToCapture() {
  const screen = currentScreen.value;
  const ref = captureElementRef.value;
  if (!screen || !ref?.pbId) {
    return;
  }
  const accepted = capture.beginFragment({
    prototypeId: screen.prototypeId,
    screenId: screen.screenId,
    variantId:
      typeof route.query.variant === "string"
        ? route.query.variant
        : screen.defaultVariantId,
    themeId:
      typeof route.query.theme === "string" ? route.query.theme : "light",
    deviceId: canvas.deviceId,
    returnTo: route.fullPath,
    fragment: {
      screenId: screen.screenId,
      pbId: ref.pbId,
      ...(ref.pbKey ? { pbKey: ref.pbKey } : {}),
    },
  });
  if (accepted) {
    capture.openComposer();
  }
}

function commentTitle(item: LocalComment): string {
  return item.elementLabel || item.textSnapshot || item.elementId || "页面位置";
}

const visibleComments = computed(() => {
  const context = commentContext.value;
  if (!context) return [];
  return comments.comments.filter((item) => {
    if (
      item.prototypeId !== context.prototypeId ||
      item.screenId !== context.screenId
    )
      return false;
    if (commentScope.value === "context") {
      if (item.variantId && item.variantId !== context.variantId) return false;
      if (item.themeId && item.themeId !== context.themeId) return false;
    }
    if (
      commentAnchorFilter.value === "missing" &&
      item.anchorStatus !== "missing"
    )
      return false;
    return commentStatus.value === "all" || item.status === commentStatus.value;
  });
});
const displayedComments = computed(() =>
  visibleComments.value.slice(0, visibleCommentLimit.value),
);
const openComments = computed(() =>
  displayedComments.value.filter((item) => item.status === "open"),
);
const resolvedComments = computed(() =>
  displayedComments.value.filter((item) => item.status === "resolved"),
);
const hasMoreComments = computed(
  () => displayedComments.value.length < visibleComments.value.length,
);

watch([commentScope, commentStatus, commentAnchorFilter], () => {
  visibleCommentLimit.value = 30;
  selectedCommentIds.value = new Set();
});

watch(
  () => selection.commentTarget,
  (target) => {
    if (!target) return;
    tab.value = "comments";
    commentDraft.value = "";
    commentError.value = null;
  },
);

watch(
  () =>
    selected.value?.element?.ref.handle ?? selected.value?.element?.ref.pbId,
  (id, prev) => {
    if (id && id !== prev) {
      if (tab.value !== "comments") tab.value = "styles";
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

function saveComment() {
  const context = commentContext.value;
  const target = currentCommentTarget.value;
  if (!context) {
    commentError.value = "当前页面信息不可用，请刷新后重试。";
    return;
  }
  if (!editingCommentId.value && !target) {
    commentError.value = "请先在手机预览中选择元素或页面位置。";
    return;
  }
  try {
    if (editingCommentId.value) {
      comments.edit(editingCommentId.value, commentDraft.value);
    } else {
      comments.add(context, target!, commentDraft.value);
    }
    commentDraft.value = "";
    editingCommentId.value = null;
    selection.setCommentTarget(null);
    commentError.value = null;
  } catch (error) {
    commentError.value =
      error instanceof Error ? error.message : "评论保存失败";
  }
}

function editComment(id: string) {
  const item = comments.comments.find((comment) => comment.id === id);
  if (!item) return;
  editingCommentId.value = id;
  commentDraft.value = item.content;
}

function locateComment(item: LocalComment) {
  if (!item.elementId && !item.selector) {
    commentError.value = "该评论没有稳定元素标记，只能参考保存时的位置。";
    comments.setAnchorStatus(item.id, "missing");
    return;
  }
  commentError.value = null;
  locatingCommentId.value = item.id;
  selection.requestHighlight({
    ...(item.elementId ? { pbId: item.elementId } : {}),
    ...(item.elementKey ? { pbKey: item.elementKey } : {}),
    ...(item.selector ? { selector: item.selector } : {}),
  });
}

watch(
  () => selection.highlightStatus,
  (status) => {
    const id = locatingCommentId.value;
    if (!id) return;
    if (status === "located") {
      comments.setAnchorStatus(id, "located");
      commentError.value = null;
    } else if (status === "missing") {
      comments.setAnchorStatus(id, "missing");
      commentError.value =
        "原页面元素已经变化，无法定位。你可以重新选择元素并新建评论。";
    } else if (status === "error") {
      commentError.value = "定位消息发送失败，请刷新 Runtime 后重试。";
    }
  },
);

function confirmDelete() {
  if (deleteCommentId.value) comments.remove(deleteCommentId.value);
  deleteCommentId.value = null;
}

function toggleCommentSelection(id: string) {
  const next = new Set(selectedCommentIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedCommentIds.value = next;
}

function selectAllVisibleComments() {
  selectedCommentIds.value = new Set(
    visibleComments.value.map((item) => item.id),
  );
}

function exitCommentManagement() {
  manageComments.value = false;
  selectedCommentIds.value = new Set();
}

function confirmBatchDelete() {
  comments.removeMany([...selectedCommentIds.value]);
  batchDeleteOpen.value = false;
  exitCommentManagement();
}

function toggleCommentExpanded(id: string) {
  const next = new Set(expandedCommentIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedCommentIds.value = next;
}

function clearAllComments() {
  comments.clearAll();
  clearDialogOpen.value = false;
}

function downloadUnreadable() {
  if (!comments.unreadableRaw) return;
  const blob = new Blob([comments.unreadableRaw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pbwork-comments-unreadable.json";
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="inspector" data-testid="inspector-body">
    <div class="tab-bar" role="tablist" aria-label="元素检查分组">
      <button
        v-for="item in [
          { id: 'styles', label: '样式' },
          { id: 'component', label: '组件' },
          { id: 'overview', label: '结构' },
          { id: 'convention', label: '约定' },
          { id: 'comments', label: '评论', count: visibleComments.length },
        ]"
        :key="item.id"
        type="button"
        role="tab"
        class="tab"
        :class="{ 'is-active': tab === item.id }"
        :aria-selected="tab === item.id"
        :aria-label="
          item.count !== undefined ? `${item.label} ${item.count}` : item.label
        "
        @click="tab = item.id as typeof tab"
      >
        <span class="tab-label">{{ item.label }}</span>
        <span v-if="item.count !== undefined" class="tab-count">{{
          item.count
        }}</span>
      </button>
    </div>

    <div v-if="selected" class="capture-fragment-action">
      <WorkbenchButton
        tone="primary"
        :disabled="!captureElementRef"
        data-testid="capture-selected-fragment"
        @click="addSelectedFragmentToCapture"
      >
        {{ captureUsesSemanticParent ? "采集所属稳定元素" : "加入采集范围" }}
      </WorkbenchButton>
      <small v-if="!captureElementRef">
        当前节点和所属语义区域都没有稳定标识；可改为采集当前页面。
      </small>
      <small v-else-if="captureUsesSemanticParent">
        当前叶节点没有稳定标识，将采集所属区域
        {{ captureElementRef.pbId
        }}{{ captureElementRef.pbKey ? `#${captureElementRef.pbKey}` : "" }}。
      </small>
      <small v-else>
        {{ captureElementRef.pbId
        }}{{ captureElementRef.pbKey ? `#${captureElementRef.pbKey}` : "" }}
      </small>
    </div>

    <div
      v-if="!selected && !selection.commentTarget && tab !== 'comments'"
      class="empty"
    >
      <div class="empty-badge">选择与评审</div>
      <p class="empty-title">还没有选中节点</p>
      <p class="empty-hint">
        选择页面中的元素，查看样式、组件信息或添加评论。按住 ⌥/Alt
        点击可选中所属组件或语义锚点；选中后按 ↑ 逐级上溯。
      </p>
      <button
        type="button"
        class="empty-action"
        :disabled="!selection.canInspect"
        @click="selection.setInspectMode(true)"
      >
        {{ selection.canInspect ? "开始选择元素" : "正在等待 Runtime…" }}
      </button>
      <p v-if="selection.handshakeTimedOut" class="empty-warn">
        Runtime 握手超时，请刷新预览。
      </p>
      <p v-if="selection.lastError" class="empty-warn">
        {{ selection.lastError }}
      </p>
    </div>

    <template v-else>
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
              <span class="value">{{ selected?.componentId || "—" }}</span>
            </div>
            <div class="field">
              <span class="label">组件实例</span>
              <span class="value mono">{{
                formatRef(selected?.componentOwner?.ref ?? element?.ref)
              }}</span>
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
                  >{{ row.json }}</pre>
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
                  >{{ row.json }}</pre>
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
                  <code v-if="row.cssVar" class="css-var">{{
                    row.cssVar
                  }}</code>
                </div>
              </li>
            </ul>
          </div>

          <div v-if="groupedStyleRows.length === 0" class="soft-empty">
            <p class="soft-title">没有匹配到 Token</p>
            <p class="soft-hint">切换到“全部”查看该元素的原始计算样式。</p>
          </div>
        </section>

        <section v-else class="section comments-pane">
          <v-alert
            v-if="comments.readError"
            type="error"
            variant="tonal"
            density="compact"
          >
            评论数据无法读取（{{ comments.readError }}），原始数据尚未被覆盖。
            <div class="error-actions">
              <v-btn size="x-small" variant="text" @click="downloadUnreadable"
                >下载原始数据</v-btn
              >
              <v-btn
                size="x-small"
                variant="text"
                color="error"
                @click="clearDialogOpen = true"
                >清除损坏数据</v-btn
              >
            </div>
          </v-alert>

          <div
            v-if="currentCommentTarget || editingCommentId"
            class="comment-composer"
          >
            <div class="composer-heading">
              <div>
                <span class="composer-kicker">{{
                  editingCommentId ? "编辑评审意见" : "当前选择"
                }}</span>
                <strong>{{
                  editingCommentId
                    ? "修改评论内容"
                    : currentCommentTarget?.elementLabel || "页面位置"
                }}</strong>
                <code
                  v-if="!editingCommentId && currentCommentTarget?.elementId"
                  >{{ currentCommentTarget.elementId }}</code
                >
              </div>
              <button
                type="button"
                class="text-button"
                @click="
                  selection.setCommentTarget(null);
                  editingCommentId = null;
                  commentDraft = '';
                "
              >
                取消
              </button>
            </div>
            <v-textarea
              v-model="commentDraft"
              label="评审意见"
              placeholder="描述问题、建议或验收结论…"
              variant="outlined"
              density="compact"
              rows="3"
              auto-grow
              :counter="COMMENT_MAX_LENGTH"
              :maxlength="COMMENT_MAX_LENGTH"
              hide-details="auto"
            />
            <div class="composer-actions">
              <span>仅保存在当前浏览器</span>
              <WorkbenchButton
                tone="primary"
                :disabled="!commentDraft.trim()"
                @click="saveComment"
              >
                {{ editingCommentId ? "保存修改" : "提交评论" }}
              </WorkbenchButton>
            </div>
          </div>
          <div v-else class="comment-callout">
            <div class="callout-icon"><MessageSquarePlus :size="18" /></div>
            <div>
              <strong>选择元素并添加评论</strong>
              <span>选择后会显示元素名称和稳定锚点。</span>
            </div>
            <WorkbenchButton
              tone="primary"
              :disabled="!selection.canInspect"
              @click="selection.setInspectMode(true)"
            >
              {{ selection.canInspect ? "开始选择" : "正在等待 Runtime…" }}
            </WorkbenchButton>
          </div>

          <v-alert
            v-if="commentError"
            type="warning"
            variant="tonal"
            density="compact"
            closable
            @click:close="commentError = null"
            >{{ commentError }}</v-alert
          >

          <div class="comment-toolbar">
            <WorkbenchSegmented
              v-model="commentScope"
              label="评论范围"
              :items="[
                { value: 'screen', label: '当前页面' },
                { value: 'context', label: '当前状态' },
              ]"
            />
            <WorkbenchSegmented
              v-model="commentStatus"
              label="评论状态筛选"
              :items="[
                { value: 'open', label: '未完成' },
                { value: 'resolved', label: '已完成' },
                { value: 'all', label: '全部' },
              ]"
            />
          </div>

          <div v-if="manageComments" class="comment-management-bar">
            <span>已选择 {{ selectedCommentIds.size }} 条</span>
            <div>
              <WorkbenchButton tone="ghost" @click="selectAllVisibleComments"
                >全选当前筛选</WorkbenchButton
              >
              <WorkbenchButton tone="ghost" @click="exitCommentManagement"
                >取消</WorkbenchButton
              >
            </div>
          </div>

          <div v-if="visibleComments.length" class="comment-groups">
            <section v-if="openComments.length" class="comment-group">
              <header class="group-heading">
                <strong>未完成</strong><span>{{ openComments.length }}</span>
              </header>
              <div class="comment-list">
                <article
                  v-for="item in openComments"
                  :key="item.id"
                  class="comment-card"
                  :class="{
                    'is-locating': locatingCommentId === item.id,
                    'is-missing': item.anchorStatus === 'missing',
                  }"
                >
                  <header>
                    <label v-if="manageComments" class="comment-checkbox">
                      <input
                        type="checkbox"
                        :checked="selectedCommentIds.has(item.id)"
                        :aria-label="`选择评论：${commentTitle(item)}`"
                        @change="toggleCommentSelection(item.id)"
                      />
                    </label>
                    <div class="comment-anchor">
                      <LocateFixed :size="14" />
                      <strong>{{ commentTitle(item) }}</strong>
                    </div>
                    <v-menu v-if="!manageComments" location="bottom end">
                      <template #activator="{ props }"
                        ><WorkbenchIconButton
                          v-bind="props"
                          label="评论更多操作"
                          ><MoreHorizontal :size="16" /></WorkbenchIconButton
                      ></template>
                      <div class="wb-menu-card">
                        <button type="button" @click="editComment(item.id)">
                          <span>编辑评论</span><small>修改评审内容</small>
                        </button>
                        <button
                          type="button"
                          class="is-danger"
                          @click="deleteCommentId = item.id"
                        >
                          <span>删除</span><small>删除后无法恢复</small>
                        </button>
                      </div>
                    </v-menu>
                  </header>
                  <p
                    class="comment-content"
                    :class="{ 'is-expanded': expandedCommentIds.has(item.id) }"
                    @click="toggleCommentExpanded(item.id)"
                  >
                    {{ item.content }}
                  </p>
                  <div class="comment-meta">
                    <time :datetime="item.updatedAt">{{
                      new Date(item.updatedAt).toLocaleString()
                    }}</time>
                    <code v-if="item.elementId">{{ item.elementId }}</code>
                  </div>
                  <p
                    v-if="
                      locatingCommentId === item.id &&
                      selection.highlightStatus === 'locating'
                    "
                    class="locate-feedback"
                  >
                    正在定位…
                  </p>
                  <p
                    v-else-if="
                      locatingCommentId === item.id &&
                      selection.highlightStatus === 'located'
                    "
                    class="locate-feedback is-success"
                  >
                    已定位并选中元素
                  </p>
                  <p
                    v-else-if="item.anchorStatus === 'missing'"
                    class="locate-feedback is-error"
                  >
                    目标元素已失效
                  </p>
                  <footer>
                    <WorkbenchButton
                      tone="primary"
                      :loading="
                        locatingCommentId === item.id &&
                        selection.highlightStatus === 'locating'
                      "
                      @click="locateComment(item)"
                    >
                      <LocateFixed :size="14" />定位
                    </WorkbenchButton>
                    <WorkbenchButton
                      tone="ghost"
                      @click="comments.setStatus(item.id, 'resolved')"
                      ><Check :size="14" />完成</WorkbenchButton
                    >
                  </footer>
                </article>
              </div>
            </section>

            <section
              v-if="resolvedComments.length"
              class="comment-group is-resolved-group"
            >
              <header class="group-heading">
                <strong>已完成</strong
                ><span>{{ resolvedComments.length }}</span>
              </header>
              <div class="comment-list">
                <article
                  v-for="item in resolvedComments"
                  :key="item.id"
                  class="comment-card is-resolved"
                >
                  <header>
                    <label v-if="manageComments" class="comment-checkbox"
                      ><input
                        type="checkbox"
                        :checked="selectedCommentIds.has(item.id)"
                        :aria-label="`选择评论：${commentTitle(item)}`"
                        @change="toggleCommentSelection(item.id)"
                    /></label>
                    <div class="comment-anchor">
                      <Check :size="14" /><strong>{{
                        commentTitle(item)
                      }}</strong>
                    </div>
                  </header>
                  <p
                    class="comment-content"
                    :class="{ 'is-expanded': expandedCommentIds.has(item.id) }"
                    @click="toggleCommentExpanded(item.id)"
                  >
                    {{ item.content }}
                  </p>
                  <footer>
                    <WorkbenchButton
                      tone="ghost"
                      @click="comments.setStatus(item.id, 'open')"
                      ><RotateCcw :size="14" />重新打开</WorkbenchButton
                    >
                    <v-menu v-if="!manageComments" location="bottom end">
                      <template #activator="{ props }"
                        ><WorkbenchIconButton
                          v-bind="props"
                          label="评论更多操作"
                          ><MoreHorizontal :size="16" /></WorkbenchIconButton
                      ></template>
                      <div class="wb-menu-card">
                        <button type="button" @click="locateComment(item)">
                          <span>定位元素</span><small>在画布中重新选中</small>
                        </button>
                        <button type="button" @click="editComment(item.id)">
                          <span>编辑评论</span><small>修改评审内容</small>
                        </button>
                        <button
                          type="button"
                          class="is-danger"
                          @click="deleteCommentId = item.id"
                        >
                          <span>删除</span><small>删除后无法恢复</small>
                        </button>
                      </div>
                    </v-menu>
                  </footer>
                </article>
              </div>
            </section>
          </div>
          <WorkbenchButton
            v-if="hasMoreComments"
            tone="neutral"
            @click="visibleCommentLimit += 30"
            >加载更多（剩余
            {{
              visibleComments.length - displayedComments.length
            }}）</WorkbenchButton
          >
          <div v-else class="soft-empty">
            <p class="soft-title">当前筛选下没有评论</p>
            <p class="soft-hint">评论只保存在当前浏览器，不会上传或共享。</p>
          </div>
          <v-menu
            v-if="comments.comments.length && !manageComments"
            location="bottom start"
          >
            <template #activator="{ props }"
              ><WorkbenchButton v-bind="props" tone="ghost"
                ><MoreHorizontal :size="15" />管理评论</WorkbenchButton
              ></template
            >
            <div class="wb-menu-card">
              <button type="button" @click="manageComments = true">
                <span>批量选择</span><small>勾选后统一删除</small>
              </button>
              <button
                type="button"
                @click="
                  commentAnchorFilter =
                    commentAnchorFilter === 'missing' ? 'all' : 'missing'
                "
              >
                <span>{{
                  commentAnchorFilter === "missing"
                    ? "显示全部评论"
                    : "仅看定位失效"
                }}</span
                ><small>筛选已失效的元素锚点</small>
              </button>
              <button
                type="button"
                class="is-danger"
                @click="clearDialogOpen = true"
              >
                <span>清除全部评论</span
                ><small>共 {{ comments.comments.length }} 条</small>
              </button>
            </div>
          </v-menu>
          <div v-if="manageComments" class="batch-action-bar">
            <strong>已选择 {{ selectedCommentIds.size }} 条</strong>
            <WorkbenchButton
              tone="danger"
              :disabled="selectedCommentIds.size === 0"
              @click="batchDeleteOpen = true"
              >删除所选</WorkbenchButton
            >
          </div>
        </section>
      </div>
    </template>

    <v-dialog
      :model-value="Boolean(deleteCommentId)"
      max-width="420"
      @update:model-value="!$event && (deleteCommentId = null)"
    >
      <v-card title="删除这条评论？" text="删除后无法恢复。">
        <v-card-actions
          ><v-spacer /><v-btn @click="deleteCommentId = null">取消</v-btn
          ><v-btn color="error" @click="confirmDelete"
            >删除</v-btn
          ></v-card-actions
        >
      </v-card>
    </v-dialog>
    <v-dialog v-model="clearDialogOpen" max-width="440">
      <v-card
        :title="
          comments.readError ? '清除损坏的评论数据？' : '清除全部本地评论？'
        "
        :text="
          comments.readError
            ? '建议先下载原始数据。清除后无法恢复。'
            : `将删除当前浏览器中的 ${comments.comments.length} 条评论，且无法恢复。`
        "
      >
        <v-card-actions
          ><v-spacer /><v-btn @click="clearDialogOpen = false">取消</v-btn
          ><v-btn color="error" @click="clearAllComments"
            >确认清除</v-btn
          ></v-card-actions
        >
      </v-card>
    </v-dialog>
    <v-dialog v-model="batchDeleteOpen" max-width="440">
      <v-card
        title="删除所选评论？"
        :text="`将删除选中的 ${selectedCommentIds.size} 条评论，且无法恢复。`"
      >
        <v-card-actions>
          <v-spacer />
          <v-btn @click="batchDeleteOpen = false">取消</v-btn>
          <v-btn color="error" @click="confirmBatchDelete">删除所选</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
.empty-action {
  justify-self: center;
  min-height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 9px;
  background: rgb(var(--v-theme-action));
  color: rgb(var(--v-theme-on-action));
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}
.empty-action:disabled {
  opacity: 0.5;
  cursor: wait;
}

.tab-bar {
  display: flex;
  flex: 0 0 auto;
  gap: 3px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  overflow-x: auto;
  scrollbar-width: thin;
}

.tab {
  display: inline-flex;
  flex: 1 1 0;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  padding: 7px 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-count {
  flex: 0 0 auto;
  min-width: 16px;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  font-size: 0.625rem;
  font-weight: 800;
  line-height: 1.2;
}

.tab.is-active {
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.tab.is-active .tab-count {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, transparent);
  color: rgb(var(--v-theme-primary));
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
.comments-pane {
  padding-bottom: 8px;
}
.capture-fragment-action {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.16);
}
.capture-fragment-action small {
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface-variant));
  text-overflow: ellipsis;
}
.comment-composer,
.comment-callout {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid
    color-mix(in srgb, rgb(var(--v-theme-primary)) 25%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 7%, transparent);
}
.comment-callout {
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
}
.callout-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent);
  color: rgb(var(--v-theme-primary));
}
.comment-callout > div:nth-child(2) {
  display: grid;
  gap: 3px;
}
.composer-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.composer-heading > div,
.comment-callout > div {
  display: grid;
  gap: 3px;
}
.composer-kicker {
  color: rgb(var(--v-theme-primary)) !important;
  font-size: 0.66rem !important;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.composer-heading code {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
}
.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.composer-actions span {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.68rem;
}
.composer-heading span,
.comment-callout span {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.72rem;
}
.text-button {
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  cursor: pointer;
}
.comment-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.comment-groups,
.comment-group {
  display: grid;
  gap: 10px;
}
.group-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.72rem;
}
.group-heading span {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.07);
  font-size: 0.66rem;
}
.comment-list {
  display: grid;
  gap: 8px;
}
.comment-card {
  display: grid;
  gap: 6px;
  padding: 9px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}
.comment-card.is-locating {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px
    color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
}
.comment-card.is-missing {
  border-color: color-mix(in srgb, rgb(var(--v-theme-error)) 42%, transparent);
}
.comment-card.is-resolved {
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-surface)) 92%,
    rgb(var(--v-theme-success)) 8%
  );
}
.comment-card header,
.comment-card footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.comment-card header > div {
  display: flex;
  align-items: center;
  gap: 6px;
}
.comment-anchor {
  min-width: 0;
  color: rgba(var(--v-theme-on-surface), 0.82);
}
.comment-anchor strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.76rem;
}
.more-button {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.56);
  cursor: pointer;
}
.more-button:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.comment-card time,
.location-fallback {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.66rem;
}
.comment-card p {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  white-space: pre-wrap;
}
.comment-content {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  cursor: pointer;
}
.comment-content.is-expanded {
  display: block;
  overflow: visible;
}
.comment-card code {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.68rem;
}
.comment-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.comment-meta code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.locate-feedback {
  margin: 0 !important;
  color: rgb(var(--v-theme-primary));
  font-size: 0.69rem !important;
  font-weight: 700;
}
.locate-feedback.is-success {
  color: rgb(var(--v-theme-success));
}
.locate-feedback.is-error {
  color: rgb(var(--v-theme-error));
}
.comment-card footer {
  justify-content: flex-start;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding-top: 7px;
}
.comment-checkbox {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
}
.comment-checkbox input {
  width: 15px;
  height: 15px;
  accent-color: rgb(var(--v-theme-primary));
}
.comment-management-bar,
.batch-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 9px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  font-size: 0.72rem;
}
.comment-management-bar > div {
  display: flex;
  gap: 4px;
}
.batch-action-bar {
  position: sticky;
  bottom: 0;
  z-index: 3;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 -8px 22px rgba(15, 23, 42, 0.08);
}
.wb-menu-card {
  display: grid;
  min-width: 210px;
  padding: 5px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
}
.wb-menu-card button {
  display: grid;
  gap: 2px;
  padding: 8px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.82);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.wb-menu-card button:hover {
  background: rgba(var(--v-theme-on-surface), 0.055);
}
.wb-menu-card button span {
  font-size: 0.75rem;
  font-weight: 700;
}
.wb-menu-card button small {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.66rem;
}
.wb-menu-card button.is-danger span {
  color: rgb(var(--v-theme-error));
}
.wb-menu-card button.is-danger small {
  color: color-mix(in srgb, rgb(var(--v-theme-error)) 68%, transparent);
}
.pane {
  scrollbar-gutter: stable;
}
.error-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
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
