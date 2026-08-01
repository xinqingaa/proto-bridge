<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  Layers3,
  ListFilter,
  Play,
  RotateCcw,
  ShieldCheck,
  Trash2,
  ArchiveRestore,
  ScanLine,
  Square,
  SquareDashedMousePointer,
  X,
} from "lucide-vue-next";
import { useCaptureStore } from "@/app/stores/capture";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import {
  buildCaptureTaskPresentations,
  type CaptureTaskPresentation,
} from "@/capture/presentation";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchCheckbox from "@/workbench/ui/WorkbenchCheckbox.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";
import WorkbenchSelect from "@/workbench/ui/WorkbenchSelect.vue";
import WorkbenchTabs from "@/workbench/ui/WorkbenchTabs.vue";

type TaskFilter = "all" | "running" | "attention" | "completed";
type ConsoleView = "evidence" | "tasks";

const capture = useCaptureStore();
const router = useRouter();
const selectedPrototypeId = ref(
  loadPrototypes().find((prototype) => prototype.id === "ledger-planet")?.id ??
    loadPrototypes()[0]?.id ??
    "",
);
const taskFilter = ref<TaskFilter>("all");
const consoleView = ref<ConsoleView>("evidence");
const showTrashed = ref(false);
const selectedBundleIds = ref<string[]>([]);
let pollTimer: ReturnType<typeof setInterval> | undefined;

const prototypeItems = loadPrototypes().map((prototype) => ({
  label: prototype.label,
  value: prototype.id,
}));
const consoleTabs = [
  { label: "证据库", value: "evidence" },
  { label: "采集任务", value: "tasks" },
];
const inventoryScreens = computed(() => {
  const authored = loadPrototypeScreens().filter(
    (screen) => screen.prototypeId === selectedPrototypeId.value,
  );
  const inventory = capture.evidenceInventory?.prototypes.find(
    (item) => item.prototypeId === selectedPrototypeId.value,
  );
  return authored.map((screen) => ({
    screen,
    items: (
      inventory?.screens.find((item) => item.screenId === screen.screenId)
        ?.items ?? []
    ).filter((item) => showTrashed.value || item.status !== "trashed"),
  }));
});
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
const resultCount = computed(
  () =>
    capture.consoleState?.bundles.filter((item) => item.activeSnapshot)
      .length ?? 0,
);
const taskTabs = computed(() => [
  { label: "全部", value: "all", count: taskPresentations.value.length },
  { label: "进行中", value: "running", count: runningTasks.value.length },
  { label: "需处理", value: "attention", count: attentionTasks.value.length },
  { label: "已完成", value: "completed", count: completedTasks.value.length },
]);
const filteredTasks = computed(() => {
  if (taskFilter.value === "running") return runningTasks.value;
  if (taskFilter.value === "attention") return attentionTasks.value;
  if (taskFilter.value === "completed") return completedTasks.value;
  return taskPresentations.value;
});
const selectedTask = computed(
  () =>
    taskPresentations.value.find(
      (item) => item.job.jobId === capture.selectedJob?.jobId,
    ) ?? null,
);
const draftPrototypeLabel = computed(
  () =>
    loadPrototypes().find(
      (prototype) => prototype.id === capture.draft?.prototypeId,
    )?.label ?? capture.draft?.prototypeId,
);
const draftKindLabel = computed(
  () =>
    ({
      "current-screen": "当前页面",
      fragment: "选中区域",
      custom: "部分页面",
      prototype: "整个原型",
    })[capture.entryKind ?? "custom"],
);

function beginTask(kind: "custom" | "prototype") {
  if (kind === "custom") capture.beginCustom(selectedPrototypeId.value);
  else capture.beginPrototype(selectedPrototypeId.value);
  capture.openComposer();
}

async function openTask(item: CaptureTaskPresentation) {
  if (item.status === "completed" && item.resultPath) {
    await router.push(item.resultPath);
    return;
  }
  await capture.resumeJob(item.job);
}

async function viewResult(item: CaptureTaskPresentation) {
  if (item.resultPath) await router.push(item.resultPath);
}

