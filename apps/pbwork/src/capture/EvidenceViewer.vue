<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileJson2,
  Handshake,
  Image,
  MousePointer2,
  Route,
} from "lucide-vue-next";
import {
  buildEvidenceReadModel,
  type EvidenceCaseReadModel,
  type EvidenceReadableFact,
  type EvidenceSemanticRegionReadModel,
} from "@proto-bridge/core/v2/evidence-read-model";
import { useCaptureStore } from "@/app/stores/capture";
import { loadPrototypeScreens } from "@/design-system/loaders";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";

const props = defineProps<{
  bundleId: string;
  snapshotId: string;
}>();
const capture = useCaptureStore();
const screens = loadPrototypeScreens();
const selectedRevisionId = ref("");

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
const selectedIndex = computed(() => {
  const index = cases.value.findIndex(
    (item) => item.revisionId === selectedRevisionId.value,
  );
  return index >= 0 ? index : 0;
});
const selectedCase = computed(() => cases.value[selectedIndex.value] ?? null);
const successfulCount = computed(
  () =>
    (model.value?.summary.captured ?? 0) + (model.value?.summary.reused ?? 0),
);
const limitedCaseCount = computed(
  () =>
    cases.value.filter((item) => item.semanticCoverage !== "declared").length,
);
const reviewNotes = computed(() => {
  if (!model.value) return [];
  const notes: string[] = [];
  const unfinished = model.value.summary.failed + model.value.summary.missing;
  if (unfinished) notes.push(`${unfinished} 个视图未完成`);
  if (limitedCaseCount.value) {
    notes.push(`${limitedCaseCount.value} 个视图尚未设置明确验收范围`);
  }
  if (model.value.summary.unknown) {
    notes.push(`${model.value.summary.unknown} 项内容无法自动确认`);
  }
  if (model.value.summary.conflicts) {
    notes.push(`${model.value.summary.conflicts} 项内容存在冲突`);
  }
  return notes;
});
const existingHandoffs = computed(() => capture.currentSnapshotHandoffs);

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
function screenPath(screenId: string) {
  const screen = screenRecord(screenId);
  return screen
    ? `/workbench/prototypes/${screen.prototypeId}/screens/${screen.screenSlug}`
    : "/workbench/prototypes/all";
}
function friendlyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "是" : "否";
  if (value === undefined) return "没有确定值";
  return JSON.stringify(value, null, 2);
}
function contextLabel(fact: EvidenceReadableFact): string {
  if (fact.category === "coverage") return "验收范围";
  if (fact.factId.endsWith(".screenId")) return "实际页面";
  if (fact.factId.endsWith(".variantId")) return "实际状态";
  if (fact.factId.endsWith(".themeId")) return "主题";
  return fact.label;
}
function contextValue(fact: EvidenceReadableFact): string {
  if (fact.factId.endsWith(".screenId") && typeof fact.value === "string") {
    return screenLabel(fact.value);
  }
  if (fact.factId.endsWith(".variantId") && typeof fact.value === "string") {
    const current = selectedCase.value;
    if (current && current.variantId === fact.value)
      return variantLabel(current);
    return fact.value;
  }
  if (fact.factId.endsWith(".themeId") && typeof fact.value === "string") {
    return (
      {
        light: "浅色",
        dark: "深色",
      }[fact.value] ?? fact.value
    );
  }
  if (
    fact.category === "coverage" &&
    fact.value &&
    typeof fact.value === "object"
  ) {
    const value = fact.value as Record<string, unknown>;
    const required = Array.isArray(value.requiredFragments)
      ? value.requiredFragments.length
      : 0;
    const observed = Array.isArray(value.observedFragments)
      ? value.observedFragments.length
      : 0;
    const missing = Array.isArray(value.missingFragments)
      ? value.missingFragments.length
      : 0;
    if (value.status === "declared") {
      return `${required} 个验收元素 · ${observed} 个已识别${
        missing ? ` · ${missing} 个缺失` : ""
      }`;
    }
    return `${observed} 个区域已识别，尚未设置验收元素`;
  }
  return friendlyValue(fact.value);
}
function interactionSummary(fact: EvidenceReadableFact): string {
  const value =
    fact.value && typeof fact.value === "object"
      ? (fact.value as Record<string, unknown>)
      : null;
  if (fact.factId.includes(".action.") && value) {
    const target =
      value.target && typeof value.target === "object"
        ? (value.target as Record<string, unknown>)
        : null;
    const pbId = typeof target?.pbId === "string" ? target.pbId : "";
    const owner = screens.find((screen) =>
      pbId.startsWith(`${screen.screenId}.`),
    );
    return owner ? `点击「${owner.label}」中的列表项` : "点击页面中的可操作项";
  }
  if (fact.factId.includes(".scenario.")) return "交互路径已执行";
  return friendlyValue(fact.value);
}
function regionMeta(region: EvidenceSemanticRegionReadModel): string {
  return [
    region.role ? `角色 ${region.role}` : "",
    region.tag ? `<${region.tag}>` : "",
    region.visible === undefined ? "" : region.visible ? "可见" : "不可见",
  ]
    .filter(Boolean)
    .join(" · ");
}
function bboxLabel(region: EvidenceSemanticRegionReadModel): string {
  if (!region.bbox) return "未记录位置";
  const { x, y, width, height } = region.bbox;
  return `x ${Math.round(x)} · y ${Math.round(y)} · ${Math.round(width)} × ${Math.round(height)}`;
}
function selectCase(item: EvidenceCaseReadModel) {
  selectedRevisionId.value = item.revisionId;
}
function moveSelection(direction: -1 | 1) {
  if (!cases.value.length) return;
  const next =
    (selectedIndex.value + direction + cases.value.length) % cases.value.length;
  selectedRevisionId.value = cases.value[next]!.revisionId;
}
async function load() {
  if (!capture.connected) await capture.connect();
  await capture.loadSnapshot(props.bundleId, props.snapshotId);
}

