<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import {
  Archive,
  Camera,
  CheckCircle2,
  CircleAlert,
  Copy,
  FileClock,
  GitFork,
  Layers3,
  PanelTop,
  Play,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Square,
  SquareDashedMousePointer,
} from "lucide-vue-next";
import type { RiskKind } from "@proto-bridge/core/v2";
import { useCaptureStore } from "@/app/stores/capture";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchSelect from "@/workbench/ui/WorkbenchSelect.vue";

const capture = useCaptureStore();
const router = useRouter();
const selectedPrototypeId = ref("ledger-planet");
const targetBundleId = ref("");
const implementationIntent = ref("");
const copied = ref(false);
let pollTimer: ReturnType<typeof setInterval> | undefined;
let copyTimer: ReturnType<typeof setTimeout> | undefined;

const prototypeScreens = computed(() =>
  loadPrototypeScreens().filter(
    (screen) => screen.prototypeId === capture.draft?.prototypeId,
  ),
);
const matrix = computed(() => capture.preflight?.result.matrix ?? []);
const visibleMatrix = computed(() => matrix.value.slice(0, 50));
const completedCases = computed(
  () =>
    capture.activeJob?.journal.filter(
      (entry) => entry.event === "case-finished",
    ).length ?? 0,
);
const latestFailure = computed(
  () =>
    [...(capture.activeJob?.journal ?? [])]
      .reverse()
      .find(
        (entry) =>
          entry.event === "case-finished" && entry.detail?.includes(":failed:"),
      )?.detail,
);
const jobProgress = computed(() => {
  const total = capture.activeJob?.selection.cases.length ?? 0;
  return total === 0 ? 0 : Math.min(100, (completedCases.value / total) * 100);
});
const sourcePolicy = computed(
  () =>
    capture.draft?.screens.some((screen) => screen.captureScope.sourcePolicy) ??
    false,
);
const allRisksAccepted = computed(() => {
  const required = new Set(
    capture.handoffPreview?.risks.map((risk) => risk.kind) ?? [],
  );
  const accepted = new Set(capture.acknowledgedRiskKinds);
  return [...required].every((kind) => accepted.has(kind));
});
const activeIssues = computed(() =>
  (capture.details?.activeRevisions ?? []).flatMap((revision) =>
    revision.facts
      .filter((fact) => fact.resolution !== "resolved")
      .map((fact) => ({
        revisionId: revision.revisionId,
        factId: fact.factId,
        resolution: fact.resolution,
      })),
  ),
);
const staleCount = computed(
  () =>
    capture.stalenessReport?.perRevision.filter((entry) => entry.stale)
      .length ?? 0,
);
const writableBundles = computed(
  () =>
    capture.consoleState?.bundles.filter(
      (item) =>
        item.bundle.status === "writable" &&
        item.bundle.prototypeId === capture.draft?.prototypeId,
    ) ?? [],
);
const prototypeItems = loadPrototypes().map((prototype) => ({
  label: prototype.label,
  value: prototype.id,
}));
const runningJobs = computed(
  () =>
    capture.consoleState?.jobs.filter((job) =>
      ["queued", "discovering", "capturing", "writing"].includes(job.status),
    ) ?? [],
);
const attentionJobs = computed(
  () =>
    capture.consoleState?.jobs.filter((job) =>
      ["failed", "interrupted"].includes(job.status),
    ) ?? [],
);
const completedJobs = computed(
  () =>
    capture.consoleState?.jobs.filter((job) => job.status === "completed") ??
    [],
);
const statusLabels: Record<string, string> = {
  queued: "等待开始",
  discovering: "正在准备",
  capturing: "正在采集",
  writing: "正在保存",
  completed: "已完成",
  failed: "失败，需处理",
  cancelled: "已取消",
  interrupted: "已中断，需处理",
};

function jobStatusLabel(status: string): string {
  return statusLabels[status] ?? status;
}

function jobActionLabel(status: string): string {
  if (status === "completed") return "查看结果";
  if (["queued", "discovering", "capturing", "writing"].includes(status)) {
    return "查看进度";
  }
  return "处理任务";
}

