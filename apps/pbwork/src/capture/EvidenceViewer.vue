<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Image,
  Palette,
  Route,
  X,
} from "lucide-vue-next";
import {
  buildEvidenceReadModel,
  type EvidenceCaseReadModel,
  type EvidenceReadableFact,
} from "@proto-bridge/core/v2/evidence-read-model";
import { useCaptureStore } from "@/app/stores/capture";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { loadPrototypeScreens } from "@/design-system/loaders";
import EvidencePreview from "@/capture/EvidencePreview.vue";
import EvidenceDeliveryPanel from "@/capture/EvidenceDeliveryPanel.vue";
import CaptureFailureGroups from "@/capture/CaptureFailureGroups.vue";
import { groupCaptureFailures } from "@/capture/presentation";
import { speakEvidenceMessage } from "@/capture/review-copy";
import {
  cssViewportForScreenshot,
  idsOnScreen,
  marksForBoxes,
} from "@/capture/screen-marks";
import { structureOutline } from "@/capture/structure-outline";
import ScreenshotThumb from "@/capture/ScreenshotThumb.vue";
import {
  classifyWorkbenchResults,
  evidenceMessagesForClassification,
  presentEvidenceResult,
} from "@/capture/result-classification";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchTabs, {
  type WorkbenchTabItem,
} from "@/workbench/ui/WorkbenchTabs.vue";

const props = defineProps<{
  bundleId: string;
  snapshotId: string;
}>();

const route = useRoute();
const capture = useCaptureStore();
const lifecycle = usePrototypeLifecycleStore();
const screens = loadPrototypeScreens();
const selectedRevisionId = ref("");
const inspectorTab = ref<"summary" | "structure" | "interaction" | "tokens">(
  "summary",
);
const detailsOpen = ref(false);
const activeMarkId = ref("");
const screenshotSize = ref<{ width: number; height: number } | null>(null);
const promptOpen = ref(false);
const promptCopied = ref(false);
const promptPanel = ref<{ copyPrompt: () => Promise<void> } | null>(null);

const inspectorTabs: WorkbenchTabItem[] = [
  { label: "概览", value: "summary", testId: "evidence-tab-summary" },
  { label: "结构", value: "structure", testId: "evidence-tab-structure" },
  { label: "交互", value: "interaction", testId: "evidence-tab-interaction" },
  { label: "Token", value: "tokens", testId: "evidence-tab-tokens" },
];

