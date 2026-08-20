<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from "vue";
import { useRouter } from "vue-router";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  FileStack,
  FolderOpen,
  MessageSquareText,
  RotateCcw,
  ScanLine,
} from "lucide-vue-next";
import type { PrototypeLifecycle, PrototypeRecord } from "@/design-system/types";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import { useCommentsStore } from "@/app/stores/comments";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";
import WorkbenchSegmented from "@/workbench/ui/WorkbenchSegmented.vue";
import LifecycleTransitionDialog, {
  type LifecycleIntent,
} from "@/workbench/prototypes/LifecycleTransitionDialog.vue";
import LifecycleFinalizationSheet from "@/workbench/prototypes/LifecycleFinalizationSheet.vue";
import { prototypeSummary } from "@/workbench/prototypes/prototypePresentation";

const props = defineProps<{
  lifecycle?: "all" | PrototypeLifecycle | undefined;
}>();
const router = useRouter();
const state = usePrototypeLifecycleStore();
const comments = useCommentsStore();
const all = loadPrototypes();
state.ensurePrototypes(all);

const editing = ref<PrototypeRecord | null>(null);
const intent = ref<LifecycleIntent>("advance");
let pollTimer: ReturnType<typeof setInterval> | undefined;

const stages = [
  { id: "active" as const, title: "进行中" },
  { id: "review" as const, title: "待确定" },
  { id: "final" as const, title: "已定稿" },
  { id: "archived" as const, title: "已归档" },
];

const selectedFilter = computed(() => props.lifecycle ?? "all");
const items = computed(() =>
  all.filter(
    (item) =>
      selectedFilter.value === "all" ||
      state.effectiveLifecycle(item) === selectedFilter.value,
  ),
);
const title = computed(() =>
  selectedFilter.value === "all"
    ? "全部原型"
    : LIFECYCLE_LABELS[selectedFilter.value],
);
const stageCount = (stage: PrototypeLifecycle) =>
  all.filter((item) => state.effectiveLifecycle(item) === stage).length;
const filterItems = computed(() => [
  { value: "all", label: "全部", count: all.length },
  ...stages.map((stage) => ({
    value: stage.id,
    label: stage.title,
    count: stageCount(stage.id),
  })),
]);
const stats = (id: string) => {
  const screens = loadPrototypeScreens().filter(
    (screen) => screen.prototypeId === id,
  );
  return {
    screens: screens.length,
    variants: screens.reduce((sum, screen) => sum + screen.variants.length, 0),
    comments: comments.comments.filter(
      (comment) => comment.prototypeId === id && comment.status === "open",
    ).length,
  };
};

const stageIndex = (item: PrototypeRecord) =>
  stages.findIndex((stage) => stage.id === state.effectiveLifecycle(item));

type RowAction = {
  label: string;
  tone: "primary" | "neutral" | "danger";
  icon: Component;
  run: () => void;
};

function record(item: PrototypeRecord) {
  return state.recordFor(item.id);
}

function artifactLabel(item: PrototypeRecord) {
  const current = record(item);
  if (current?.operation.kind === "failed") {
    return current.operation.action === "rollback" ? "清理失败" : "定稿失败";
  }
  if (current?.operation.kind === "finalizing") {
    if (current.operation.phase === "capturing") return "整原型采集中";
    if (current.operation.phase === "building-prompt") return "提示词生成中";
    return "等待确认";
  }
  if (current?.operation.kind === "rolling-back") return "Evidence 清理中";
  if (current?.artifacts) return "Evidence + 提示词";
  return "尚未生成";
}

function operationFailure(item: PrototypeRecord) {
  const operation = record(item)?.operation;
  return operation?.kind === "failed" ? operation.message : "";
}