async function openJob(
  job: NonNullable<typeof capture.consoleState>["jobs"][number],
) {
  if (job.status === "completed") {
    const summary = capture.consoleState?.bundles.find(
      (item) => item.bundle.bundleId === job.bundleId,
    );
    if (summary?.activeSnapshot) {
      await router.push(
        `/workbench/evidence/${job.bundleId}/${summary.activeSnapshot.snapshotId}`,
      );
      return;
    }
  }
  await capture.resumeJob(job);
}

function beginTask(kind: "custom" | "prototype") {
  if (kind === "custom") capture.beginCustom(selectedPrototypeId.value);
  else capture.beginPrototype(selectedPrototypeId.value);
  capture.openComposer();
}

watch(
  () => capture.recaptureBundleId,
  (bundleId) => {
    if (bundleId) targetBundleId.value = bundleId;
  },
);

function variantMode(screenId: string): string {
  return (
    capture.draft?.screens.find((screen) => screen.screenId === screenId)
      ?.variants.mode ?? "default"
  );
}

function scenarioMode(screenId: string): string {
  return (
    capture.draft?.screens.find((screen) => screen.screenId === screenId)
      ?.scenarios.mode ?? "none"
  );
}

function isSelected(screenId: string): boolean {
  return (
    capture.draft?.screens.some((screen) => screen.screenId === screenId) ??
    false
  );
}

function selectCustomScreen(screenId: string, event: Event) {
  capture.toggleCustomScreen(
    screenId,
    (event.target as HTMLInputElement).checked,
  );
}

function setVariant(screenId: string, event: Event) {
  capture.setVariantMode(
    screenId,
    (event.target as HTMLSelectElement).value as
      "default" | "critical" | "default-and-critical" | "all" | "explicit",
  );
}

function setScenario(screenId: string, event: Event) {
  capture.setScenarioMode(
    screenId,
    (event.target as HTMLSelectElement).value as
      "none" | "critical" | "all" | "explicit",
  );
}

function toggleSource(event: Event) {
  capture.setSourcePolicy((event.target as HTMLInputElement).checked);
}

function toggleWarning(warningId: string, event: Event) {
  capture.toggleWarning(warningId, (event.target as HTMLInputElement).checked);
}

function toggleRisk(kind: RiskKind, event: Event) {
  capture.toggleRisk(kind, (event.target as HTMLInputElement).checked);
}

async function copyHandoff() {
  if (!capture.handoff) return;
  await navigator.clipboard.writeText(JSON.stringify(capture.handoff, null, 2));
  copied.value = true;
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copied.value = false;
  }, 1600);
}

onMounted(async () => {
  if (!capture.connected) await capture.connect();
  else await capture.refreshConsole();
  pollTimer = setInterval(() => {
    if (capture.activeJob && !capture.jobFinished) {
      void capture.refreshActiveJob();
    }
  }, 700);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
  if (copyTimer) clearTimeout(copyTimer);
  capture.revokeScreenshotUrls();
});
</script>

