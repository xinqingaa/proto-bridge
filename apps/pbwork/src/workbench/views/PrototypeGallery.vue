<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
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
import WorkbenchBadge from "@/workbench/ui/WorkbenchBadge.vue";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import LifecycleTransitionDialog, {
  type LifecycleIntent,
} from "@/workbench/prototypes/LifecycleTransitionDialog.vue";
import LifecycleFinalizationSheet from "@/workbench/prototypes/LifecycleFinalizationSheet.vue";

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
  {
    id: "active" as const,
    title: "进行中",
    copy: "制作与完善",
    icon: CircleDot,
  },
  {
    id: "review" as const,
    title: "待确定",
    copy: "确认与收敛",
    icon: Clock3,
  },
  {
    id: "final" as const,
    title: "已定稿",
    copy: "证据已固定",
    icon: CheckCircle2,
  },
  {
    id: "archived" as const,
    title: "已归档",
    copy: "永久只读",
    icon: Archive,
  },
];

const items = computed(() =>
  all.filter(
    (item) =>
      !props.lifecycle ||
      props.lifecycle === "all" ||
      state.effectiveLifecycle(item) === props.lifecycle,
  ),
);
const title = computed(() =>
  props.lifecycle && props.lifecycle !== "all"
    ? LIFECYCLE_LABELS[props.lifecycle]
    : "原型生命周期",
);
const stageCount = (stage: PrototypeLifecycle) =>
  all.filter((item) => state.effectiveLifecycle(item) === stage).length;
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