const model = computed(() => {
  const details = capture.details;
  if (
    !details ||
    details.bundle.bundleId !== props.bundleId ||
    details.activeSnapshot.snapshotId !== props.snapshotId
  ) {
    return null;
  }
  return buildEvidenceReadModel({
    snapshot: details.activeSnapshot,
    runs: details.runs,
    revisions: details.activeRevisions,
    blobs: details.blobs,
  });
});
const cases = computed(
  () => model.value?.screens.flatMap((screen) => screen.cases) ?? [],
);
const selectedCase = computed(
  () =>
    cases.value.find((item) => item.revisionId === selectedRevisionId.value) ??
    cases.value[0] ??
    null,
);
const successfulCount = computed(
  () =>
    (model.value?.summary.captured ?? 0) + (model.value?.summary.reused ?? 0),
);
const failuresOpen = ref(false);
const failureGroups = computed(() =>
  groupCaptureFailures(
    (model.value?.failedAttempts ?? []).map((attempt) => ({
      caseId: attempt.caseId,
      reason: attempt.reason ?? attempt.result,
    })),
  ),
);
const resultCopy = computed(() => {
  if (!capture.consoleState) return null;
  return presentEvidenceResult(
    classifyWorkbenchResults({
      records: lifecycle.records,
      consoleState: capture.consoleState,
    }),
    props.bundleId,
    props.snapshotId,
  );
});
const coverageTitle = computed(() => {
  const current = model.value;
  if (!current) return "";
  if (current.coverageStatus === "partial") {
    return `采集不完整：${successfulCount.value}/${current.summary.selected} 项有效，${current.summary.selected - successfulCount.value} 项没有可用结果`;
  }
  if (current.deliveryStatus === "attention") {
    return "采集完整，但有需要注意的事实";
  }
  return "采集完整，所有事实已解析";
});
const verdictMessages = computed(() => {
  const current = model.value;
  const kind = resultCopy.value?.kind;
  if (!current || !kind) return current?.messages ?? [];
  return evidenceMessagesForClassification(current.messages, kind).map(
    speakEvidenceMessage,
  );
});
const tokenFacts = computed(() =>
  (selectedCase.value?.contextFacts ?? []).filter((fact) =>
    /theme|token|color|font|space|radius|shadow/i.test(
      `${fact.factId} ${fact.label}`,
    ),
  ),
);
const structureRows = computed(() =>
  selectedCase.value ? structureOutline(selectedCase.value.regions) : [],
);
const markGeometry = computed(() => {
  const current = selectedCase.value;
  const size = screenshotSize.value;
  if (!current || !size) return null;
  const labels = new Map(
    structureRows.value.map((row) => [
      row.regionId,
      row.name ? `${row.role}：${row.name}` : row.role,
    ]),
  );
  const regions = current.regions.flatMap((region) =>
    region.bbox
      ? [
          {
            id: region.regionId,
            label: labels.get(region.regionId) ?? region.label,
            ...region.bbox,
          },
        ]
      : [],
  );
  const viewport = cssViewportForScreenshot(size.width, size.height, regions);
  return { regions, viewport, onScreen: idsOnScreen(regions, viewport) };
});
const screenMarks = computed(() => {
  const current = selectedCase.value;
  const geometry = markGeometry.value;
  if (!detailsOpen.value || !current || !geometry || !activeMarkId.value) {
    return [];
  }
  if (
    inspectorTab.value !== "structure" &&
    inspectorTab.value !== "interaction"
  ) {
    return [];
  }
  return marksForBoxes(
    geometry.regions.filter((region) => region.id === activeMarkId.value),
    geometry.viewport,
    { keepFullScreen: true },
  );
});

watch(inspectorTab, () => {
  activeMarkId.value = "";
});

function regionKey(current: EvidenceCaseReadModel, regionId: string) {
  const region = current.regions.find((item) => item.regionId === regionId);
  const identity = region?.identity;
  if (!identity) return "";
  return `${identity.screenId}:${identity.pbId}:${identity.pbKey ?? ""}`;
}
function fragmentKeys(fact: EvidenceReadableFact) {
  const value = fact.value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [record.target, ...requiredFragments(record)].flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const fragment = item as Record<string, unknown>;
    if (typeof fragment.pbId !== "string") return [];
    return [
      `${typeof fragment.screenId === "string" ? fragment.screenId : ""}:${fragment.pbId}:${typeof fragment.pbKey === "string" ? fragment.pbKey : ""}`,
    ];
  });
}
function requiredFragments(record: Record<string, unknown>) {
  const checkpoint = record.checkpoint;
  if (!checkpoint || typeof checkpoint !== "object") return [];
  const fragments = (checkpoint as Record<string, unknown>).requiredFragments;
  return Array.isArray(fragments) ? fragments : [];
}
function factMarks(fact: EvidenceReadableFact) {
  const current = selectedCase.value;
  if (!current) return [];
  const keys = new Set(fragmentKeys(fact));
  return current.regions
    .filter((region) => keys.has(regionKey(current, region.regionId)))
    .map((region) => region.regionId);
}