async function retry(item: CaptureTaskPresentation) {
  await capture.retryJob(item.job);
}

function evidenceStatus(status: string): string {
  return (
    {
      fresh: "有效",
      stale: "已过期",
      unchecked: "未检查",
      partial: "部分完成",
      failed: "失败",
      archived: "已归档",
      trashed: "回收站",
    }[status] ?? status
  );
}

function bundleSelected(bundleId: string): boolean {
  return selectedBundleIds.value.includes(bundleId);
}

function toggleBundle(bundleId: string, selected: boolean) {
  selectedBundleIds.value = selected
    ? [...new Set([...selectedBundleIds.value, bundleId])]
    : selectedBundleIds.value.filter((item) => item !== bundleId);
  capture.deletePlan = null;
}

async function trashSelected() {
  await capture.trashBundles(selectedBundleIds.value);
  selectedBundleIds.value = [];
}

async function restoreSelected() {
  await capture.restoreBundles(selectedBundleIds.value);
  selectedBundleIds.value = [];
}

async function applyDeletePlan() {
  await capture.applyDeletePlan();
  selectedBundleIds.value = [];
}

async function openEvidence(bundleId: string, snapshotId: string) {
  await router.push(`/workbench/evidence/${bundleId}/${snapshotId}`);
}

onMounted(async () => {
  if (!capture.connected) await capture.connect();
  else await capture.refreshConsole();
  pollTimer = setInterval(() => {
    if (capture.activeJob && !capture.jobFinished) {
      void capture.refreshActiveJob();
    }
    void capture.refreshConsole();
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
        <h1>任务中心</h1>
        <div class="status-summary" aria-label="任务概况">
          <span v-if="runningTasks.length"
            ><Play :size="13" /> {{ runningTasks.length }} 个进行中</span
          >
          <span :class="{ attention: attentionTasks.length }"
            ><CircleAlert :size="13" />
            {{ attentionTasks.length }} 个需处理</span
          >
          <span><CheckCircle2 :size="13" /> {{ resultCount }} 个结果</span>
        </div>
      </header>

      <WorkbenchTabs
        :model-value="consoleView"
        :items="consoleTabs"
        label="任务中心视图"
        class="console-tabs"
        @update:model-value="consoleView = $event as ConsoleView"
      />

      <v-alert
        v-if="capture.lastError"
        class="operation-error"
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
          <span>连接后即可发起和查看采集任务。</span>
        </div>
        <WorkbenchButton :loading="capture.connecting" @click="capture.connect">
          重新连接
        </WorkbenchButton>
      </section>

      <template v-else>
        <section v-if="!capture.draft" class="new-task-bar">
          <div class="new-task-title">
            <ScanLine :size="18" />
            <strong>新建采集</strong>
          </div>
          <WorkbenchSelect
            :model-value="selectedPrototypeId"
            :items="prototypeItems"
            aria-label="选择原型"
            class="prototype-picker"
            @update:model-value="selectedPrototypeId = $event"
          />
          <WorkbenchButton @click="beginTask('custom')">
            <SquareDashedMousePointer :size="15" /> 选择页面
          </WorkbenchButton>
          <WorkbenchButton tone="primary" @click="beginTask('prototype')">
            <Layers3 :size="15" /> 整个原型
          </WorkbenchButton>
        </section>

        <section
          v-if="capture.draft && !capture.composerOpen"
          class="pending-draft"
        >
          <Clock3 :size="18" />
          <strong>{{ draftPrototypeLabel }} · {{ draftKindLabel }}</strong>
          <span>{{ capture.draft.screens.length }} 个页面</span>
          <div>
            <WorkbenchButton tone="ghost" @click="capture.discardDraft">
              放弃
            </WorkbenchButton>
            <WorkbenchButton tone="primary" @click="capture.openComposer">
              继续
            </WorkbenchButton>
          </div>
        </section>

        <section
          v-if="consoleView === 'evidence'"
          class="evidence-section"
          data-testid="evidence-inventory"
        >
          <div class="inventory-heading">
            <div>
              <ShieldCheck :size="17" />
              <h2>已采集证据</h2>
            </div>
            <WorkbenchCheckbox
              :model-value="showTrashed"
              label="显示回收站"
              @update:model-value="showTrashed = $event"
            />
          </div>
          <div v-if="selectedBundleIds.length" class="inventory-toolbar">
            <strong>已选择 {{ selectedBundleIds.length }} 个 Bundle</strong>
            <WorkbenchButton size="small" @click="trashSelected">
              <Trash2 :size="14" /> 移到回收站
            </WorkbenchButton>
            <WorkbenchButton size="small" @click="restoreSelected">
              <ArchiveRestore :size="14" /> 恢复
            </WorkbenchButton>
            <WorkbenchButton
              tone="danger"
              size="small"
              @click="capture.previewDeleteBundles(selectedBundleIds)"
            >
              预览永久删除
            </WorkbenchButton>
          </div>
          <div v-if="capture.deletePlan" class="delete-plan">
            <div>
              <strong>永久删除计划</strong>
              <small>
                {{ capture.deletePlan.candidates.length }} 个 Bundle；
                {{
                  capture.deletePlan.candidates.reduce(
                    (sum, item) => sum + item.blockedBy.length,
                    0,
                  )
                }} 个阻塞引用
              </small>
            </div>
            <WorkbenchButton
              tone="danger"
              size="small"
              :disabled="capture.deletePlan.candidates.some(item => item.blockedBy.length)"
              @click="applyDeletePlan"
            >
              确认永久删除
            </WorkbenchButton>
          </div>
          <div class="inventory-list">
            <details
              v-for="group in inventoryScreens"
              :key="group.screen.screenId"
              class="inventory-screen"
              :open="group.items.length > 0"
            >
              <summary>
                <span>
                  <strong>{{ group.screen.label }}</strong>
                  <small>{{ group.screen.screenId }}</small>
                </span>
                <b>{{ group.items.length ? `${group.items.length} 项` : "未采集" }}</b>
              </summary>
              <div v-if="group.items.length" class="evidence-rows">
                <article
                  v-for="item in group.items"
                  :key="`${item.bundleId}/${item.revisionId}`"
                  class="evidence-row"
                >
                  <WorkbenchCheckbox
                    :model-value="bundleSelected(item.bundleId)"
                    label="选择"
                    @update:model-value="toggleBundle(item.bundleId, $event)"
                  />
                  <span class="evidence-state" :class="`is-${item.status}`">
                    {{ evidenceStatus(item.status) }}
                  </span>
                  <span class="evidence-copy">
                    <strong>
                      {{ item.variantId }}
                      <template v-if="item.scenario">
                        · {{ item.scenario.scenarioId }} / {{ item.scenario.checkpointId }}
                      </template>
                    </strong>
                    <small>
                      {{ item.bundleId }} · {{ item.evidenceLevel }} ·
                      {{ item.screenshotCount }} 张截图 · 历史 {{ item.historyCount }}
                    </small>
                  </span>
                  <div class="evidence-actions">
                    <WorkbenchIconButton
                      label="查看证据"
                      size="small"
                      @click="openEvidence(item.bundleId, item.snapshotId)"
                    >
                      <Eye :size="15" />
                    </WorkbenchIconButton>
                    <WorkbenchIconButton
                      label="检查是否过期"
                      size="small"
                      @click="
                        capture.checkInventoryEvidence(
                          item.bundleId,
                          item.snapshotId,
                        )
                      "
                    >
                      <ShieldCheck :size="15" />
                    </WorkbenchIconButton>
                    <WorkbenchIconButton
                      label="重新采集此项"
                      size="small"
                      @click="capture.recaptureEvidence(item.bundleId, item.caseId)"
                    >
                      <RotateCcw :size="15" />
                    </WorkbenchIconButton>
                  </div>
                </article>
              </div>
              <p v-else>此页面还没有可查看的 Evidence。</p>
            </details>
          </div>
        </section>

        <section v-else class="task-section" data-testid="recent-capture-jobs">
          <div class="task-heading">
            <div>
              <ListFilter :size="17" />
              <h2>任务记录</h2>
            </div>
            <WorkbenchTabs
              :model-value="taskFilter"
              :items="taskTabs"
              label="筛选任务记录"
              @update:model-value="taskFilter = $event as TaskFilter"
            />
          </div>

          <div class="task-workspace" :class="{ 'has-detail': selectedTask }">
            <div class="task-list">
              <button
                v-for="item in filteredTasks.slice(0, 24)"
                :key="item.job.jobId"
                type="button"
                class="task-row"
                :data-job-id="item.job.jobId"
                :class="[
                  `is-${item.status}`,
                  { 'is-selected': selectedTask?.job.jobId === item.job.jobId },
                ]"
                @click="openTask(item)"
              >
                <span class="status-mark" aria-hidden="true">
                  <CheckCircle2
                    v-if="
                      item.status === 'completed' || item.status === 'resolved'
                    "
                    :size="16"
                  />
                  <Play v-else-if="item.status === 'running'" :size="15" />
                  <CircleAlert v-else :size="16" />
                </span>
                <span class="task-copy">
                  <strong>{{ item.prototypeLabel }}</strong>
                  <small
                    >{{ item.viewCount }} 个视图 ·
                    {{ item.acceptedAtLabel }}</small
                  >
                </span>
                <span class="task-status">{{ item.statusLabel }}</span>
                <ChevronRight :size="16" aria-hidden="true" />
              </button>

              <div v-if="!filteredTasks.length" class="task-empty">
                <CheckCircle2 :size="26" />
                <strong>这里没有任务</strong>
              </div>
            </div>

            <aside v-if="selectedTask" class="task-detail" aria-live="polite">
              <header>
                <div>
                  <span :class="`is-${selectedTask.status}`">{{
                    selectedTask.statusLabel
                  }}</span>
                  <h3>{{ selectedTask.prototypeLabel }}</h3>
                  <small
                    >{{ selectedTask.viewCount }} 个视图 ·
                    {{ selectedTask.acceptedAtLabel }}</small
                  >
                </div>
                <WorkbenchIconButton
                  label="关闭任务详情"
                  size="small"
                  @click="capture.clearSelectedJob"
                >
                  <X :size="16" />
                </WorkbenchIconButton>
              </header>

              <template v-if="selectedTask.status === 'running'">
                <div class="progress-copy">
                  <strong>正在采集</strong>
                  <span>{{ Math.round(selectedTask.progress) }}%</span>
                </div>
                <v-progress-linear
                  :model-value="selectedTask.progress"
                  color="primary"
                  height="7"
                  rounded
                />
                <WorkbenchButton
                  tone="danger"
                  size="small"
                  @click="capture.cancelActiveJob"
                >
                  <Square :size="14" /> 取消任务
                </WorkbenchButton>
              </template>

              <template v-else-if="selectedTask.status === 'completed'">
                <div class="completed-note">
                  <CheckCircle2 :size="18" />
                  <span>
                    <strong>证据已生成</strong>
                    可以查看截图、结构化证据和本次采集结果。
                  </span>
                </div>
                <div class="detail-actions">
                  <WorkbenchButton
                    v-if="selectedTask.resultPath"
                    tone="primary"
                    size="small"
                    @click="viewResult(selectedTask)"
                  >
                    <Eye :size="14" /> 查看采集结果
                  </WorkbenchButton>
                </div>
              </template>

              <template
                v-else-if="
                  selectedTask.status === 'needs-attention' ||
                  selectedTask.status === 'resolved'
                "
              >
                <div
                  v-if="selectedTask.status === 'resolved'"
                  class="resolved-note"
                >
                  <CheckCircle2 :size="18" />
                  <span>
                    <strong>这个问题已经解决</strong>
                    后续任务已成功采集相同范围，无需再次处理。
                  </span>
                </div>
                <div class="failure-list">
                  <article
                    v-for="failure in selectedTask.failures"
                    :key="failure.technicalDetail"
                  >
                    <CircleAlert :size="17" />
                    <div>
                      <strong>{{ failure.title }}</strong>
                      <p>{{ failure.message }}</p>
                    </div>
                  </article>
                </div>
                <div class="detail-actions">
                  <WorkbenchButton
                    v-if="selectedTask.resultPath"
                    tone="primary"
                    size="small"
                    @click="viewResult(selectedTask)"
                  >
                    查看成功结果
                  </WorkbenchButton>
                  <WorkbenchButton
                    v-if="selectedTask.status === 'needs-attention'"
                    size="small"
                    @click="retry(selectedTask)"
                  >
                    <RotateCcw :size="14" /> 重新采集
                  </WorkbenchButton>
                </div>
              </template>

              <details class="technical-detail">
                <summary>技术详情</summary>
                <dl>
                  <dt>任务</dt>
                  <dd>{{ selectedTask.job.jobId }}</dd>
                  <dt>结果集合</dt>
                  <dd>{{ selectedTask.job.bundleId }}</dd>
                </dl>
                <pre>{{
                  selectedTask.job.journal
                    .map(
                      (entry) =>
                        `${entry.at} · ${entry.event}${entry.detail ? ` · ${entry.detail}` : ""}`,
                    )
                    .join("\n")
                }}</pre>
              </details>
            </aside>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.capture-console {
  height: 100%;
  overflow: auto;
  padding: 30px;
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}
.console-frame {
  width: min(1120px, 100%);
  margin: 0 auto;
}
.console-header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}
.console-tabs {
  margin-bottom: 12px;
}
.console-header h1,
.task-heading h2,
.task-detail h3 {
  margin: 0;
}
.console-header h1 {
  font-size: 1.75rem;
  letter-spacing: -0.03em;
}
.status-summary {
  display: flex;
  align-items: center;
  gap: 7px;
}
.status-summary span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.045);
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.68rem;
  font-weight: 700;
}
.status-summary span.attention {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 9%, transparent);
  color: rgb(var(--v-theme-error));
}
.operation-error {
  margin-bottom: 12px;
}
.connection-panel,
.new-task-bar,
.pending-draft,
.evidence-section,
.task-section {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
.evidence-section {
  border-radius: 12px;
  overflow: hidden;
}
.inventory-heading,
.inventory-heading > div,
.inventory-screen summary,
.evidence-row {
  display: flex;
  align-items: center;
}
.inventory-heading {
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.inventory-toolbar,
.delete-plan {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.025);
}
.inventory-toolbar strong {
  margin-inline-end: auto;
  font-size: 0.75rem;
}
.delete-plan {
  justify-content: space-between;
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 7%, transparent);
}
.delete-plan > div {
  display: grid;
  gap: 2px;
}
.delete-plan small {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.7rem;
}
.inventory-heading > div {
  gap: 8px;
}
.inventory-heading h2 {
  margin: 0;
  font-size: 0.92rem;
}
.inventory-heading small {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.7rem;
}
.inventory-screen {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.inventory-screen:last-child {
  border-bottom: 0;
}
.inventory-screen summary {
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
}
.inventory-screen summary > span,
.evidence-copy {
  display: grid;
  gap: 2px;
}
.inventory-screen summary small,
.evidence-copy small,
.inventory-screen > p {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.68rem;
}
.inventory-screen summary b {
  font-size: 0.72rem;
}
.inventory-screen > p {
  margin: 0;
  padding: 0 16px 14px;
}
.evidence-rows {
  padding: 0 12px 12px;
}
.evidence-row {
  gap: 10px;
  min-height: 54px;
  padding: 8px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.evidence-state {
  width: 64px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.68rem;
  font-weight: 700;
}
.evidence-state.is-fresh {
  color: rgb(var(--v-theme-success));
}
.evidence-state.is-stale,
.evidence-state.is-failed,
.evidence-state.is-partial {
  color: rgb(var(--v-theme-error));
}
.evidence-copy {
  min-width: 0;
  flex: 1;
}
.evidence-copy strong {
  font-size: 0.77rem;
}
.evidence-actions {
  display: flex;
  gap: 4px;
}
.connection-panel,
.new-task-bar,
.pending-draft {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
}
.connection-panel div {
  display: grid;
  flex: 1;
  gap: 2px;
}
.connection-panel span,
.pending-draft > span {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.72rem;
}
.new-task-title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-right: auto;
}
.new-task-title svg {
  color: rgb(var(--v-theme-primary));
}
.prototype-picker {
  width: 220px;
}
.pending-draft {
  margin-top: 10px;
}
.pending-draft > div {
  display: flex;
  gap: 5px;
  margin-left: auto;
}
.task-section {
  margin-top: 14px;
  overflow: hidden;
  border-radius: 14px;
}
.task-heading {
  display: flex;
  min-height: 60px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.task-heading > div {
  display: flex;
  align-items: center;
  gap: 8px;
}
.task-heading h2 {
  font-size: 1rem;
}
.task-workspace {
  display: grid;
  grid-template-columns: 1fr;
}
.task-workspace.has-detail {
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.78fr);
}
.task-list {
  min-width: 0;
}
.task-row {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 11px;
  padding: 10px 14px;
  border: 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.task-row:hover,
.task-row.is-selected {
  background: rgba(var(--v-theme-on-surface), 0.035);
}
.task-row.is-needs-attention {
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-error)) 3%,
    rgb(var(--v-theme-surface))
  );
}
.status-mark {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 10%, transparent);
  color: rgb(var(--v-theme-success));
}
.is-running .status-mark {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
  color: rgb(var(--v-theme-primary));
}
.is-needs-attention .status-mark {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 10%, transparent);
  color: rgb(var(--v-theme-error));
}
.task-copy {
  display: grid;
  gap: 3px;
}
.task-copy small,
.task-detail small {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
}
.task-status {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.7rem;
  font-weight: 700;
}
.is-needs-attention .task-status {
  color: rgb(var(--v-theme-error));
}
.task-empty {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: rgba(var(--v-theme-on-surface), 0.46);
}
.task-detail {
  min-width: 0;
  padding: 16px;
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.018);
}
.task-detail > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}
.task-detail > header span {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.67rem;
  font-weight: 800;
}
.task-detail > header span.is-needs-attention {
  color: rgb(var(--v-theme-error));
}
.task-detail h3 {
  margin-top: 4px;
}
.progress-copy {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.75rem;
}
.task-detail .wb-button {
  margin-top: 12px;
}
.resolved-note,
.completed-note {
  display: flex;
  gap: 9px;
  padding: 11px;
  border-radius: 9px;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 9%, transparent);
  color: rgb(var(--v-theme-success));
}
.resolved-note span,
.completed-note span {
  display: grid;
  gap: 2px;
  font-size: 0.7rem;
}
.failure-list {
  display: grid;
  gap: 7px;
  margin-top: 10px;
}
.failure-list article {
  display: flex;
  gap: 8px;
  padding: 10px;
  border: 1px solid
    color-mix(in srgb, rgb(var(--v-theme-error)) 16%, transparent);
  border-radius: 9px;
  background: rgb(var(--v-theme-surface));
}
.failure-list article > svg {
  flex: 0 0 auto;
  color: rgb(var(--v-theme-error));
}
.failure-list p {
  margin: 3px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.7rem;
  line-height: 1.5;
}
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.technical-detail {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.67rem;
}
.technical-detail dl {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr);
  gap: 5px 8px;
}
.technical-detail dd {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
}
.technical-detail pre {
  overflow: auto;
  max-height: 180px;
  padding: 8px;
  border-radius: 7px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  white-space: pre-wrap;
}
@media (max-width: 900px) {
  .capture-console {
    padding: 18px;
  }
  .console-header,
  .task-heading,
  .new-task-bar {
    align-items: flex-start;
    flex-direction: column;
  }
  .prototype-picker {
    width: 100%;
  }
  .task-workspace.has-detail {
    grid-template-columns: 1fr;
  }
  .task-detail {
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-left: 0;
  }
}
</style>
