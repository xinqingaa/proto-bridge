<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { RouterLink, useRouter } from "vue-router";
import {
  Bell,
  CheckCircle2,
  LoaderCircle,
  ScanLine,
} from "lucide-vue-next";
import { useCaptureStore } from "@/app/stores/capture";
import { loadPrototypeScreens } from "@/design-system/loaders";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";

const capture = useCaptureStore();
const router = useRouter();
const screens = loadPrototypeScreens();
let pollTimer: ReturnType<typeof setInterval> | undefined;
const STATUS_LABELS = {
  queued: "等待开始",
  discovering: "正在准备",
  capturing: "正在采集",
  writing: "正在保存",
  completed: "采集完成",
  failed: "采集失败",
  cancelled: "已取消",
  interrupted: "已中断",
} as const;

const executing = computed(() =>
  capture.activeJob
    ? ["queued", "discovering", "capturing", "writing"].includes(
        capture.activeJob.status,
      )
    : false,
);
const totalCases = computed(
  () => capture.activeJob?.selection.cases.length ?? 0,
);
const completedCases = computed(
  () =>
    capture.activeJob?.journal.filter((entry) => entry.event === "case-finished")
      .length ?? 0,
);
const progress = computed(() => {
  if (!totalCases.value) return 0;
  return Math.min(100, (completedCases.value / totalCases.value) * 100);
});
const statusLabel = computed(() => {
  const status = capture.activeJob?.status;
  return status ? STATUS_LABELS[status] : "采集任务";
});
const currentCaseLabel = computed(() => {
  const job = capture.activeJob;
  if (!job || !executing.value) return "";
  const finished = new Set(
    job.journal
      .filter((entry) => entry.event === "case-finished")
      .map((entry) => entry.detail?.split(":")[0])
      .filter(Boolean),
  );
  const next = job.selection.cases.find((item) => !finished.has(item.caseId));
  if (!next) return "";
  const screenId = next.caseId.split("::")[0] ?? "";
  return (
    screens.find((screen) => screen.screenId === screenId)?.label ?? screenId
  );
});
const hasCurrentItem = computed(
  () => executing.value || Boolean(capture.notice),
);
const activatorLabel = computed(() =>
  executing.value
    ? `${statusLabel.value}，打开采集任务`
    : capture.notice
      ? `${capture.notice.title}，打开采集任务`
      : "打开采集任务",
);

async function refresh(includeIdle = false) {
  if (!capture.connected) {
    await capture.connect();
    return;
  }
  if (capture.activeJob && !capture.jobFinished) {
    await capture.refreshActiveJob();
    await capture.refreshConsole();
  } else if (includeIdle) {
    await capture.refreshConsole();
  }
}

async function viewResult() {
  const bundleId =
    capture.notice?.bundleId ??
    capture.details?.bundle.bundleId ??
    capture.activeJob?.bundleId;
  if (!bundleId) return;
  if (!capture.details || capture.details.bundle.bundleId !== bundleId) {
    await capture.loadBundle(bundleId);
  }
  const snapshotId =
    capture.notice?.snapshotId ?? capture.details?.activeSnapshot.snapshotId;
  if (!snapshotId) return;
  capture.jobCenterOpen = false;
  capture.dismissNotice();
  await router.push(`/workbench/evidence/${bundleId}/${snapshotId}`);
}

function openLifecycle() {
  capture.jobCenterOpen = false;
  void router.push("/workbench/prototypes/all");
}