function screenRecord(screenId: string) {
  return screens.find((screen) => screen.screenId === screenId);
}
function screenLabel(screenId: string) {
  return screenRecord(screenId)?.label ?? screenId;
}
function variantLabel(item: EvidenceCaseReadModel) {
  return (
    screenRecord(item.screenId)?.variants.find(
      (variant) => variant.id === item.variantId,
    )?.label ?? item.variantId
  );
}
function caseTitle(item: EvidenceCaseReadModel) {
  return `${screenLabel(item.screenId)} · ${variantLabel(item)}`;
}
function scenarioSummary(item: EvidenceCaseReadModel) {
  if (!item.scenario) return "页面本身的状态";
  const owner = screenRecord(item.scenario.ownerScreenId);
  const scenario = owner?.scenarios?.find(
    (candidate) => candidate.id === item.scenario?.scenarioId,
  );
  const name = scenario?.label ?? item.scenario.scenarioId;
  if (item.scenario.ownerScreenId === item.screenId) return `完成「${name}」之后`;
  return `从「${screenLabel(item.scenario.ownerScreenId)}」完成「${name}」之后`;
}
function friendlyValue(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "是" : "否";
  if (value === undefined || value === null) return "—";
  return JSON.stringify(value, null, 2);
}
function isMultilineValue(value: unknown) {
  if (value !== null && typeof value === "object") return true;
  return typeof value === "string" && value.includes("\n");
}
function colorSwatch(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) return text;
  if (/^(?:rgba?|hsla?)\([^)]+\)$/i.test(text)) return text;
  return null;
}
function selectCase(item: EvidenceCaseReadModel) {
  selectedRevisionId.value = item.revisionId;
  activeMarkId.value = "";
  screenshotSize.value = null;
}

function selectMark(id: string) {
  if (!id) return;
  activeMarkId.value = id;
  if (!detailsOpen.value) detailsOpen.value = true;
  document
    .querySelector(`[data-mark-id="${CSS.escape(id)}"]`)
    ?.scrollIntoView({ block: "nearest" });
}
async function copyPrompt() {
  await promptPanel.value?.copyPrompt();
  promptCopied.value = true;
  window.setTimeout(() => {
    promptCopied.value = false;
  }, 1400);
}
function factSummary(fact: EvidenceReadableFact) {
  return friendlyValue(fact.value);
}
async function load() {
  if (!capture.connected) await capture.connect();
  await Promise.all([
    capture.loadSnapshot(props.bundleId, props.snapshotId),
    capture.refreshConsole(),
  ]);
}

watch(
  cases,
  (items) => {
    const requested =
      typeof route.query.revision === "string" ? route.query.revision : "";
    if (requested && items.some((item) => item.revisionId === requested)) {
      selectedRevisionId.value = requested;
    } else if (
      items.length &&
      !items.some((item) => item.revisionId === selectedRevisionId.value)
    ) {
      selectedRevisionId.value = items[0]!.revisionId;
    }
  },
  { immediate: true },
);
onMounted(() => void load());
watch(
  () => [props.bundleId, props.snapshotId],
  () => void load(),
);
</script>

