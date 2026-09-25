<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Image,
  Palette,
  Route,
} from "lucide-vue-next";
import {
  buildEvidenceReadModel,
  type EvidenceCaseReadModel,
  type EvidenceReadableFact,
} from "@proto-bridge/core/v2/evidence-read-model";
import { useCaptureStore } from "@/app/stores/capture";
import { loadPrototypeScreens } from "@/design-system/loaders";
import EvidencePreview from "@/capture/EvidencePreview.vue";
import EvidenceDeliveryPanel from "@/capture/EvidenceDeliveryPanel.vue";
import CaptureFailureGroups from "@/capture/CaptureFailureGroups.vue";
import { groupCaptureFailures } from "@/capture/presentation";
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
const screens = loadPrototypeScreens();
const selectedRevisionId = ref("");
const inspectorTab = ref<
  "summary" | "structure" | "interaction" | "tokens" | "delivery"
>("summary");

const inspectorTabs: WorkbenchTabItem[] = [
  { label: "概览", value: "summary", testId: "evidence-tab-summary" },
  { label: "结构", value: "structure", testId: "evidence-tab-structure" },
  { label: "交互", value: "interaction", testId: "evidence-tab-interaction" },
  { label: "Token", value: "tokens", testId: "evidence-tab-tokens" },
  { label: "提示词", value: "delivery", testId: "evidence-tab-delivery" },
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
const verdictTitle = computed(() => {
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
const tokenFacts = computed(() =>
  (selectedCase.value?.contextFacts ?? []).filter((fact) =>
    /theme|token|color|font|space|radius|shadow/i.test(
      `${fact.factId} ${fact.label}`,
    ),
  ),
);

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
  if (!item.scenario) return "页面状态";
  return `从「${screenLabel(item.scenario.ownerScreenId)}」进入「${screenLabel(item.screenId)}」`;
}
function thumbUrl(item: EvidenceCaseReadModel) {
  const blobId = item.screenshotBlobIds[0];
  return blobId ? capture.screenshotUrls[blobId] : "";
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
}
function factSummary(fact: EvidenceReadableFact) {
  return friendlyValue(fact.value);
}
async function load() {
  if (!capture.connected) await capture.connect();
  await capture.loadSnapshot(props.bundleId, props.snapshotId);
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
      <div v-if="model" class="coverage-badge">
        <CheckCircle2 v-if="model.coverageStatus === 'complete'" :size="16" />
        <AlertTriangle v-else :size="16" />
        {{ model.coverageStatus === "complete" ? "采集完整" : "部分完成" }}
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
      v-if="model"
      class="verdict"
      :class="`is-${model.deliveryStatus}`"
      data-testid="evidence-verdict"
    >
      <div class="verdict-line">
        <CheckCircle2 v-if="model.deliveryStatus === 'ready'" :size="18" />
        <AlertTriangle v-else :size="18" />
        <div>
          <strong>{{ verdictTitle }}</strong>
          <p v-for="message in model.messages" :key="message">{{ message }}</p>
        </div>
        <WorkbenchButton
          v-if="failureGroups.length"
          tone="neutral"
          size="small"
          :aria-expanded="failuresOpen"
          @click="failuresOpen = !failuresOpen"
        >
          {{ failuresOpen ? "收起失败项" : `查看 ${model.failedAttempts.length} 项失败` }}
        </WorkbenchButton>
      </div>
      <div v-if="failuresOpen && failureGroups.length" class="verdict-failures">
        <CaptureFailureGroups :groups="failureGroups" />
      </div>
    </section>

    <div v-if="model && selectedCase" class="result-workspace">
      <EvidencePreview
        :evidence="selectedCase"
        :screenshot-urls="capture.screenshotUrls"
        :title="caseTitle(selectedCase)"
      />

      <aside class="evidence-inspector">
        <header class="inspector-heading">
          <div>
            <span>{{ selectedCase.scenario ? "交互结果" : "页面状态" }}</span>
            <h2>{{ caseTitle(selectedCase) }}</h2>
          </div>
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
            <div v-if="selectedCase.fragmentLabels.length" class="scope-notice">
              只采集：{{ selectedCase.fragmentLabels.join("、") }}
            </div>
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
            <details class="technical-details">
              <summary>技术详情</summary>
              <code>Case: {{ selectedCase.caseId }}</code>
              <code>Revision: {{ selectedCase.revisionId }}</code>
              <code>Evidence: {{ selectedCase.evidenceLevel }}</code>
            </details>
          </template>

          <template v-else-if="inspectorTab === 'structure'">
            <article
              v-for="region in selectedCase.regions"
              :key="region.regionId"
              class="region-card"
            >
              <strong>{{ region.label }}</strong>
              <small>
                {{
                  [region.componentId, region.role]
                    .filter(Boolean)
                    .join(" · ") || "页面区域"
                }}
              </small>
              <p v-if="region.text && region.text !== region.label">
                {{ region.text }}
              </p>
            </article>
            <p v-if="!selectedCase.regions.length" class="empty-copy">
              没有采集到可展示的页面结构。
            </p>
          </template>

          <template v-else-if="inspectorTab === 'interaction'">
            <article
              v-for="fact in selectedCase.interactionFacts"
              :key="fact.factId"
              class="interaction-card"
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

          <EvidenceDeliveryPanel
            v-else
            :bundle-id="bundleId"
            :snapshot-id="snapshotId"
          />
        </div>
      </aside>

      <aside class="evidence-nav">
        <div class="panel-heading">
          <span>证据导航</span>
          <strong>{{ cases.length }} 个视图</strong>
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
              <img
                v-if="thumbUrl(item)"
                :src="thumbUrl(item)"
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
  min-height: 78px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 20px;
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
  padding: 10px 20px;
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
.verdict-line > div {
  min-width: 0;
  flex: 1;
}
.verdict-line strong {
  font-size: 0.84rem;
}
.verdict-line p {
  margin: 3px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.72rem;
}
.verdict-failures {
  max-height: 42vh;
  margin-top: 10px;
  overflow: auto;
}
.result-workspace {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(220px, 360px) minmax(0, 1fr) 200px;
  overflow: hidden;
}
.evidence-nav,
.evidence-inspector {
  min-height: 0;
  overflow: auto;
  background: rgb(var(--v-theme-surface));
}
.evidence-nav {
  border-left: 1px solid rgba(var(--v-border-color), 0.14);
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
.region-card,
.interaction-card {
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 8px;
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
    grid-template-columns: minmax(200px, 300px) minmax(0, 1fr) 180px;
  }
}
</style>