function formatTime(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function openPrototype(item: PrototypeRecord) {
  void router.push(`/workbench/prototypes/${item.id}`);
}

function openArtifacts(item: PrototypeRecord) {
  const artifacts = record(item)?.artifacts;
  if (!artifacts) return;
  void router.push(
    `/workbench/evidence/${artifacts.bundleId}/${artifacts.snapshotId}`,
  );
}

function openTransition(item: PrototypeRecord, nextIntent: LifecycleIntent) {
  editing.value = item;
  intent.value = nextIntent;
}

function rowActions(item: PrototypeRecord): RowAction[] {
  const stage = state.effectiveLifecycle(item);
  if (stage === "active") {
    return [
      {
        label: "送交待确定",
        tone: "primary",
        icon: ArrowRight,
        run: () => openTransition(item, "advance"),
      },
    ];
  }
  if (stage === "review") {
    return [
      {
        label: "定稿并采集",
        tone: "primary",
        icon: ScanLine,
        run: () => openTransition(item, "finalize"),
      },
      {
        label: "退回进行中",
        tone: "neutral",
        icon: RotateCcw,
        run: () => openTransition(item, "return-active"),
      },
    ];
  }
  if (stage === "final") {
    return [
      {
        label: "查看定稿产物",
        tone: "primary",
        icon: FolderOpen,
        run: () => openArtifacts(item),
      },
      {
        label: "回退待确定",
        tone: "neutral",
        icon: RotateCcw,
        run: () => openTransition(item, "rollback"),
      },
      {
        label: "归档",
        tone: "danger",
        icon: Archive,
        run: () => openTransition(item, "archive"),
      },
    ];
  }
  return [
    {
      label: "查看归档产物",
      tone: "neutral",
      icon: Archive,
      run: () => openArtifacts(item),
    },
  ];
}

function selectFilter(value: string) {
  void router.push(`/workbench/prototypes/${value}`);
}

async function pollOperations() {
  for (const item of all) {
    const operation = record(item)?.operation;
    if (operation?.kind === "finalizing" && operation.phase === "capturing") {
      await state.pollFinalization(item);
    }
  }
}

onMounted(() => {
  void pollOperations();
  pollTimer = setInterval(() => void pollOperations(), 1000);
});
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <ResourcePageShell :title="title">
    <template #stats>
      <span class="catalog-count">{{ items.length }} 个原型</span>
    </template>

    <WorkbenchSegmented
      fill
      :model-value="selectedFilter"
      :items="filterItems"
      label="筛选原型"
      @update:model-value="selectFilter"
    />

    <section v-if="state.storageError" class="storage-error" role="alert">
      {{ state.storageError }}
    </section>

    <div v-if="items.length" class="prototype-ledger">
      <div class="ledger-columns" aria-hidden="true">
        <span>原型</span>
        <span>生命周期</span>
        <span>定稿产物</span>
        <span>规模与变化</span>
        <span>下一步</span>
      </div>
      <article v-for="item in items" :key="item.id" class="prototype-row">
        <button
          class="prototype-identity"
          type="button"
          @click="openPrototype(item)"
        >
          <strong>{{ item.label }}</strong>
          <small>{{ prototypeSummary(item) }}</small>
        </button>

        <div
          class="row-stage"
          :aria-label="`当前阶段：${LIFECYCLE_LABELS[state.effectiveLifecycle(item)]}`"
        >
          <div class="asset-spine" aria-hidden="true">
            <span
              v-for="(stage, index) in stages"
              :key="stage.id"
              :class="{
                current: index === stageIndex(item),
                complete: index < stageIndex(item),
              }"
            >
              <CheckCircle2 v-if="index < stageIndex(item)" :size="11" />
              <i v-else />
            </span>
          </div>
          <strong>{{
            LIFECYCLE_LABELS[state.effectiveLifecycle(item)]
          }}</strong>
        </div>

        <div
          class="row-evidence"
          :class="{ failed: record(item)?.operation.kind === 'failed' }"
        >
          <strong>{{ artifactLabel(item) }}</strong>
          <small v-if="record(item)?.operation.kind === 'failed'">
            {{ operationFailure(item) }}
          </small>
        </div>

        <div class="row-meta">
          <span
            ><FileStack :size="13" />{{ stats(item.id).screens }} 页面 ·
            {{ stats(item.id).variants }} 状态</span
          >
          <span
            ><MessageSquareText :size="13" />{{ stats(item.id).comments }}
            待处理</span
          >
          <time>{{ formatTime(record(item)?.updatedAt) }}</time>
        </div>

        <div class="row-actions">
          <v-tooltip
            v-for="action in rowActions(item)"
            :key="action.label"
            :text="action.label"
            location="top"
          >
            <template #activator="{ props: tip }">
              <WorkbenchIconButton
                v-bind="tip"
                :label="action.label"
                :tone="action.tone"
                @click="action.run"
              >
                <component :is="action.icon" :size="16" />
              </WorkbenchIconButton>
            </template>
          </v-tooltip>
        </div>
      </article>
    </div>

    <div v-else class="gallery-empty">
      <CircleDot :size="28" />
      <h2>此阶段还没有原型</h2>
      <p>生命周期流转后，原型会自动出现在这里。</p>
    </div>
  </ResourcePageShell>

  <LifecycleTransitionDialog
    v-if="editing && intent !== 'finalize'"
    :model-value="true"
    :prototype="editing"
    :intent="intent"
    @changed="editing = null"
    @update:model-value="!$event && (editing = null)"
  />
  <LifecycleFinalizationSheet
    v-if="editing && intent === 'finalize'"
    :model-value="true"
    :prototype="editing"
    @update:model-value="!$event && (editing = null)"
  />