<template>
  <main class="evidence-viewer" data-testid="evidence-viewer">
    <header class="viewer-header">
      <div class="title-row">
        <RouterLink to="/workbench/capture" class="back-link">
          <ArrowLeft :size="15" />定稿采集
        </RouterLink>
        <div>
          <h1>采集结果</h1>
          <span v-if="model">
            {{ successfulCount }}/{{ model.summary.selected }} 个视图 ·
            {{ model.summary.screenshots }} 张截图 ·
            {{
              new Intl.DateTimeFormat("zh-CN", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(model.committedAt))
            }}
          </span>
        </div>
      </div>
      <div class="header-actions">
        <template v-if="resultCopy?.kind === 'officially-finalized'">
          <WorkbenchButton size="small" tone="neutral" @click="copyPrompt">
            <Check v-if="promptCopied" :size="14" />
            <Copy v-else :size="14" />
            {{ promptCopied ? "已复制" : "复制提示词" }}
          </WorkbenchButton>
          <WorkbenchButton size="small" tone="neutral" @click="promptOpen = true">
            查看提示词
          </WorkbenchButton>
        </template>
        <div v-if="resultCopy" class="coverage-badge" data-testid="evidence-result-classification">
          <CheckCircle2 v-if="resultCopy.kind === 'officially-finalized'" :size="16" />
          <AlertTriangle v-else :size="16" />
          {{ resultCopy.classificationLabel }}
        </div>
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

    <section
      v-if="model || resultCopy"
      class="verdict"
      :class="model ? `is-${model.deliveryStatus}` : 'is-attention'"
      data-testid="evidence-verdict"
    >
      <div class="verdict-line">
        <CheckCircle2 v-if="resultCopy?.kind === 'officially-finalized'" :size="18" />
        <AlertTriangle v-else :size="18" />
        <div class="verdict-copy">
          <strong v-if="resultCopy">{{ resultCopy.headline }}</strong>
          <p v-if="coverageTitle">{{ coverageTitle }}</p>
          <p v-for="message in verdictMessages" :key="message">{{ message }}</p>
        </div>
        <WorkbenchButton
          v-if="failureGroups.length"
          tone="neutral"
          size="small"
          :aria-expanded="failuresOpen"
          @click="failuresOpen = !failuresOpen"
        >
          {{ failuresOpen ? "收起失败项" : `查看 ${model?.failedAttempts.length ?? 0} 项失败` }}
        </WorkbenchButton>
      </div>
      <div v-if="failuresOpen && failureGroups.length" class="verdict-failures">
        <CaptureFailureGroups :groups="failureGroups" />
      </div>
    </section>

    <div v-if="model && selectedCase" class="result-workspace">
      <aside class="evidence-nav">
        <div class="panel-heading">
          <span>页面状态</span>
          <strong>{{ cases.length }} 个</strong>
        </div>
        <section
          v-for="screenGroup in model.screens"
          :key="screenGroup.screenId"
          class="screen-group"
        >
          <h2>{{ screenLabel(screenGroup.screenId) }}</h2>
          <button
            v-for="item in screenGroup.cases"
            :key="item.revisionId"
            type="button"
            class="case-item"
            :class="{ active: item.revisionId === selectedCase.revisionId }"
            @click="selectCase(item)"
          >
            <span class="thumb">
              <ScreenshotThumb
                v-if="item.screenshotBlobIds[0]"
                :bundle-id="bundleId"
                :blob-id="item.screenshotBlobIds[0]"
                :alt="caseTitle(item)"
              />
              <Image v-else :size="14" aria-hidden="true" />
            </span>
            <span class="case-copy">
              <strong>
                <Route v-if="item.scenario" :size="12" />
                {{ variantLabel(item) }}
              </strong>
              <small>{{ scenarioSummary(item) }}</small>
            </span>
          </button>
        </section>
      </aside>

      <div class="stage" :class="{ 'has-details': detailsOpen }">
        <EvidencePreview
          :bundle-id="bundleId"
          :evidence="selectedCase"
          :title="caseTitle(selectedCase)"
          :marks="screenMarks"
          :active-mark-id="activeMarkId"
          @measured="screenshotSize = $event"
          @select-mark="selectMark"
        >
          <template #actions>
            <WorkbenchButton
              size="small"
              tone="neutral"
              :aria-expanded="detailsOpen"
              @click="detailsOpen = !detailsOpen"
            >
              {{ detailsOpen ? "收起说明" : "对照说明" }}
            </WorkbenchButton>
          </template>
        </EvidencePreview>
      </div>

      <aside v-if="detailsOpen" class="evidence-inspector">
        <header class="inspector-heading">
          <div>
            <span>{{ selectedCase.scenario ? "交互结果" : "页面状态" }}</span>
            <h2>{{ caseTitle(selectedCase) }}</h2>
          </div>
          <button type="button" class="close-detail" aria-label="收起说明" @click="detailsOpen = false">
            <X :size="16" />
          </button>
        </header>

        <div class="inspector-tabs">
          <WorkbenchTabs
            v-model="inspectorTab"
            fill
            :items="inspectorTabs"
            label="证据详情"
          />
        </div>

        <div class="inspector-body">
          <template v-if="inspectorTab === 'summary'">
            <p class="lead">{{ scenarioSummary(selectedCase) }}</p>
            <p class="lead-note">在「结构」或「交互」里点一项，它在画面上的位置会被标出来。</p>
            <div v-if="selectedCase.fragmentLabels.length" class="scope-notice">
              这次只采集了页面里的 {{ selectedCase.fragmentLabels.length }} 个区域。
            </div>
            <details class="technical-details">
              <summary>查看本页采集记录（{{ selectedCase.contextFacts.length }} 项）</summary>
            <ul class="fact-list">
              <li
                v-for="fact in selectedCase.contextFacts"
                :key="fact.factId"
                class="fact-row"
              >
                <span class="fact-label">{{ fact.label }}</span>
                <div class="fact-value">
                  <i
                    v-if="colorSwatch(fact.value)"
                    class="value-swatch"
                    :style="{ background: colorSwatch(fact.value)! }"
                    aria-hidden="true"
                  />
                  <pre
                    v-if="isMultilineValue(fact.value)"
                    class="fact-code"
                    >{{ factSummary(fact) }}</pre
                  >
                  <span v-else>{{ factSummary(fact) }}</span>
                </div>
              </li>
            </ul>
            </details>
            <details class="technical-details">
              <summary>技术详情</summary>
              <code>Case: {{ selectedCase.caseId }}</code>
              <code>Revision: {{ selectedCase.revisionId }}</code>
              <code>Evidence: {{ selectedCase.evidenceLevel }}</code>
            </details>
          </template>

          <template v-else-if="inspectorTab === 'structure'">
            <ul v-if="structureRows.length" class="structure-tree">
              <li
                v-for="row in structureRows"
                :key="row.regionId"
                class="structure-row"
                :class="{
                  active: row.regionId === activeMarkId,
                  'is-offscreen':
                    markGeometry && !markGeometry.onScreen.has(row.regionId),
                }"
                :style="{ '--depth': row.depth }"
                :data-mark-id="row.regionId"
                tabindex="0"
                @click="selectMark(row.regionId)"
                @keydown.enter="selectMark(row.regionId)"
              >
                <span class="row-role">{{ row.role }}</span>
                <span v-if="row.name" class="row-name">{{ row.name }}</span>
                <span v-else-if="row.childCount" class="row-meta">
                  含 {{ row.childCount }} 项
                </span>
                <span
                  v-if="markGeometry && !markGeometry.onScreen.has(row.regionId)"
                  class="row-meta"
                >
                  不在这张画面里
                </span>
                <code v-if="row.component" class="row-component">{{
                  row.component
                }}</code>
              </li>
            </ul>
            <p v-if="!selectedCase.regions.length" class="empty-copy">
              没有采集到可展示的页面结构。
            </p>
          </template>

          <template v-else-if="inspectorTab === 'interaction'">
            <article
              v-for="fact in selectedCase.interactionFacts"
              :key="fact.factId"
              class="interaction-card"
              :class="{ active: factMarks(fact).includes(activeMarkId) }"
              :data-mark-id="factMarks(fact)[0]"
              tabindex="0"
              @click="selectMark(factMarks(fact)[0] ?? '')"
              @keydown.enter="selectMark(factMarks(fact)[0] ?? '')"
            >
              <Route :size="14" />
              <div>
                <strong>{{ fact.label }}</strong>
                <pre
                  v-if="isMultilineValue(fact.value)"
                  class="fact-code"
                  >{{ factSummary(fact) }}</pre
                >
                <p v-else>{{ factSummary(fact) }}</p>
              </div>
            </article>
            <p v-if="!selectedCase.interactionFacts.length" class="empty-copy">
              当前页面状态没有交互检查点。
            </p>
          </template>

          <template v-else-if="inspectorTab === 'tokens'">
            <ul v-if="tokenFacts.length" class="fact-list">
              <li
                v-for="fact in tokenFacts"
                :key="fact.factId"
                class="fact-row"
              >
                <span class="fact-label">{{ fact.label }}</span>
                <div class="fact-value">
                  <i
                    v-if="colorSwatch(fact.value)"
                    class="value-swatch"
                    :style="{ background: colorSwatch(fact.value)! }"
                    aria-hidden="true"
                  />
                  <pre
                    v-if="isMultilineValue(fact.value)"
                    class="fact-code"
                    >{{ factSummary(fact) }}</pre
                  >
                  <span v-else>{{ factSummary(fact) }}</span>
                </div>
              </li>
            </ul>
            <div v-else class="empty-copy">
              <Palette :size="22" />
              <strong>当前证据没有独立 Token 事实</strong>
              <p>主题上下文仍保留在“概览”；这里不混入目标工程 Token。</p>
            </div>
          </template>
        </div>
      </aside>
    </div>

    <div
      v-if="resultCopy?.kind === 'officially-finalized'"
      class="prompt-layer"
      :hidden="!promptOpen"
      role="dialog"
      aria-modal="true"
      aria-label="定稿提示词"
      @click.self="promptOpen = false"
    >
      <section class="prompt-card">
        <button type="button" class="close-detail" aria-label="关闭提示词" @click="promptOpen = false">
          <X :size="16" />
        </button>
        <EvidenceDeliveryPanel
          ref="promptPanel"
          :bundle-id="bundleId"
          :snapshot-id="snapshotId"
        />
      </section>
    </div>

    <section v-else-if="model" class="loading-panel">
      <AlertTriangle :size="24" />
      <span>这次采集没有成功的视图，请先按上方失败项修复原型。</span>
    </section>

    <section v-else-if="!capture.lastError" class="loading-panel" aria-busy="true">
      <v-progress-circular indeterminate color="primary" />
      <span>正在加载采集结果…</span>
    </section>
  </main>
