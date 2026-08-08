<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowDownUp,
  CheckCircle2,
  CircleAlert,
  Eye,
  Play,
  RotateCcw,
  ScanLine,
  Search,
  Trash2,
} from "lucide-vue-next";
import { useCaptureStore } from "@/app/stores/capture";
import {
  buildCaptureTaskPresentations,
  type CaptureTaskPresentation,
} from "@/capture/presentation";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";
import WorkbenchTabs from "@/workbench/ui/WorkbenchTabs.vue";

type TaskFilter = "all" | "running" | "attention" | "completed";
type SortOrder = "newest" | "oldest";

const capture = useCaptureStore();
const router = useRouter();
const taskFilter = ref<TaskFilter>("all");
const sortOrder = ref<SortOrder>("newest");
const searchQuery = ref("");
const confirmClearAll = ref(false);
const pendingClearJobId = ref<string | null>(null);
let pollTimer: ReturnType<typeof setInterval> | undefined;

const taskPresentations = computed(() =>
  buildCaptureTaskPresentations(capture.consoleState),
);
const runningTasks = computed(() =>
  taskPresentations.value.filter((item) => item.status === "running"),
);
const attentionTasks = computed(() =>
  taskPresentations.value.filter((item) => item.status === "needs-attention"),
);
const completedTasks = computed(() =>
  taskPresentations.value.filter(
    (item) => item.status === "completed" || item.status === "resolved",
  ),
);
const taskTabs = computed(() => [
  { label: "全部", value: "all", count: taskPresentations.value.length },
  { label: "进行中", value: "running", count: runningTasks.value.length },
  { label: "需处理", value: "attention", count: attentionTasks.value.length },
  { label: "已完成", value: "completed", count: completedTasks.value.length },
]);