</template>

<style scoped>
.catalog-count {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.78rem;
}
.storage-error,
.gallery-empty {
  padding: 18px;
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-error)) 35%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 8%, transparent);
  color: rgb(var(--v-theme-error));
  font-size: 0.78rem;
}
.prototype-ledger {
  container-type: inline-size;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}
.ledger-columns,
.prototype-row {
  display: grid;
  grid-template-columns:
    minmax(220px, 1.45fr)
    minmax(150px, 0.85fr)
    minmax(120px, 0.7fr)
    minmax(130px, 0.75fr)
    118px;
  gap: 16px;
  align-items: center;
}
.ledger-columns {
  padding: 9px 17px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.13);
  background: rgba(var(--v-theme-on-surface), 0.025);
  color: rgba(var(--v-theme-on-surface), 0.42);
  font-size: 0.62rem;
  font-weight: 700;
}
.ledger-columns span:last-child {
  text-align: right;
}
.prototype-row {
  min-height: 88px;
  padding: 15px 17px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.13);
}
.prototype-row:last-child {
  border-bottom: 0;
}
.prototype-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.018);
}
.prototype-identity {
  display: grid;
  min-width: 0;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.prototype-identity strong {
  overflow: hidden;
  font-size: 0.86rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prototype-identity small {
  color: rgba(var(--v-theme-on-surface), 0.46);
  font-size: 0.68rem;
}
.row-stage,
.row-evidence,
.row-meta {
  display: grid;
  min-width: 0;
  gap: 5px;
}
.row-stage > strong,
.row-evidence strong {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.72rem;
}
.asset-spine {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.asset-spine::before {
  position: absolute;
  right: 8px;
  left: 8px;
  height: 1px;
  background: rgba(var(--v-theme-on-surface), 0.13);
  content: "";
}
.asset-spine > span {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.22);
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.35);
}
.asset-spine > span.complete {
  border-color: rgb(var(--v-theme-success));
  background: rgb(var(--v-theme-success));
  color: rgb(var(--v-theme-on-success));
}
.asset-spine > span.current {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 3px
    color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
}
.asset-spine i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.row-evidence small {
  color: rgb(var(--v-theme-error));
  font-size: 0.62rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.row-meta {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.67rem;
}
.row-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.row-meta time {
  color: rgba(var(--v-theme-on-surface), 0.38);
}
.row-actions {
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-end;
  gap: 4px;
}
.gallery-empty {
  display: grid;
  justify-items: center;
  gap: 7px;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-align: center;
}
.gallery-empty h2,
.gallery-empty p {
  margin: 0;
}
.gallery-empty h2 {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.9rem;
}
.gallery-empty p {
  font-size: 0.72rem;
}
@container (max-width: 860px) {
  .ledger-columns {
    display: none;
  }
  .prototype-row {
    grid-template-columns: minmax(0, 1fr) 118px;
    align-items: start;
  }
  .row-stage,
  .row-evidence,
  .row-meta {
    grid-column: 1;
  }
  .row-actions {
    grid-column: 2;
    grid-row: 1 / 5;
    align-self: center;
  }
}
</style>