</template>

<style scoped>
.evidence-viewer {
  display: flex;
  width: 100%;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
}
.viewer-header {
  display: flex;
  min-height: 52px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 6px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
  background: rgb(var(--v-theme-surface));
}
.title-row {
  display: flex;
  align-items: center;
  gap: 18px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  text-decoration: none;
}
h1 {
  margin: 0;
  font-size: 1.25rem;
}
.title-row span {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.74rem;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.coverage-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-size: 0.74rem;
  font-weight: 700;
}
.verdict {
  flex: 0 0 auto;
  padding: 6px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 9%, rgb(var(--v-theme-surface)));
}
.verdict.is-ready {
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 8%, rgb(var(--v-theme-surface)));
}
.verdict-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.verdict-line > svg {
  flex: 0 0 auto;
  margin-top: 1px;
  color: rgb(var(--v-theme-warning));
}
.verdict.is-ready .verdict-line > svg {
  color: rgb(var(--v-theme-success));
}
.verdict-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 12px;
}
.verdict-line strong {
  font-size: 0.84rem;
}
.verdict-line p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.72rem;
}
.verdict-failures {
  max-height: 42vh;
  margin-top: 10px;
  overflow: auto;
}
.result-workspace {
  position: relative;
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 280px minmax(0, 1fr);
  overflow: hidden;
  --details-width: 400px;
}
.stage {
  min-width: 0;
  min-height: 0;
  display: flex;
}
.stage.has-details :deep(.preview-stage) {
  padding-right: calc(var(--details-width) + 16px);
}
.stage :deep(.evidence-preview) {
  flex: 1;
  min-width: 0;
}
.evidence-nav,
.evidence-inspector {
  min-height: 0;
  overflow: auto;
  background: rgb(var(--v-theme-surface));
}
.evidence-nav {
  border-right: 1px solid rgba(var(--v-border-color), 0.14);
}
.evidence-inspector {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--details-width);
  z-index: 2;
  border-left: 1px solid rgba(var(--v-border-color), 0.16);
  box-shadow: -16px 0 40px rgba(8, 12, 20, 0.12);
}
.close-detail {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.prompt-layer[hidden] {
  display: none;
}
.prompt-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 28px;
  background: rgba(8, 12, 20, 0.42);
}
.prompt-card {
  display: flex;
  width: min(860px, 100%);
  max-height: min(78vh, 760px);
  flex-direction: column;
  overflow: auto;
  padding: 18px 18px 8px;
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 24px 70px rgba(8, 12, 20, 0.28);
}
.prompt-card .close-detail {
  align-self: flex-end;
}
.prompt-card :deep(.prompt-body) {
  min-height: 0;
  max-height: none;
}
.panel-heading,
.inspector-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.panel-heading span,
.inspector-heading span {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.7rem;
}
.panel-heading strong {
  font-size: 0.72rem;
}
.screen-group {
  padding: 12px 9px 4px;
}
.screen-group h2 {
  margin: 0 7px 7px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.68rem;
  text-transform: uppercase;
}
.case-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 9px;
  padding: 7px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.case-item:hover,