watch(
  cases,
  (items) => {
    if (
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
      <RouterLink to="/workbench/capture" class="back-link">
        <ArrowLeft :size="15" /> 任务中心
      </RouterLink>
      <div>
        <h1>采集结果</h1>
        <span v-if="model">{{
          new Intl.DateTimeFormat("zh-CN", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(model.committedAt))
        }}</span>
      </div>
    </header>

    <v-alert
      v-if="capture.lastError"
      type="error"
      variant="tonal"
      closable
      @click:close="capture.clearError"
    >
      {{ capture.lastError }}
    </v-alert>

    <template v-if="model">
      <section class="result-summary">
        <span
          class="summary-icon"
          :class="{ warning: model.coverageStatus !== 'complete' }"
        >
          <CheckCircle2 v-if="model.coverageStatus === 'complete'" :size="22" />
          <AlertTriangle v-else :size="22" />
        </span>
        <div>
          <strong
            >{{ successfulCount }} /
            {{ model.summary.selected }} 个视图采集成功</strong
          >
          <small
            >{{ model.summary.screenshots }} 张截图{{
              model.summary.reused ? ` · ${model.summary.reused} 项复用` : ""
            }}{{
              existingHandoffs.length
                ? ` · 已有 ${existingHandoffs.length} 个交接`
                : ""
            }}</small
          >
        </div>
        <div v-if="reviewNotes.length" class="review-count">
          {{ reviewNotes.length }} 项检查说明
        </div>
        <WorkbenchButton
          tone="primary"
          data-testid="open-handoff-composer"
          @click="capture.openHandoffSheet"
        >
          <Handshake :size="16" />
          {{ existingHandoffs.length ? "再创建 Agent 交接" : "创建 Agent 交接" }}
        </WorkbenchButton>
      </section>
      <ul v-if="reviewNotes.length" class="review-notes">
        <li v-for="note in reviewNotes" :key="note">{{ note }}</li>
      </ul>

      <section class="preview-section">
        <header>
          <div>
            <span>快速预览</span>
            <h2>本次采集的页面与状态</h2>
          </div>
          <small>{{ cases.length }} 个视图</small>
        </header>
        <div class="preview-grid">
          <button
            v-for="item in cases"
            :key="item.revisionId"
            type="button"
            class="preview-card"
            :class="{
              'is-active': item.revisionId === selectedCase?.revisionId,
            }"
            @click="selectCase(item)"
          >
            <div class="preview-image">
              <img
                v-if="
                  item.screenshotBlobIds[0] &&
                  capture.screenshotUrls[item.screenshotBlobIds[0]]
                "
                :src="capture.screenshotUrls[item.screenshotBlobIds[0]]"
                :alt="`${caseTitle(item)} 采集截图`"
              />
              <Image v-else :size="22" />
            </div>
            <div class="preview-copy">
              <span>
                <Route v-if="item.scenario" :size="12" />
                {{ item.scenario ? "交互结果" : "页面状态" }}
              </span>
              <strong>{{ caseTitle(item) }}</strong>
              <small>{{ scenarioSummary(item) }}</small>
            </div>
          </button>
        </div>
      </section>

      <section v-if="selectedCase" class="selected-evidence">
        <header class="selected-heading">
          <div>
            <span>{{ selectedCase.scenario ? "交互结果" : "页面状态" }}</span>
            <h2>{{ caseTitle(selectedCase) }}</h2>
            <small>{{ scenarioSummary(selectedCase) }}</small>
          </div>
          <div class="selected-actions">
            <RouterLink :to="screenPath(selectedCase.screenId)">
              打开页面 <ExternalLink :size="13" />
            </RouterLink>
            <WorkbenchIconButton
              label="上一个采集视图"
              size="small"
              @click="moveSelection(-1)"
            >
              <ChevronLeft :size="16" />
            </WorkbenchIconButton>
            <span>{{ selectedIndex + 1 }} / {{ cases.length }}</span>
            <WorkbenchIconButton
              label="下一个采集视图"
              size="small"
              @click="moveSelection(1)"
            >
              <ChevronRight :size="16" />
            </WorkbenchIconButton>
          </div>
        </header>

        <div
          v-if="selectedCase.semanticCoverage !== 'declared'"
          class="case-note"
        >
          <AlertTriangle :size="16" />
          <span
            >这个页面状态尚未设置明确的验收元素；截图和已识别内容仍可正常检查。</span
          >
        </div>

        <div class="case-layout">
          <section class="visual-evidence">
            <div class="subheading">
              <strong><Image :size="16" /> 采集截图</strong>
              <span>{{ selectedCase.screenshotBlobIds.length }} 张</span>
            </div>
            <figure
              v-for="blobId in selectedCase.screenshotBlobIds"
              :key="blobId"
            >
              <img
                v-if="capture.screenshotUrls[blobId]"
                :src="capture.screenshotUrls[blobId]"
                :alt="`${caseTitle(selectedCase)} 采集截图`"
              />
            </figure>
            <div
              v-if="!selectedCase.screenshotBlobIds.length"
              class="screenshot-empty"
            >
              <Image :size="24" />
              <strong>没有可显示的截图</strong>
            </div>
            <div
              v-if="selectedCase.fragmentLabels.length"
              class="fragment-note"
            >
              <MousePointer2 :size="14" />
              只采集：
              {{ selectedCase.fragmentLabels.join("、") }}
            </div>
          </section>

          <section class="fact-evidence">
            <div class="subheading">
              <strong><FileJson2 :size="16" /> 页面内容</strong>
              <span>{{ selectedCase.regions.length }} 个区域</span>
            </div>

            <section
              v-if="selectedCase.contextFacts.length"
              class="evidence-group"
            >
              <h3>采集概况</h3>
              <div class="context-grid">
                <article
                  v-for="fact in selectedCase.contextFacts"
                  :key="fact.factId"
                  :class="`is-${fact.resolution}`"
                >
                  <span>{{ contextLabel(fact) }}</span>
                  <strong>{{ contextValue(fact) }}</strong>
                </article>
              </div>
            </section>

            <section
              v-if="selectedCase.interactionFacts.length"
              class="evidence-group"
            >
              <h3>交互路径</h3>
              <article
                v-for="fact in selectedCase.interactionFacts"
                :key="fact.factId"
                class="interaction-card"
              >
                <CheckCircle2 :size="15" />
                <strong>{{ interactionSummary(fact) }}</strong>
              </article>
            </section>

            <section v-if="selectedCase.regions.length" class="evidence-group">
              <h3>页面区域</h3>
              <div class="region-list">
                <article
                  v-for="(region, index) in selectedCase.regions"
                  :key="region.regionId"
                  class="region-card"
                >
                  <span class="region-index">{{
                    String(index + 1).padStart(2, "0")
                  }}</span>
                  <div>
                    <strong>{{ region.label }}</strong>
                    <span>{{ regionMeta(region) }}</span>
                    <p v-if="region.text && region.text !== region.label">
                      {{ region.text }}
                    </p>
                    <small>{{ bboxLabel(region) }}</small>
                  </div>
                </article>
              </div>
            </section>

            <details class="technical-evidence">
              <summary>技术详情与原始事实</summary>
              <dl>
                <dt>采集方式</dt>
                <dd>{{ selectedCase.evidenceLevel }}</dd>
                <dt>Revision</dt>
                <dd>{{ selectedCase.revisionId }}</dd>
                <dt>Case</dt>
                <dd>{{ selectedCase.caseId }}</dd>
              </dl>
              <p>
                以下事实严格保持 Store JSON
                顺序；页面只做只读映射，不重排或改写原始证据。
              </p>
              <article
                v-for="fact in selectedCase.facts"
                :key="fact.factId"
                :class="`is-${fact.resolution}`"
              >
                <header>
                  <strong>#{{ fact.sourceIndex + 1 }} {{ fact.label }}</strong>
                  <span>{{ fact.resolution }}</span>
                </header>
                <code>{{ fact.factId }}</code>
                <pre>{{ friendlyValue(fact.value) }}</pre>
                <details>
                  <summary>来源</summary>
                  <ul>
                    <li
                      v-for="source in fact.provenance"
                      :key="`${source.source}-${source.locator}`"
                    >
                      {{ source.source }} · {{ source.locator }}
                    </li>
                  </ul>
                </details>
              </article>
            </details>
          </section>
        </div>
      </section>
    </template>

    <section v-else-if="!capture.lastError" class="viewer-loading">
      <v-progress-circular indeterminate color="primary" />
      <strong>正在读取采集结果</strong>
    </section>
  </main>
</template>

<style scoped>
.evidence-viewer {
  width: min(1220px, calc(100% - 48px));
  margin: 0 auto;
  padding: 28px 0 72px;
}
.viewer-header {
  margin-bottom: 16px;
}
.viewer-header > div {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-top: 10px;
}
.viewer-header h1 {
  margin: 0;
  font-size: 1.8rem;
  letter-spacing: -0.03em;
}
.viewer-header > div > span {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.7rem;
}
.back-link,
.selected-actions a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  text-decoration: none;
}
.result-summary {
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 13px;
  background: rgb(var(--v-theme-surface));
}
.summary-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 11px;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 11%, transparent);
  color: rgb(var(--v-theme-success));
}
.summary-icon.warning {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 12%, transparent);
  color: rgb(var(--v-theme-warning));
}
.result-summary > div {
  display: grid;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.result-summary small {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.7rem;
}
.review-count {
  padding: 5px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 10%, transparent);
  color: rgb(var(--v-theme-warning));
  font-size: 0.68rem;
  font-weight: 750;
  white-space: nowrap;
}
.review-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 22px;
  margin: 8px 0 0;
  padding: 0 0 0 18px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.7rem;
}
.preview-section,
.selected-evidence {
  margin-top: 18px;
}
.preview-section > header,
.selected-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}
.preview-section header span,
.selected-heading > div > span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.66rem;
  font-weight: 800;
}
.preview-section h2,
.selected-heading h2 {
  margin: 2px 0 0;
  font-size: 1rem;
}
.preview-section header small,
.selected-heading small {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
}
.preview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;
}
.preview-card {
  min-width: 0;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.preview-card:hover,
.preview-card.is-active {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}
.preview-image {
  display: grid;
  height: 148px;
  place-items: center;
  overflow: hidden;
  background: #eef2f7;
  color: #8792a5;
}
.preview-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: top center;
}
.preview-copy {
  display: grid;
  gap: 3px;
  padding: 10px;
}
.preview-copy > span {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.62rem;
  font-weight: 800;
}
.preview-copy strong,
.preview-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-copy strong {
  font-size: 0.75rem;
}
.preview-copy small {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.64rem;
}
.selected-evidence {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 15px;
  background: rgb(var(--v-theme-surface));
}
.selected-heading {
  min-height: 66px;
  align-items: center;
  margin: 0;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.selected-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.selected-actions > span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.66rem;
}
.case-note {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 8%, transparent);
  color: rgb(var(--v-theme-warning));
  font-size: 0.7rem;
}
.case-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.86fr) minmax(430px, 1.34fr);
}
.visual-evidence,
.fact-evidence {
  min-width: 0;
  padding: 16px;
}
.visual-evidence {
  align-self: start;
  position: sticky;
  top: 14px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.018);
}
.subheading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.subheading strong {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
}
.subheading span {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.65rem;
}
.visual-evidence figure {
  overflow: hidden;
  margin: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: #eef2f7;
}
.visual-evidence figure + figure {
  margin-top: 8px;
}
.visual-evidence img {
  display: block;
  width: 100%;
  max-height: 610px;
  object-fit: contain;
}
.screenshot-empty {
  display: grid;
  min-height: 260px;
  place-items: center;
  align-content: center;
  gap: 6px;
  color: rgba(var(--v-theme-on-surface), 0.45);
}
.fragment-note {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 9px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.68rem;
}
.evidence-group + .evidence-group {
  margin-top: 16px;
}
.evidence-group h3 {
  margin: 0 0 7px;
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.7rem;
}
.context-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}
.context-grid article {
  display: grid;
  gap: 3px;
  min-width: 0;
  padding: 9px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.018);
}
.context-grid span {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.64rem;
}
.context-grid strong {
  overflow: hidden;
  font-size: 0.7rem;
  text-overflow: ellipsis;
}
.interaction-card {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 7%, transparent);
  color: rgb(var(--v-theme-success));
  font-size: 0.7rem;
}
.interaction-card + .interaction-card {
  margin-top: 6px;
}
.region-list {
  display: grid;
  gap: 7px;
}
.region-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 9px;
  background: rgba(var(--v-theme-on-surface), 0.015);
}
.region-index {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 7px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
  color: rgb(var(--v-theme-primary));
  font:
    700 0.63rem ui-monospace,
    monospace;
}
.region-card div {
  min-width: 0;
}
.region-card div > strong,
.region-card div > span,
.region-card div > small {
  display: block;
}
.region-card div > strong {
  overflow: hidden;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.region-card div > span,
.region-card div > small {
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.64rem;
}
.region-card p {
  display: -webkit-box;
  overflow: hidden;
  margin: 5px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.68rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.technical-evidence {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.67rem;
}
.technical-evidence dl {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 5px 8px;
}
.technical-evidence dd {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
}
.technical-evidence > article {
  margin-top: 7px;
  padding: 9px;
  border-left: 3px solid rgb(var(--v-theme-success));
  border-radius: 7px;
  background: rgba(var(--v-theme-on-surface), 0.025);
}
.technical-evidence > article.is-unknown,
.technical-evidence > article.is-unresolved-conflict {
  border-left-color: rgb(var(--v-theme-warning));
}
.technical-evidence article header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.technical-evidence code {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  text-overflow: ellipsis;
}
.technical-evidence pre {
  overflow: auto;
  max-height: 170px;
  margin: 5px 0 0;
  white-space: pre-wrap;
}
.viewer-loading {
  display: grid;
  min-height: 420px;
  place-items: center;
  align-content: center;
  gap: 12px;
}
@media (max-width: 980px) {
  .preview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .case-layout {
    grid-template-columns: 1fr;
  }
  .visual-evidence {
    position: static;
    border-right: 0;
    border-bottom: 1px solid
      rgba(var(--v-border-color), var(--v-border-opacity));
  }
}
</style>