<template>
  <main class="capture-console" data-testid="capture-console">
    <header class="console-header">
      <div>
        <span class="eyebrow"><ScanLine :size="15" /> 采集工作区</span>
        <h1>任务中心</h1>
        <p>先处理异常和进行中的任务；完成后到“采集结果”检查证据。</p>
      </div>
      <RouterLink :to="capture.returnTo" class="return-link"
        >返回工作台</RouterLink
      >
    </header>

    <v-alert
      v-if="capture.lastError"
      type="error"
      variant="tonal"
      closable
      data-testid="capture-error"
      @click:close="capture.clearError"
    >
      <strong>{{ capture.lastErrorCode }}</strong>
      {{ capture.lastError }}
    </v-alert>

    <section v-if="!capture.connected" class="panel connection-panel">
      <CircleAlert :size="28" />
      <div>
        <h2>Local Service 未连接</h2>
        <p>启动本地服务后重试。当前 Draft 会保留，不会退回或创建 Job。</p>
      </div>
      <v-btn
        color="primary"
        :loading="capture.connecting"
        @click="capture.connect"
      >
        重新连接
      </v-btn>
    </section>

    <template v-else>
      <div class="service-strip" role="status">
        <span class="status-dot" />
        <strong>Local Service 已连接</strong>
        <span>{{ capture.session?.workspaceId }}</span>
        <span v-if="capture.session?.finalizedOrphanJobIds.length">
          已恢复
          {{ capture.session.finalizedOrphanJobIds.length }} 个 interrupted Job
        </span>
      </div>

      <section class="task-overview" aria-label="任务概况">
        <article :class="{ 'needs-attention': attentionJobs.length }">
          <span>需要处理</span>
          <strong>{{ attentionJobs.length }}</strong>
          <small>{{
            attentionJobs.length ? "失败或中断的任务等待处理" : "当前没有阻塞项"
          }}</small>
        </article>
        <article>
          <span>正在运行</span>
          <strong>{{ runningJobs.length }}</strong>
          <small>{{
            runningJobs.length ? "可离开页面，任务会继续" : "当前没有后台采集"
          }}</small>
        </article>
        <article>
          <span>已有结果</span>
          <strong>{{ completedJobs.length }}</strong>
          <small>从左侧“采集结果”进入逐页检查</small>
        </article>
      </section>

      <section v-if="!capture.draft" class="panel entry-panel">
        <div class="section-heading">
          <div>
            <span class="step-label">新任务</span>
            <h2>发起新的采集</h2>
          </div>
          <WorkbenchSelect
            :model-value="selectedPrototypeId"
            :items="prototypeItems"
            label="选择原型"
            class="prototype-picker"
            @update:model-value="selectedPrototypeId = $event"
          />
        </div>
        <div class="entry-grid">
          <button type="button" class="entry-card" @click="beginTask('custom')">
            <SquareDashedMousePointer :size="25" />
            <strong>选择部分页面</strong>
            <span>只采集你指定的页面，之后统一设置状态与场景。</span>
          </button>
          <button
            type="button"
            class="entry-card"
            @click="beginTask('prototype')"
          >
            <Layers3 :size="25" />
            <strong>采集整个原型</strong>
            <span>包含全部页面；默认只采集每页默认状态。</span>
          </button>
        </div>
        <p class="entry-note">
          单页采集在画布底部工具栏；元素采集在右侧元素检查面板。
        </p>
      </section>

      <section
        v-if="capture.draft && !capture.composerOpen"
        class="panel pending-draft"
      >
        <div>
          <span class="step-label">待开始</span>
          <h2>
            {{
              {
                "current-screen": "当前页面采集",
                fragment: "稳定元素采集",
                custom: "部分页面采集",
                prototype: "整个原型采集",
              }[capture.entryKind ?? "custom"]
            }}
          </h2>
          <p>
            {{ capture.draft.prototypeId }} ·
            {{
              capture.draft.screens.length
            }}
            个页面。范围检查会在打开后自动执行。
          </p>
        </div>
        <div class="pending-actions">
          <WorkbenchButton tone="ghost" @click="capture.discardDraft">
            放弃草稿
          </WorkbenchButton>
          <WorkbenchButton tone="primary" @click="capture.openComposer">
            继续设置并开始
          </WorkbenchButton>
        </div>
      </section>

      <section
        v-if="capture.consoleState?.jobs.length"
        class="panel recent-jobs"
        data-testid="recent-capture-jobs"
      >
        <div class="section-heading">
          <div>
            <span class="step-label">任务记录</span>
            <h2>最近任务</h2>
          </div>
          <v-btn size="small" variant="text" @click="capture.refreshConsole">
            <RefreshCw :size="15" /> 刷新
          </v-btn>
        </div>
        <article
          v-for="job in capture.consoleState.jobs.slice(0, 8)"
          :key="job.jobId"
          class="recent-job"
        >
          <div>
            <strong>{{ jobStatusLabel(job.status) }}</strong>
            <code>{{ job.jobId }}</code>
            <span
              >{{ job.selection.cases.length }} 个采集项 ·
              {{ job.bundleId }}</span
            >
          </div>
          <WorkbenchButton
            size="small"
            :tone="job.status === 'completed' ? 'primary' : 'neutral'"
            @click="openJob(job)"
          >
            {{ jobActionLabel(job.status) }}
          </WorkbenchButton>
        </article>
      </section>

      <section
        v-if="capture.draft && capture.composerOpen"
        class="panel draft-panel"
        aria-hidden="true"
      >
        <div class="section-heading">
          <div>
            <span class="step-label">Selection Draft</span>
            <h2>
              {{
                {
                  "current-screen": "当前 Screen",
                  fragment: "选中 Fragment",
                  custom: "自定义范围",
                  prototype: "整个 Prototype",
                }[capture.entryKind ?? "custom"]
              }}
            </h2>
          </div>
          <div class="draft-summary">
            <span>{{ capture.draft.prototypeId }}</span>
            <strong>{{ capture.draft.screens.length }} Screen</strong>
          </div>
        </div>

        <div
          v-if="capture.entryKind === 'custom'"
          class="screen-selector"
          aria-label="选择 Screen"
        >
          <label
            v-for="screen in prototypeScreens"
            :key="screen.screenId"
            class="screen-check"
          >
            <input
              type="checkbox"
              :checked="isSelected(screen.screenId)"
              @change="selectCustomScreen(screen.screenId, $event)"
            />
            <span>{{ screen.label }}</span>
          </label>
        </div>

        <div v-if="capture.entryKind === 'prototype'" class="prototype-policy">
          <label>
            全局 Variant
            <select
              data-testid="prototype-variant-policy"
              @change="
                capture.setAllVariantMode(
                  ($event.target as HTMLSelectElement).value as
                    'default' | 'critical' | 'default-and-critical' | 'all',
                )
              "
            >
              <option value="default">default</option>
              <option value="critical">critical</option>
              <option value="default-and-critical">default + critical</option>
              <option value="all">all</option>
            </select>
          </label>
          <label>
            全局 Scenario
            <select
              data-testid="prototype-scenario-policy"
              @change="
                capture.setAllScenarioMode(
                  ($event.target as HTMLSelectElement).value as
                    'none' | 'critical' | 'all',
                )
              "
            >
              <option value="none">none</option>
              <option value="critical">critical</option>
              <option value="all">all</option>
            </select>
          </label>
          <span>all 不是默认值；修改后必须重新 Preflight。</span>
        </div>

        <div class="draft-table-wrap">
          <table class="draft-table">
            <thead>
              <tr>
                <th>Screen</th>
                <th>Variant 策略</th>
                <th>Scenario 策略</th>
                <th>Theme / Device</th>
                <th>Fragment</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="screen in capture.draft.screens"
                :key="`${screen.screenId}-${JSON.stringify(screen.captureScope.fragments)}`"
              >
                <td>
                  <strong>{{ screen.screenId }}</strong>
                </td>
                <td>
                  <select
                    :value="variantMode(screen.screenId)"
                    aria-label="Variant 策略"
                    @change="setVariant(screen.screenId, $event)"
                  >
                    <option value="default">default</option>
                    <option value="critical">critical</option>
                    <option value="default-and-critical">
                      default + critical
                    </option>
                    <option value="all">all</option>
                    <option value="explicit">explicit</option>
                  </select>
                </td>
                <td>
                  <select
                    :value="scenarioMode(screen.screenId)"
                    aria-label="Scenario 策略"
                    @change="setScenario(screen.screenId, $event)"
                  >
                    <option value="none">none</option>
                    <option value="critical">critical</option>
                    <option value="all">all</option>
                  </select>
                </td>
                <td>
                  {{ screen.themeIds.join(", ") }} /
                  {{ screen.deviceIds.join(", ") }}
                </td>
                <td>
                  {{
                    screen.captureScope.fragments.length
                      ? screen.captureScope.fragments
                          .map(
                            (fragment) =>
                              `${fragment.pbId}${fragment.pbKey ? `#${fragment.pbKey}` : ""}`,
                          )
                          .join(", ")
                      : "完整 Case"
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="draft-options">
          <label>
            <input
              type="checkbox"
              :checked="sourcePolicy"
              @change="toggleSource"
            />
            请求 Source Evidence
          </label>
          <span>
            Screenshot：{{
              capture.draft.screens[0]?.captureScope.screenshots.mode
            }}
          </span>
          <span>预计数量由 Core Preflight 计算</span>
        </div>

        <div class="action-row">
          <v-btn
            color="primary"
            :loading="capture.busy"
            :disabled="capture.draft.screens.length === 0"
            data-testid="run-preflight"
            @click="capture.runPreflight"
          >
            <ScanLine :size="17" /> 执行 Preflight
          </v-btn>
        </div>
      </section>

      <section
        v-if="capture.preflight && capture.composerOpen"
        class="panel matrix-panel"
        aria-hidden="true"
      >
        <div class="section-heading">
          <div>
            <span class="step-label">Case Matrix</span>
            <h2>{{ matrix.length }} 个 Case</h2>
          </div>
          <div class="matrix-metrics">
            <span>Screenshot ≤ {{ matrix.length }}</span>
            <span>上限检查通过</span>
            <span
              >有效至
              {{
                new Date(capture.preflight.expiresAt).toLocaleTimeString()
              }}</span
            >
          </div>
        </div>

        <div
          v-for="warning in capture.preflight.result.warnings"
          :key="warning.warningId"
          class="warning-card"
        >
          <ShieldAlert :size="20" />
          <div>
            <strong>{{ warning.warningId }}</strong>
            <p>{{ warning.message }}</p>
            <small>影响 {{ warning.caseIds.length }} 个 Case</small>
          </div>
          <label>
            <input
              type="checkbox"
              :checked="capture.acceptedWarningIds.includes(warning.warningId)"
              @change="toggleWarning(warning.warningId, $event)"
            />
            明确接受
          </label>
        </div>

        <div class="matrix-list">
          <article
            v-for="entry in visibleMatrix"
            :key="`${entry.selectedCase.caseId}-${JSON.stringify(entry.selectedCase.captureScope)}`"
            class="matrix-row"
          >
            <PanelTop :size="17" />
            <div>
              <strong>{{ entry.selectedCase.caseKey.screenId }}</strong>
              <span>
                {{ entry.selectedCase.caseKey.variantId }} ·
                {{ entry.selectedCase.caseKey.themeId }} ·
                {{ entry.selectedCase.caseKey.deviceId }}
              </span>
            </div>
            <code>{{ entry.selectedCase.caseId }}</code>
          </article>
          <p v-if="matrix.length > visibleMatrix.length" class="list-note">
            已显示前 {{ visibleMatrix.length }} 项；执行仍使用完整 Matrix。
          </p>
        </div>

        <div class="job-create-row">
          <v-alert
            v-if="capture.recaptureBundleId"
            type="info"
            variant="tonal"
            density="compact"
          >
            当前 Draft 将追加到原 Bundle
            <code>{{ capture.recaptureBundleId }}</code>
          </v-alert>
          <v-select
            v-model="targetBundleId"
            :items="[
              { title: '创建新 Bundle', value: '' },
              ...writableBundles.map((item) => ({
                title: `${item.bundle.bundleId} · ${item.bundle.prototypeId}`,
                value: item.bundle.bundleId,
              })),
            ]"
            label="目标 Bundle"
            hide-details
            max-width="420"
          />
          <v-btn
            color="primary"
            :disabled="!capture.warningsAccepted"
            :loading="capture.busy"
            data-testid="create-capture-job"
            @click="capture.createJob(targetBundleId || undefined)"
          >
            <Play :size="17" /> 创建 Capture Job
          </v-btn>
        </div>
      </section>

      <section
        v-if="capture.activeJob"
        class="panel job-panel"
        aria-live="polite"
      >
        <div class="section-heading">
          <div>
            <span class="step-label">Capture Job</span>
            <h2>{{ capture.activeJob.status }}</h2>
          </div>
          <code>{{ capture.activeJob.jobId }}</code>
        </div>
        <v-progress-linear
          :model-value="jobProgress"
          color="primary"
          height="8"
          rounded
        />
        <div class="job-stats">
          <strong>
            {{ completedCases }} /
            {{ capture.activeJob.selection.cases.length }} Case
          </strong>
          <span>{{ capture.activeJob.journal.at(-1)?.detail }}</span>
          <span>关闭页面不会取消后台 Job</span>
        </div>
        <v-alert
          v-if="capture.activeJob.status === 'failed' && latestFailure"
          type="error"
          variant="tonal"
          density="compact"
        >
          {{ latestFailure }}
        </v-alert>
        <div class="action-row">
          <v-btn
            v-if="!capture.jobFinished"
            color="error"
            variant="outlined"
            @click="capture.cancelActiveJob"
          >
            <Square :size="16" /> 取消
          </v-btn>
          <v-btn v-else variant="outlined" @click="capture.retryActiveJob">
            <RotateCcw :size="16" /> 创建 retry Draft
          </v-btn>
        </div>
      </section>

      <section v-if="capture.details" class="panel evidence-panel">
        <div class="section-heading">
          <div>
            <span class="step-label">Snapshot Evidence</span>
            <h2>{{ capture.details.activeSnapshot.snapshotId }}</h2>
          </div>
          <span
            class="status-pill"
            :class="{
              partial:
                capture.details.activeSnapshot.coverage.counts.failed > 0 ||
                capture.details.activeSnapshot.coverage.counts.missing > 0,
            }"
          >
            {{
              capture.details.activeSnapshot.coverage.counts.failed > 0 ||
              capture.details.activeSnapshot.coverage.counts.missing > 0
                ? "partial"
                : "complete"
            }}
          </span>
        </div>

        <div class="coverage-grid">
          <div
            v-for="(value, key) in capture.details.activeSnapshot.coverage
              .counts"
            :key="key"
            class="coverage-card"
          >
            <span>{{ key }}</span>
            <strong>{{ value }}</strong>
          </div>
        </div>

        <div v-if="activeIssues.length" class="issues">
          <h3>Issue / unknown</h3>
          <article
            v-for="issue in activeIssues"
            :key="`${issue.revisionId}-${issue.factId}`"
          >
            <CircleAlert :size="17" />
            <strong>{{ issue.resolution }}</strong>
            <span>{{ issue.factId }}</span>
          </article>
        </div>

        <div
          v-if="Object.keys(capture.screenshotUrls).length"
          class="screenshots"
        >
          <h3>Screenshot</h3>
          <div class="screenshot-grid">
            <figure
              v-for="blob in capture.details.blobs.filter(
                (item) => item.kind === 'screenshot',
              )"
              :key="blob.blobId"
            >
              <img
                :src="capture.screenshotUrls[blob.blobId]"
                alt="Capture screenshot"
              />
              <figcaption>{{ blob.blobId }}</figcaption>
            </figure>
          </div>
        </div>

        <div class="stale-row">
          <div>
            <strong>Freshness</strong>
            <span v-if="capture.stalenessReport">
              {{ staleCount ? `${staleCount} stale` : "fresh" }}
            </span>
            <span v-else>尚未检查当前 Producer 输入</span>
          </div>
          <v-btn variant="outlined" @click="capture.checkStaleness">
            <RefreshCw :size="16" /> 刷新 stale
          </v-btn>
          <v-btn
            v-if="staleCount > 0"
            color="primary"
            variant="tonal"
            data-testid="create-stale-recapture-draft"
            @click="capture.createStaleRecaptureDraft"
          >
            <RotateCcw :size="16" /> 仅重采 stale
          </v-btn>
        </div>

        <div class="bundle-actions">
          <v-btn
            variant="outlined"
            :disabled="capture.details.bundle.status === 'archived'"
            @click="capture.forkCurrentBundle"
          >
            <GitFork :size="16" /> Fork
          </v-btn>
          <v-btn
            variant="outlined"
            color="warning"
            :disabled="capture.details.bundle.status === 'archived'"
            @click="capture.archiveCurrentBundle"
          >
            <Archive :size="16" /> Archive
          </v-btn>
        </div>

        <div class="handoff-box">
          <div>
            <FileClock :size="21" />
            <div>
              <h3>交给 Agent</h3>
              <p>Handoff 固定当前 Snapshot 与具体 revision，不跟随后续重采。</p>
            </div>
          </div>
          <v-textarea
            v-model="implementationIntent"
            label="实现意图"
            rows="2"
          />
          <v-btn
            variant="outlined"
            @click="capture.previewCurrentHandoff(implementationIntent)"
          >
            检查 Handoff 风险
          </v-btn>
          <div v-if="capture.handoffPreview?.risks.length" class="risk-list">
            <label
              v-for="risk in capture.handoffPreview.risks"
              :key="`${risk.kind}-${risk.message}`"
            >
              <input
                type="checkbox"
                :checked="capture.acknowledgedRiskKinds.includes(risk.kind)"
                @change="toggleRisk(risk.kind, $event)"
              />
              <span>
                <strong>{{ risk.kind }}</strong>
                {{ risk.message }}
              </span>
            </label>
          </div>
          <v-btn
            v-if="capture.handoffPreview"
            color="primary"
            :disabled="!allRisksAccepted"
            data-testid="create-handoff"
            @click="capture.createCurrentHandoff(implementationIntent)"
          >
            创建固定 Handoff
          </v-btn>
          <div v-if="capture.handoff" class="handoff-result">
            <CheckCircle2 :size="20" />
            <div>
              <strong>{{ capture.handoff.handoffId }}</strong>
              <span>Snapshot：{{ capture.handoff.snapshotId }}</span>
            </div>
            <v-btn size="small" variant="text" @click="copyHandoff">
              <Copy :size="15" /> {{ copied ? "已复制" : "复制" }}
            </v-btn>
          </div>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.capture-console {
  height: 100%;
  overflow: auto;
  padding: 28px;
  background:
    radial-gradient(
      circle at 10% 0%,
      rgba(63, 108, 255, 0.08),
      transparent 34%
    ),
    rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}
