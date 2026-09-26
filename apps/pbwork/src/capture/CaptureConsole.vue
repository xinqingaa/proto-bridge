<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  Archive,
  CheckCircle2,
  CircleAlert,
  Eye,
  FileCheck2,
  Search,
} from "lucide-vue-next";
import type { PrototypeLifecycle } from "@/design-system/types";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import { loadPrototypes } from "@/design-system/loaders";
import { useCaptureStore } from "@/app/stores/capture";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { buildCaptureTaskPresentations } from "@/capture/presentation";
import {
  classifyWorkbenchResults,
  presentPrototypeResult,
} from "@/capture/result-classification";
import WorkbenchBadge from "@/workbench/ui/WorkbenchBadge.vue";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";
import WorkbenchTabs from "@/workbench/ui/WorkbenchTabs.vue";

type LifecycleFilter = "all" | "final" | "archived";

const capture = useCaptureStore();
const lifecycle = usePrototypeLifecycleStore();
const router = useRouter();
const lifecycleFilter = ref<LifecycleFilter>("all");
const searchQuery = ref("");
const prototypes = loadPrototypes();
lifecycle.ensurePrototypes(prototypes);

const taskPresentations = computed(() =>
  buildCaptureTaskPresentations(capture.consoleState, lifecycle.records),
);
const classifiedResults = computed(() =>
  classifyWorkbenchResults({
    records: lifecycle.records,
    consoleState: capture.consoleState,
  }),
);
const rows = computed(() =>
  lifecycle.finalizedRecords
    .map((record) => ({
      record,
      prototype:
        prototypes.find((prototype) => prototype.id === record.prototypeId) ??
        null,
      task:
        taskPresentations.value.find(
          (item) => item.job.jobId === record.artifacts?.jobId,
        ) ?? null,
    }))
    .filter((item) => {
      if (
        lifecycleFilter.value !== "all" &&
        item.record.stage !== lifecycleFilter.value
      ) {
        return false;
      }
      const query = searchQuery.value.trim().toLocaleLowerCase();
      if (!query) return true;
      return [
        item.prototype?.label,
        item.record.prototypeId,
        item.record.artifacts?.bundleId,
        item.record.artifacts?.deliveryId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    })
    .sort((left, right) =>
      (right.record.artifacts?.finalizedAt ?? "").localeCompare(
        left.record.artifacts?.finalizedAt ?? "",
      ),
    ),
);
const tabs = computed(() => [
  { label: "全部", value: "all", count: lifecycle.finalizedRecords.length },
  {
    label: "已定稿",
    value: "final",
    count: lifecycle.finalizedRecords.filter((item) => item.stage === "final")
      .length,
  },
  {
    label: "已归档",
    value: "archived",
    count: lifecycle.finalizedRecords.filter(
      (item) => item.stage === "archived",
    ).length,
  },
]);

function lifecycleTone(stage: PrototypeLifecycle) {
  return stage === "archived" ? "archived" : "final";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function openResult(bundleId: string, snapshotId: string) {
  void router.push(`/workbench/evidence/${bundleId}/${snapshotId}`);
}

onMounted(async () => {
  if (!capture.connected) await capture.connect();
  else await capture.refreshConsole();
});
</script>

<template>
  <main class="capture-console" data-testid="capture-console">
    <div class="console-frame">
      <header class="console-header">
        <div>
          <p>Finalized evidence</p>
          <h1>定稿采集</h1>
          <span>这里只展示已定稿或已归档原型自动生成的完整 Evidence 与唯一提示词。</span>
        </div>
        <div class="finalized-mark">
          <FileCheck2 :size="18" />
          <span><strong>{{ lifecycle.finalizedRecords.length }}</strong> 份正式产物</span>
        </div>
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
          <span>连接后才能读取已定稿产物。</span>
        </div>
        <WorkbenchButton :loading="capture.connecting" @click="capture.connect">
          重新连接
        </WorkbenchButton>
      </section>

      <template v-else>
        <section class="toolbar">
          <WorkbenchTabs
            :model-value="lifecycleFilter"
            :items="tabs"
            label="筛选定稿产物"
            @update:model-value="lifecycleFilter = $event as LifecycleFilter"
          />
          <label class="search">
            <Search :size="15" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="搜索原型、Bundle、Delivery…"
              aria-label="搜索定稿产物"
            />
          </label>
        </section>

        <section class="history-section" data-testid="finalized-capture-list">
          <div v-if="!rows.length" class="history-empty">
            <FileCheck2 :size="28" />
            <strong>还没有定稿产物</strong>
            <p>前往全部原型，将待确定原型定稿后会自动出现在这里。</p>
            <WorkbenchButton
              tone="primary"
              @click="router.push('/workbench/prototypes/all')"
            >
              打开全部原型
            </WorkbenchButton>
          </div>

          <ul v-else class="history-list">
            <li v-for="item in rows" :key="item.record.prototypeId" class="history-item">
              <button
                type="button"
                class="history-row"
                @click="
                  openResult(
                    item.record.artifacts!.bundleId,
                    item.record.artifacts!.snapshotId,
                  )
                "
              >
                <span class="status-mark" aria-hidden="true">
                  <Archive v-if="item.record.stage === 'archived'" :size="16" />
                  <CheckCircle2 v-else :size="16" />
                </span>
                <span class="history-main">
                  <strong>{{ item.prototype?.label ?? item.record.prototypeId }}</strong>
                  <small>
                    整个原型 · {{ item.task?.viewCount ?? "—" }} 个 case ·
                    {{ formatTime(item.record.artifacts!.finalizedAt) }}
                  </small>
                  <code>{{ item.record.artifacts!.bundleId }}</code>
                </span>
                <WorkbenchBadge :tone="lifecycleTone(item.record.stage)">
                  {{ LIFECYCLE_LABELS[item.record.stage] }}
                </WorkbenchBadge>
                <span class="artifact-state">
                  <FileCheck2 :size="14" />{{
                    presentPrototypeResult(classifiedResults, item.record.prototypeId)?.headline
                  }}
                </span>
                <WorkbenchIconButton label="查看定稿结果" size="small">
                  <Eye :size="16" />
                </WorkbenchIconButton>
              </button>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.capture-console {
  width: 100%;
}
.console-frame {
  display: grid;
  gap: 18px;
}
.console-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}
.console-header p {
  margin: 0 0 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
.console-header h1 {
  margin: 0 0 7px;
  font-size: 1.7rem;
}
.console-header span {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.78rem;
}
.finalized-mark {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 13px;
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-success)) 28%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 8%, transparent);
  color: rgb(var(--v-theme-success));
}
.finalized-mark strong {
  font: 800 1rem ui-monospace, SFMono-Regular, Menlo, monospace;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 11px;
  background: rgb(var(--v-theme-surface));
}
.search {
  display: flex;
  min-width: 220px;
  flex: 1;
  align-items: center;
  gap: 7px;
  padding: 0 9px;
  border: 1px solid rgba(var(--v-border-color), 0.15);
  border-radius: 7px;
  background: rgba(var(--v-theme-on-surface), 0.025);
}
.search input {
  width: 100%;
  height: 30px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 0.72rem;
}
.history-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.history-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  gap: 12px;
  width: 100%;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.history-row:hover,
.history-row:focus-visible {
  border-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 40%, transparent);
  outline: none;
}
.status-mark {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 12%, transparent);
  color: rgb(var(--v-theme-success));
}
.history-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.history-main strong {
  font-size: 0.8rem;
}
.history-main small,
.history-main code {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.65rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.artifact-state {
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.68rem;
  font-weight: 700;
}
.connection-panel,
.history-empty {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 22px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.connection-panel > div,
.history-empty {
  display: grid;
  gap: 4px;
}
.connection-panel span,
.history-empty p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.72rem;
}
.connection-panel .wb-button {
  margin-left: auto;
}
.history-empty {
  justify-items: center;
  padding: 44px 20px;
  text-align: center;
}
@media (max-width: 820px) {
  .console-header,
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .history-row {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .artifact-state {
    grid-column: 2 / -1;
  }
}
</style>