onMounted(() => {
  void refresh(true);
  pollTimer = setInterval(() => void refresh(), 1000);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <v-menu
    v-model="capture.jobCenterOpen"
    location="bottom end"
    :close-on-content-click="false"
  >
    <template #activator="{ props }">
      <WorkbenchIconButton
        v-bind="props"
        :label="activatorLabel"
        :active="capture.jobCenterOpen"
        :tone="executing ? 'action' : 'neutral'"
        size="large"
        class="capture-job-activator"
        data-testid="capture-job-center"
      >
        <LoaderCircle
          v-if="executing"
          :size="17"
          class="spin"
          aria-hidden="true"
        />
        <Bell v-else :size="18" aria-hidden="true" />
        <span
          v-if="executing || capture.notice"
          class="job-indicator"
          :class="{ 'is-running': executing }"
          aria-hidden="true"
        />
      </WorkbenchIconButton>
    </template>

    <section class="job-popover">
      <header>
        <div>
          <span>后台采集</span>
          <h3>
            {{
              executing
                ? statusLabel
                : (capture.notice?.title ?? "没有正在执行的任务")
            }}
          </h3>
        </div>
        <Bell :size="19" />
      </header>

      <template v-if="hasCurrentItem">
        <v-progress-linear
          v-if="executing"
          :model-value="progress"
          color="primary"
          height="7"
          rounded
        />
        <div v-if="executing && capture.activeJob" class="job-meta">
          <span
            >{{ completedCases }} / {{ totalCases }} 个采集项<template
              v-if="currentCaseLabel"
            >
              · {{ currentCaseLabel }}</template
            ></span
          >
          <code>{{ capture.activeJob.jobId }}</code>
        </div>
        <p class="job-detail">
          {{
            executing
              ? (capture.activeJob?.journal.at(-1)?.detail ??
                "任务已经开始，可以继续浏览工作台。")
              : capture.notice?.message
          }}
        </p>
        <div class="job-actions">
          <v-btn
            v-if="executing"
            color="primary"
            @click="openLifecycle"
          >
            查看生命周期
          </v-btn>
          <v-btn
            v-if="capture.notice?.snapshotId"
            color="primary"
            @click="viewResult"
          >
            <CheckCircle2 :size="16" /> 查看采集结果
          </v-btn>
          <v-btn
            v-if="!capture.jobFinished"
            variant="outlined"
            color="error"
            @click="capture.cancelActiveJob"
          >
            取消任务
          </v-btn>
        </div>
      </template>

      <template v-else>
        <div class="job-empty">
          <ScanLine :size="28" />
          <p>原型定稿时会自动采集整个原型。</p>
          <v-btn to="/workbench/capture" variant="text"> 查看定稿采集 </v-btn>
        </div>
      </template>

      <footer>
        <RouterLink to="/workbench/capture">定稿采集</RouterLink>
      </footer>
    </section>
  </v-menu>
</template>

<style scoped>
.capture-job-activator {
  position: relative;
}
.job-indicator {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 7px;
  height: 7px;
  border: 2px solid rgb(var(--v-theme-surface));
  border-radius: 50%;
  background: rgb(var(--v-theme-error));
  box-sizing: content-box;
}
.job-indicator.is-running {
  background: rgb(var(--v-theme-action));
  animation: pulse 1.6s ease-in-out infinite;
}
.spin {
  animation: spin 1s linear infinite;
}
.job-popover {
  width: min(390px, calc(100vw - 24px));
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 15px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
}
.job-popover header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  padding: 17px 18px 13px;
}
.job-popover header span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.68rem;
  font-weight: 800;
}
.job-popover h3 {
  margin: 2px 0 0;
  font-size: 1rem;
}
.job-popover :deep(.v-progress-linear) {
  margin-inline: 18px;
  width: calc(100% - 36px);
}
.job-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 18px 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.7rem;
}
.job-meta code {
  overflow: hidden;
  max-width: 210px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.job-detail {
  margin: 9px 18px 0;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.74rem;
}
.job-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 15px 18px;
}
.job-empty {
  display: grid;
  min-height: 160px;
  place-items: center;
  align-content: center;
  gap: 7px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-align: center;
}
.job-empty p {
  margin: 0;
}
.job-popover footer {
  padding: 10px 18px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 0.72rem;
  text-align: right;
}
.job-popover footer a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes pulse {
  50% {
    opacity: 0.45;
    transform: scale(0.82);
  }
}
</style>