.console-header,
.section-heading,
.job-create-row,
.stale-row,
.bundle-actions,
.service-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.console-header {
  margin: 0 auto 22px;
  max-width: 1180px;
}
.console-header h1,
.panel h2,
.panel h3,
.console-header p {
  margin: 0;
}
.console-header h1 {
  margin-top: 4px;
  font-size: 32px;
}
.console-header p {
  margin-top: 6px;
  color: rgb(var(--v-theme-on-surface-variant));
}
.eyebrow,
.step-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.return-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 650;
  text-decoration: none;
}
.panel,
.service-strip {
  max-width: 1180px;
  margin: 0 auto 18px;
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 18px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 12px 36px rgba(20, 31, 52, 0.06);
}
.task-overview {
  display: grid;
  max-width: 1180px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0 auto 18px;
}
.task-overview article {
  display: grid;
  gap: 3px;
  padding: 17px 18px;
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 15px;
  background: rgb(var(--v-theme-surface));
}
.task-overview article.needs-attention {
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-warning)) 45%,
    transparent
  );
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-warning)) 7%,
    rgb(var(--v-theme-surface))
  );
}
.task-overview span,
.task-overview small {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
}
.task-overview strong {
  font-size: 26px;
}
.prototype-picker {
  width: min(300px, 40vw);
}
.pending-draft {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.pending-draft p {
  margin: 6px 0 0;
  color: rgb(var(--v-theme-on-surface-variant));
}
.pending-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}
.panel {
  padding: 22px;
}
.service-strip {
  justify-content: flex-start;
  padding: 10px 16px;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 13px;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #20a464;
  box-shadow: 0 0 0 4px rgba(32, 164, 100, 0.12);
}
.connection-panel {
  display: flex;
  align-items: center;
  gap: 18px;
}
.connection-panel div {
  flex: 1;
}
.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}
.entry-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 5px 12px;
  min-height: 118px;
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface-variant));
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.entry-card:hover {
  border-color: rgb(var(--v-theme-primary));
}
.entry-card svg {
  grid-row: 1 / span 2;
  color: rgb(var(--v-theme-primary));
}
.entry-card span,
.entry-note,
.matrix-row span,
.job-stats,
.handoff-box p {
  color: rgb(var(--v-theme-on-surface-variant));
}
.entry-note {
  margin: 16px 0 0;
  font-size: 13px;
}
.draft-summary,
.matrix-metrics,
.draft-options,
.job-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 13px;
}
.screen-selector {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 14px 0;
}
.prototype-policy {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.06);
}
.prototype-policy label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 650;
}
.prototype-policy select {
  padding: 6px;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  border-radius: 7px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
}
.screen-check,
.draft-options label,
.warning-card label,
.risk-list label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.screen-check {
  flex: 0 0 auto;
  padding: 8px 10px;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 9px;
}
.draft-table-wrap {
  overflow: auto;
  margin: 16px 0;
  max-height: 430px;
}
.draft-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.draft-table th,
.draft-table td {
  padding: 11px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
  vertical-align: top;
}
.draft-table select {
  min-width: 130px;
  padding: 6px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 7px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
}
.draft-options,
.action-row {
  margin-top: 16px;
}
.action-row,
.bundle-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.warning-card,
.matrix-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
}
.warning-card {
  margin-top: 14px;
  background: rgba(243, 160, 35, 0.1);
}
.warning-card div,
.matrix-row div {
  flex: 1;
}
.warning-card p {
  margin: 3px 0;
}
.matrix-list {
  max-height: 390px;
  overflow: auto;
  margin: 16px 0;
}
.matrix-row {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.matrix-row div {
  display: grid;
}
.matrix-row code {
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.job-create-row {
  justify-content: flex-end;
}
.job-stats {
  margin-top: 12px;
  justify-content: space-between;
}
.recent-job {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.recent-job > div {
  display: grid;
  gap: 3px;
}
.recent-job code,
.recent-job span {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
}
.coverage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
  gap: 9px;
  margin: 16px 0;
}
.coverage-card {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 10px;
  background: rgb(var(--v-theme-surface-variant));
}
.coverage-card strong {
  font-size: 22px;
}
.status-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(32, 164, 100, 0.12);
  color: #17804e;
  font-weight: 700;
}
.status-pill.partial {
  background: rgba(243, 160, 35, 0.14);
  color: #9b620e;
}
.issues article {
  display: flex;
  gap: 8px;
  padding: 8px 0;
}
.screenshot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 220px));
  gap: 12px;
}
.screenshot-grid figure {
  margin: 0;
}
.screenshot-grid img {
  width: 100%;
  max-height: 310px;
  object-fit: contain;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 10px;
  background: #eef1f5;
}
.screenshot-grid figcaption {
  overflow: hidden;
  margin-top: 5px;
  font-size: 11px;
  text-overflow: ellipsis;
}
.stale-row,
.bundle-actions {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}
.stale-row > div {
  display: grid;
}
.handoff-box {
  display: grid;
  gap: 12px;
  margin-top: 18px;
  padding: 18px;
  border-radius: 14px;
  background: rgb(var(--v-theme-surface-variant));
}
.handoff-box > div:first-child,
.handoff-result {
  display: flex;
  align-items: center;
  gap: 11px;
}
.risk-list {
  display: grid;
  gap: 8px;
}
.risk-list label {
  align-items: flex-start;
  padding: 10px;
  border-radius: 9px;
  background: rgba(243, 160, 35, 0.1);
}
.risk-list span {
  display: grid;
}
.handoff-result div {
  display: grid;
  flex: 1;
}
@media (max-width: 900px) {
  .capture-console {
    padding: 18px;
  }
  .entry-grid {
    grid-template-columns: 1fr;
  }
  .console-header,
  .section-heading,
  .job-create-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