.case-item.active {
  background: rgba(var(--v-theme-primary), 0.09);
}
.thumb {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.35);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.case-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.case-copy strong {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.76rem;
}
.case-copy small {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.65rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.evidence-inspector {
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(var(--v-border-color), 0.14);
}
.inspector-heading {
  min-height: 68px;
}
.inspector-heading h2 {
  margin: 3px 0 0;
  font-size: 0.88rem;
}
.inspector-tabs {
  padding: 8px 12px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.inspector-body {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 16px;
}
.lead-note {
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
.lead {
  margin: 0 0 14px;
  font-size: 0.8rem;
}
.scope-notice {
  margin-bottom: 12px;
  padding: 9px;
  border-radius: 7px;
  background: rgba(var(--v-theme-primary), 0.08);
  font-size: 0.74rem;
}
.fact-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.fact-row {
  display: grid;
  gap: 4px;
  padding: 9px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}
.fact-label {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.68rem;
  font-weight: 700;
}
.fact-value {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  min-width: 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.78rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.value-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  margin-top: 2px;
  border: 1px solid rgba(var(--v-border-color), 0.28);
  border-radius: 4px;
}
.fact-code {
  margin: 0;
  min-width: 0;
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.technical-details {
  margin-top: 16px;
  font-size: 0.72rem;
}
.technical-details code {
  display: block;
  margin-top: 7px;
  overflow-wrap: anywhere;
}
.structure-tree {
  margin: 0;
  padding: 0;
  list-style: none;
}
.structure-row {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 6px;
  padding: 5px 8px 5px calc(8px + var(--depth) * 14px);
  border-radius: 6px;
  font-size: 0.74rem;
  cursor: pointer;
}
.structure-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.structure-row.active {
  background: rgba(var(--v-theme-primary), 0.1);
  box-shadow: inset 2px 0 0 rgb(var(--v-theme-primary));
}
.structure-row.is-offscreen {
  opacity: 0.55;
}
.row-role {
  flex: 0 0 auto;
  font-weight: 650;
}
.row-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-meta {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
}
.row-component {
  margin-left: auto;
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.64rem;
}
.region-card,
.interaction-card {
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 8px;
  cursor: pointer;
}
.region-card.active,
.interaction-card.active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
.region-card {
  display: grid;
  gap: 3px;
}
.region-card strong,
.interaction-card strong {
  font-size: 0.76rem;
}
.region-card small {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
}
.region-card p,
.interaction-card p {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.72rem;
}
.interaction-card {
  display: flex;
  gap: 8px;
}
.interaction-card .fact-code {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.empty-copy {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 28px 8px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.75rem;
  text-align: center;
}
.empty-copy p {
  margin: 0;
}
.loading-panel {
  display: grid;
  flex: 1;
  place-content: center;
  justify-items: center;
  gap: 12px;
}
@media (max-width: 1100px) {
  .result-workspace {
    grid-template-columns: 240px minmax(0, 1fr);
  }
  .result-workspace {
    --details-width: 340px;
  }
}
</style>