const filteredTasks = computed(() => {
  let list = taskPresentations.value;
  if (taskFilter.value === "running") list = runningTasks.value;
  else if (taskFilter.value === "attention") list = attentionTasks.value;
  else if (taskFilter.value === "completed") list = completedTasks.value;
  const q = searchQuery.value.trim().toLocaleLowerCase();
  if (q) {
    list = list.filter((item) => {
      const hay = [
        item.prototypeLabel,
        item.scopeLabel,
        item.statusLabel,
        item.job.jobId,
        item.job.bundleId,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return hay.includes(q);
    });
  }
  return [...list].sort((left, right) => {
    const delta =
      new Date(right.job.acceptedAt).getTime() -
      new Date(left.job.acceptedAt).getTime();
    return sortOrder.value === "newest" ? delta : -delta;
  });
});

const pendingClearItem = computed(
  () =>
    taskPresentations.value.find(
      (item) => item.job.jobId === pendingClearJobId.value,
    ) ?? null,
);

async function openTask(item: CaptureTaskPresentation) {
  if (item.status === "running") {
    await capture.resumeJob(item.job);
    return;
  }
  if (item.resultPath) {
    await router.push(item.resultPath);
    return;
  }
  await capture.resumeJob(item.job);
}

async function viewResult(item: CaptureTaskPresentation, event: Event) {
  event.stopPropagation();
  if (item.resultPath) await router.push(item.resultPath);
}

function toggleSort() {
  sortOrder.value = sortOrder.value === "newest" ? "oldest" : "newest";
}

async function confirmClearItem() {
  const item = pendingClearItem.value;
  if (!item) return;
  pendingClearJobId.value = null;
  await capture.trashBundles([item.job.bundleId]);
}

async function confirmResetAll() {
  confirmClearAll.value = false;
  await capture.resetWorkspaceEvidence();
}

onMounted(async () => {
  if (!capture.connected) await capture.connect();
  else await capture.refreshConsole();
  pollTimer = setInterval(() => {
    if (capture.activeJob && !capture.jobFinished) {
      void capture.refreshActiveJob();
      void capture.refreshConsole();
    }
  }, 1000);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <main class="capture-console" data-testid="capture-console">
    <div class="console-frame">
      <header class="console-header">
        <div>
          <h1>采集历史</h1>
          <p>按时间查看每次采集。新建请从画布、检查面板或原型发起。</p>
        </div>
        <WorkbenchButton
          tone="danger"
          size="small"
          data-testid="clear-all-evidence"
          @click="confirmClearAll = true"
        >
          <Trash2 :size="14" /> 清空所有原型证据
        </WorkbenchButton>
      </header>

      <v-alert
        v-if="capture.lastError"
        type="error"
        variant="tonal"
        density="compact"
        closable
        @click:close="capture.clearError"
      >
        {{ capture.lastError }}
      </v-alert>

      <section v-if="!capture.connected" class="connection-panel">
        <CircleAlert :size="24" />
        <div>
          <strong>采集服务未连接</strong>
          <span>连接后即可查看采集历史。</span>
        </div>
        <WorkbenchButton :loading="capture.connecting" @click="capture.connect">
          重新连接
        </WorkbenchButton>
      </section>

      <template v-else>
        <section
          v-if="capture.draft && !capture.composerOpen"
          class="pending-draft"
        >
          <ScanLine :size="18" />
          <strong>有未完成的交付草稿</strong>
          <div>
            <WorkbenchButton tone="ghost" @click="capture.discardDraft"
              >放弃</WorkbenchButton
            >
            <WorkbenchButton tone="primary" @click="capture.openComposer"
              >继续</WorkbenchButton
            >
          </div>
        </section>

        <section class="toolbar">
          <WorkbenchTabs
            :model-value="taskFilter"
            :items="taskTabs"
            label="筛选采集历史"
            @update:model-value="taskFilter = $event as TaskFilter"
          />
          <label class="search">
            <Search :size="15" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="搜索原型、范围、Job…"
              aria-label="搜索采集历史"
            />
          </label>
          <WorkbenchButton size="small" tone="ghost" @click="toggleSort">
            <ArrowDownUp :size="14" />
            {{ sortOrder === "newest" ? "新→旧" : "旧→新" }}
          </WorkbenchButton>
        </section>

        <section class="history-section" data-testid="recent-capture-jobs">
          <div v-if="!filteredTasks.length" class="history-empty">
            <ScanLine :size="28" />
            <strong>还没有采集记录</strong>
            <p>去画布采一页 / 采控件，或在原型里「采原型」。</p>
          </div>

          <ul v-else class="history-list">
            <li
              v-for="item in filteredTasks"
              :key="item.job.jobId"
              class="history-item"
            >
              <button
                type="button"
                class="history-row"
                :data-job-id="item.job.jobId"
                :class="`is-${item.status}`"
                @click="openTask(item)"
              >
                <span class="status-mark" aria-hidden="true">
                  <CheckCircle2
                    v-if="
                      item.status === 'completed' || item.status === 'resolved'
                    "
                    :size="15"
                  />
                  <Play v-else-if="item.status === 'running'" :size="14" />
                  <CircleAlert v-else :size="15" />
                </span>
                <span class="history-main">
                  <strong
                    >{{ item.prototypeLabel }} · {{ item.scopeLabel }}</strong
                  >
                  <small>
                    {{ item.acceptedAtLabel }}
                    <template v-if="item.currentCaseLabel">
                      · 当前 {{ item.currentCaseLabel }}
                    </template>
                  </small>
                  <v-progress-linear
                    v-if="item.status === 'running'"
                    class="row-progress"
                    :model-value="item.progress"
                    color="primary"
                    height="4"
                    rounded
                  />
                </span>
                <span class="case-count" title="已完成 / 总 case">
                  <b>{{ item.completedCases }}</b
                  >/{{ item.viewCount }}
                  <em>case</em>
                </span>
                <span class="status-badge" :class="`is-${item.status}`">{{
                  item.statusLabel
                }}</span>
                <span class="row-icons">
                  <WorkbenchIconButton
                    v-if="item.resultPath"
                    label="查看结果"
                    size="small"
                    @click="viewResult(item, $event)"
                  >
                    <Eye :size="16" />
                  </WorkbenchIconButton>
                  <WorkbenchIconButton
                    v-if="item.status === 'needs-attention'"
                    label="重试"
                    size="small"
                    @click.stop="capture.retryJob(item.job)"
                  >
                    <RotateCcw :size="15" />
                  </WorkbenchIconButton>
                  <WorkbenchIconButton
                    label="清理此项"
                    size="small"
                    @click.stop="pendingClearJobId = item.job.jobId"
                  >
                    <Trash2 :size="15" />
                  </WorkbenchIconButton>
                </span>
              </button>
            </li>
          </ul>
        </section>
      </template>
    </div>

    <v-dialog v-model="confirmClearAll" max-width="440">
      <v-card>
        <v-card-title>清空所有原型证据？</v-card-title>
        <v-card-text>
          将重置当前 Workspace 的 Store、deliveries 与 reviews，并断开后重新连接。此操作不可恢复。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmClearAll = false">取消</v-btn>
          <v-btn
            color="error"
            :loading="capture.busy"
            data-testid="confirm-clear-all"
            @click="confirmResetAll"
          >
            确认清空
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="Boolean(pendingClearJobId)"
      max-width="420"
      @update:model-value="!$event && (pendingClearJobId = null)"
    >
      <v-card>
        <v-card-title>清理此项？</v-card-title>
        <v-card-text>
          将把 Bundle
          <code>{{ pendingClearItem?.job.bundleId }}</code>
          移入回收站（
          {{ pendingClearItem?.prototypeLabel }} ·
          {{ pendingClearItem?.scopeLabel }} ）。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="pendingClearJobId = null">取消</v-btn>
          <v-btn color="error" @click="confirmClearItem">确认清理</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </main>
</template>

<style scoped>
.capture-console {
  height: 100%;
  overflow: auto;
  padding: 20px 24px 40px;
}
.console-frame {
  width: min(1080px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 14px;
}
.console-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.console-header h1 {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
}
.console-header p {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.82rem;
}
.connection-panel,
.pending-draft,
.history-empty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}
.history-empty {
  flex-direction: column;
  justify-content: center;
  min-height: 180px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-align: center;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.search {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 200px;
  flex: 1 1 220px;
  padding: 6px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
}
.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font-size: 0.82rem;
}
.history-section {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.history-item + .history-item {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.history-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  gap: 10px 12px;
  align-items: center;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.history-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.035);
}
.status-mark {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.history-row.is-running .status-mark {
  color: rgb(var(--v-theme-primary));
}
.history-row.is-completed .status-mark,
.history-row.is-resolved .status-mark {
  color: rgb(var(--v-theme-success));
}
.history-row.is-needs-attention .status-mark {
  color: rgb(var(--v-theme-error));
}
.history-main {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.history-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}
.history-main small {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.72rem;
}
.row-progress {
  margin-top: 4px;
  max-width: 240px;
}
.case-count {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  font-size: 0.85rem;
}
.case-count b {
  font-size: 1.05rem;
  font-weight: 800;
}
.case-count em {
  margin-left: 2px;
  font-style: normal;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.7rem;
}
.status-badge {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  white-space: nowrap;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.status-badge.is-completed,
.status-badge.is-resolved {
  color: rgb(var(--v-theme-success));
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 12%, transparent);
}
.status-badge.is-running {
  color: rgb(var(--v-theme-primary));
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
}
.status-badge.is-needs-attention {
  color: rgb(var(--v-theme-error));
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 12%, transparent);
}
.row-icons {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
@media (max-width: 820px) {
  .history-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .case-count,
  .status-badge {
    grid-row: 2;
  }
  .row-icons {
    grid-column: 3;
    grid-row: 1 / span 2;
  }
}
</style>