async function pollOperations() {
  for (const item of all) {
    const operation = record(item)?.operation;
    if (
      operation?.kind === "finalizing" &&
      operation.phase === "capturing"
    ) {
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
  <ResourcePageShell
    eyebrow="Prototype control"
    :title="title"
    description="生命周期决定原型何时可以修改、何时自动形成完整证据，以及何时永久封存。"
  >
    <section class="lifecycle-rail" aria-label="原型生命周期筛选">
      <button
        v-for="(stage, index) in stages"
        :key="stage.id"
        type="button"
        class="rail-stage"
        :class="[`is-${stage.id}`, { active: props.lifecycle === stage.id }]"
        :aria-current="props.lifecycle === stage.id ? 'page' : undefined"
        @click="router.push(`/workbench/prototypes/${stage.id}`)"
      >
        <span class="stage-sequence">{{ String(index + 1).padStart(2, "0") }}</span>
        <component :is="stage.icon" :size="17" aria-hidden="true" />
        <span class="stage-copy">
          <strong>{{ stage.title }}</strong>
          <small>{{ stage.copy }}</small>
        </span>
        <b>{{ stageCount(stage.id) }}</b>
        <ArrowRight v-if="index < stages.length - 1" class="stage-arrow" :size="15" />
      </button>
    </section>

    <div class="ledger-heading">
      <div>
        <strong>{{ props.lifecycle === "all" || !props.lifecycle ? "全部资产" : title }}</strong>
        <span>{{ items.length }} 个原型</span>
      </div>
      <button
        v-if="props.lifecycle && props.lifecycle !== 'all'"
        type="button"
        @click="router.push('/workbench/prototypes/all')"
      >
        查看全部
      </button>
    </div>

    <section v-if="state.storageError" class="storage-error" role="alert">
      {{ state.storageError }}
    </section>

    <div v-if="items.length" class="prototype-ledger">
      <div class="ledger-columns" aria-hidden="true">
        <span>原型资产</span>
        <span>生命周期</span>
        <span>定稿产物</span>
        <span>规模与变化</span>
        <span>下一步</span>
      </div>
      <article v-for="item in items" :key="item.id" class="prototype-row">
        <button class="prototype-identity" type="button" @click="openPrototype(item)">
          <span class="identity-mark">{{ item.label.slice(0, 1) }}</span>
          <span>
            <strong>{{ item.label }}</strong>
            <small>{{ item.summary }}</small>
            <code>{{ item.id }}</code>
          </span>
        </button>

        <div class="row-stage" :aria-label="`当前阶段：${LIFECYCLE_LABELS[state.effectiveLifecycle(item)]}`">
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
          <strong>{{ LIFECYCLE_LABELS[state.effectiveLifecycle(item)] }}</strong>
        </div>

        <div class="row-evidence" :class="{ failed: record(item)?.operation.kind === 'failed' }">
          <span>定稿产物</span>
          <strong>{{ artifactLabel(item) }}</strong>
          <small v-if="record(item)?.operation.kind === 'failed'">
            {{ operationFailure(item) }}
          </small>
        </div>

        <div class="row-meta">
          <span><FileStack :size="13" />{{ stats(item.id).screens }} 页面 · {{ stats(item.id).variants }} 状态</span>
          <span><MessageSquareText :size="13" />{{ stats(item.id).comments }} 待处理</span>
          <time>{{ formatTime(record(item)?.updatedAt) }}</time>
        </div>

        <div class="row-actions">
          <template v-if="state.effectiveLifecycle(item) === 'active'">
            <WorkbenchButton tone="primary" @click="openTransition(item, 'advance')">
              送交待确定<ArrowRight :size="14" />
            </WorkbenchButton>
            <WorkbenchButton tone="ghost" @click="openPrototype(item)">打开原型</WorkbenchButton>
          </template>

          <template v-else-if="state.effectiveLifecycle(item) === 'review'">
            <WorkbenchButton tone="primary" @click="openTransition(item, 'finalize')">
              <ScanLine :size="14" />定稿并采集
            </WorkbenchButton>
            <WorkbenchButton tone="ghost" @click="openTransition(item, 'return-active')">
              退回进行中
            </WorkbenchButton>
          </template>

          <template v-else-if="state.effectiveLifecycle(item) === 'final'">
            <WorkbenchButton tone="primary" @click="openArtifacts(item)">
              <FolderOpen :size="14" />查看定稿产物
            </WorkbenchButton>
            <WorkbenchButton tone="ghost" @click="openTransition(item, 'rollback')">
              <RotateCcw :size="14" />回退待确定
            </WorkbenchButton>
            <WorkbenchButton tone="ghost" @click="openTransition(item, 'archive')">
              归档
            </WorkbenchButton>
          </template>

          <template v-else>
            <WorkbenchButton tone="neutral" @click="openArtifacts(item)">
              <Archive :size="14" />查看归档产物
            </WorkbenchButton>
          </template>
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
.lifecycle-rail {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}
.rail-stage {
  position: relative;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  min-height: 78px;
  padding: 13px 18px;
  border: 0;
  border-right: 1px solid rgba(var(--v-border-color), 0.14);
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.72);
  text-align: left;
  cursor: pointer;
}
.rail-stage:last-child {
  border-right: 0;
}
.rail-stage:hover,
.rail-stage:focus-visible,
.rail-stage.active {
  background: rgba(var(--v-theme-on-surface), 0.045);
  outline: none;
}
.rail-stage.active {
  box-shadow: inset 0 -3px rgb(var(--v-theme-primary));
}
.rail-stage.is-review.active {
  box-shadow: inset 0 -3px rgb(var(--v-theme-warning));
}
.rail-stage.is-final.active {
  box-shadow: inset 0 -3px rgb(var(--v-theme-success));
}
.rail-stage.is-archived.active {
  box-shadow: inset 0 -3px rgba(var(--v-theme-on-surface), 0.45);
}
.stage-sequence {
  color: rgba(var(--v-theme-on-surface), 0.32);
  font: 700 0.65rem ui-monospace, SFMono-Regular, Menlo, monospace;
}
.stage-copy {
  display: grid;
  gap: 2px;
}
.stage-copy strong {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8rem;
}
.stage-copy small {
  color: rgba(var(--v-theme-on-surface), 0.46);
  font-size: 0.65rem;
}
.rail-stage b {
  font: 800 1.2rem/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  color: rgb(var(--v-theme-on-surface));
}
.stage-arrow {
  position: absolute;
  right: -8px;
  z-index: 1;
  padding: 2px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.3);
}
.ledger-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 2px 0;
}
.ledger-heading div {
  display: flex;
  gap: 9px;
  align-items: baseline;
}
.ledger-heading strong {
  font-size: 0.85rem;
}
.ledger-heading span,
.ledger-heading button {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.7rem;
}
.ledger-heading button {
  border: 0;
  background: transparent;
  cursor: pointer;
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
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}
.ledger-columns {
  display: grid;
  grid-template-columns: minmax(250px, 1.45fr) minmax(190px, 0.9fr) minmax(145px, 0.75fr) minmax(140px, 0.75fr) minmax(190px, auto);
  gap: 16px;
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
  display: grid;
  grid-template-columns: minmax(250px, 1.45fr) minmax(190px, 0.9fr) minmax(145px, 0.75fr) minmax(140px, 0.75fr) minmax(190px, auto);
  gap: 16px;
  align-items: center;
  min-height: 96px;
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
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.identity-mark {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 34%, transparent);
  border-radius: 9px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
  color: rgb(var(--v-theme-primary));
  font-size: 0.85rem;
  font-weight: 900;
}
.prototype-identity > span:last-child,
.row-stage,
.row-evidence,
.row-meta {
  display: grid;
  min-width: 0;
  gap: 5px;
}
.prototype-identity strong {
  overflow: hidden;
  font-size: 0.83rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prototype-identity small {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.57);
  font-size: 0.68rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prototype-identity code {
  display: block;
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.43);
  font-size: 0.64rem;
}
.row-evidence > span {
  color: rgba(var(--v-theme-on-surface), 0.42);
  font-size: 0.62rem;
}
.row-stage > strong {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.7rem;
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
  box-shadow: 0 0 0 3px color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
}
.asset-spine i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.row-evidence strong {
  font-size: 0.75rem;
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
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
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
@media (max-width: 1180px) {
  .lifecycle-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rail-stage:nth-child(2) {
    border-right: 0;
  }
  .ledger-columns {
    display: none;
  }
  .prototype-row {
    grid-template-columns: minmax(240px, 1.4fr) minmax(180px, 0.9fr) minmax(150px, 1fr);
  }
  .row-meta,
  .row-actions {
    grid-column: span 1;
  }
}
@media (max-width: 1350px) {
  .prototype-row {
    grid-template-columns: minmax(220px, 1.2fr) minmax(180px, 1fr);
  }
  .row-evidence {
    grid-column: 2;
  }
  .row-meta {
    grid-column: 1;
  }
  .row-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}
@media (max-width: 760px) {
  .lifecycle-rail,
  .prototype-row {
    grid-template-columns: 1fr;
  }
  .rail-stage {
    border-right: 0;
    border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
  }
  .stage-arrow {
    display: none;
  }
  .row-actions {
    justify-content: flex-start;
  }
}
@media (prefers-reduced-motion: reduce) {
  .rail-stage,
  .prototype-row {
    transition: none;
  }
}
</style>
