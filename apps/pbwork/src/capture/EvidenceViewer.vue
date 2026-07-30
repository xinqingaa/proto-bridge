<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileJson2,
  Image,
  Layers3,
  MousePointer2,
  ScanLine,
} from "lucide-vue-next";
import {
  buildEvidenceReadModel,
  type EvidenceCaseReadModel,
  type EvidenceReadableFact,
  type EvidenceSemanticRegionReadModel,
} from "@proto-bridge/core/v2/evidence-read-model";
import { useCaptureStore } from "@/app/stores/capture";
import { loadPrototypeScreens } from "@/design-system/loaders";

const props = defineProps<{
  bundleId: string;
  snapshotId: string;
}>();
const capture = useCaptureStore();
const screens = loadPrototypeScreens();

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

const screenLabel = (screenId: string) =>
  screens.find((screen) => screen.screenId === screenId)?.label ?? screenId;
const screenPath = (screenId: string) => {
  const screen = screens.find((item) => item.screenId === screenId);
  return screen
    ? `/workbench/prototypes/${screen.prototypeId}/screens/${screen.screenSlug}`
    : "/workbench/prototypes/all";
};
const semanticLabel = (value: EvidenceCaseReadModel["semanticCoverage"]) =>
  ({
    declared: "覆盖范围已声明",
    undeclared: "无法证明完整",
    incomplete: "缺少必要语义节点",
    "not-recorded": "旧证据未记录完整性",
  })[value];
function friendlyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "是" : "否";
  if (value === undefined) return "没有确定值";
  return JSON.stringify(value, null, 2);
}

function evidenceLevelSummary(
  levels: NonNullable<typeof model.value>["evidenceLevels"],
): string {
  if (levels.length === 0) return "unknown";
  if (levels.length === 1) return levels[0]!.level;
  return `${levels.length} 种级别`;
}

function contextLabel(fact: EvidenceReadableFact): string {
  if (fact.category === "coverage") return "语义覆盖";
  if (fact.factId.endsWith(".screenId")) return "实际页面";
  if (fact.factId.endsWith(".variantId")) return "实际状态";
  if (fact.factId.endsWith(".themeId")) return "实际主题";
  return fact.label;
}

function contextValue(fact: EvidenceReadableFact): string {
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
    const status =
      value.status === "declared"
        ? "已声明"
        : value.status === "incomplete"
          ? "不完整"
          : "未声明";
    return [
      status,
      required ? `${required} 个必要元素` : "",
      `${observed} 个已观测`,
      missing ? `${missing} 个缺失` : "",
    ]
      .filter(Boolean)
      .join(" · ");
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
    const identity = target?.pbId
      ? `${String(target.pbId)}${target.pbKey ? `#${String(target.pbKey)}` : ""}`
      : "页面元素";
    return `${String(value.kind ?? "操作")} · ${identity}`;
  }
  if (fact.factId.includes(".scenario.") && value) {
    const checkpoint =
      value.checkpoint && typeof value.checkpoint === "object"
        ? (value.checkpoint as Record<string, unknown>)
        : null;
    return `业务场景 · ${String(checkpoint?.checkpointId ?? fact.factId.split(".").at(-1))}`;
  }
  return friendlyValue(fact.value);
}

function regionMeta(region: EvidenceSemanticRegionReadModel): string {
  return [
    region.role ? `角色 ${region.role}` : "",
    region.tag ? `<${region.tag}>` : "",
    region.visible === false ? "不可见" : "可见",
  ]
    .filter(Boolean)
    .join(" · ");
}

function bboxLabel(region: EvidenceSemanticRegionReadModel): string {
  if (!region.bbox) return "未记录位置";
  const { x, y, width, height } = region.bbox;
  return `x ${Math.round(x)} · y ${Math.round(y)} · ${Math.round(width)} × ${Math.round(height)}`;
}

async function load() {
  if (!capture.connected) await capture.connect();
  await capture.loadSnapshot(props.bundleId, props.snapshotId);
}

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
        <ArrowLeft :size="16" /> 返回采集证据
      </RouterLink>
      <div class="header-main">
        <div>
          <span class="eyebrow"><ScanLine :size="15" /> Evidence Viewer</span>
          <h1>采集结果</h1>
          <p>
            先查看截图和业务证据；revision、provenance 与原始 JSON
            收在技术详情中。
          </p>
        </div>
        <div class="header-actions">
          <RouterLink to="/workbench/capture">高级任务中心</RouterLink>
        </div>
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
      <section class="result-hero" :class="`is-${model.deliveryStatus}`">
        <div class="result-status">
          <CheckCircle2 v-if="model.deliveryStatus === 'ready'" :size="28" />
          <AlertTriangle v-else :size="28" />
          <div>
            <span>当前判断</span>
            <h2>
              {{
                model.deliveryStatus === "ready"
                  ? "证据可以继续交付"
                  : "证据已保存，但需要注意限制"
              }}
            </h2>
          </div>
        </div>
        <div class="status-dimensions">
          <article>
            <span>执行覆盖</span>
            <strong>{{ model.coverageStatus }}</strong>
            <small>是否每个采集项都有成功 Attempt</small>
          </article>
          <article>
            <span>语义完整性</span>
            <strong>{{ model.semanticStatus }}</strong>
            <small>是否有明确、满足的语义覆盖边界</small>
          </article>
          <article>
            <span>Evidence Level</span>
            <strong>{{ evidenceLevelSummary(model.evidenceLevels) }}</strong>
            <small>
              {{
                model.evidenceLevels
                  .map((item) => `${item.level} × ${item.count}`)
                  .join("；") || "没有活动证据"
              }}
            </small>
          </article>
        </div>
        <ul>
          <li v-for="message in model.messages" :key="message">
            {{ message }}
          </li>
        </ul>
      </section>

      <section class="metric-grid">
        <article>
          <span>选择</span><strong>{{ model.summary.selected }}</strong>
        </article>
        <article>
          <span>新采集</span><strong>{{ model.summary.captured }}</strong>
        </article>
        <article>
          <span>复用</span><strong>{{ model.summary.reused }}</strong>
        </article>
        <article>
          <span>截图</span><strong>{{ model.summary.screenshots }}</strong>
        </article>
        <article :class="{ attention: model.summary.unknown }">
          <span>Unknown</span><strong>{{ model.summary.unknown }}</strong>
        </article>
        <article
          :class="{ attention: model.summary.failed + model.summary.missing }"
        >
          <span>未完成</span
          ><strong>{{ model.summary.failed + model.summary.missing }}</strong>
        </article>
      </section>

      <section
        v-for="screen in model.screens"
        :key="screen.screenId"
        class="screen-evidence"
      >
        <header class="screen-heading">
          <div>
            <span><Layers3 :size="15" /> 页面证据</span>
            <h2>{{ screenLabel(screen.screenId) }}</h2>
            <code>{{ screen.screenId }}</code>
          </div>
          <RouterLink :to="screenPath(screen.screenId)">
            回到页面画布 <ExternalLink :size="14" />
          </RouterLink>
        </header>

        <article
          v-for="item in screen.cases"
          :key="item.revisionId"
          class="case-evidence"
        >
          <div class="case-heading">
            <div>
              <span
                >{{ item.variantId }} · {{ item.themeId }} ·
                {{ item.deviceId }}</span
              >
              <h3>
                {{ item.scenarioLabel || "页面基础状态" }}
              </h3>
            </div>
            <div class="case-badges">
              <span>{{ item.evidenceLevel }}</span>
              <span
                :class="{
                  limited: item.semanticCoverage !== 'declared',
                }"
                >{{ semanticLabel(item.semanticCoverage) }}</span
              >
              <span v-if="item.scopeKind === 'fragment'"
                ><MousePointer2 :size="12" /> Fragment</span
              >
            </div>
          </div>

          <div class="case-layout">
            <section class="visual-evidence">
              <div class="subheading">
                <div>
                  <Image :size="17" />
                  <strong>采集截图</strong>
                </div>
                <span>{{ item.screenshotBlobIds.length }} 张</span>
              </div>
              <div v-if="item.screenshotBlobIds.length" class="screenshot-list">
                <figure v-for="blobId in item.screenshotBlobIds" :key="blobId">
                  <img
                    v-if="capture.screenshotUrls[blobId]"
                    :src="capture.screenshotUrls[blobId]"
                    :alt="`${screenLabel(screen.screenId)} ${item.variantId} 采集截图`"
                  />
                  <figcaption>
                    <span>{{ item.variantId }}</span>
                    <code>{{ blobId }}</code>
                  </figcaption>
                </figure>
              </div>
              <div v-else class="screenshot-empty">
                <AlertTriangle :size="22" />
                <strong>没有可显示的 Screenshot Blob</strong>
                <span>不会用占位图冒充采集截图。</span>
              </div>
              <div v-if="item.fragmentLabels.length" class="fragment-summary">
                <strong>本次只采集稳定元素</strong>
                <span v-for="fragment in item.fragmentLabels" :key="fragment">
                  {{ fragment }}
                </span>
              </div>
            </section>

            <section class="fact-evidence">
              <div class="subheading">
                <div>
                  <FileJson2 :size="17" />
                  <strong>页面内容与语义区域</strong>
                </div>
                <span
                  >{{ item.regions.length }} 个区域 ·
                  {{ item.facts.length }} 个原始事实</span
                >
              </div>

              <section v-if="item.contextFacts.length" class="evidence-group">
                <h4>本次采集说明</h4>
                <div class="context-grid">
                  <article
                    v-for="fact in item.contextFacts"
                    :key="fact.factId"
                    :class="`is-${fact.resolution}`"
                  >
                    <span>{{ contextLabel(fact) }}</span>
                    <strong>{{ contextValue(fact) }}</strong>
                  </article>
                </div>
              </section>

              <section
                v-if="item.interactionFacts.length"
                class="evidence-group"
              >
                <h4>可执行交互与业务场景</h4>
                <article
                  v-for="fact in item.interactionFacts"
                  :key="fact.factId"
                  class="interaction-card"
                  :class="`is-${fact.resolution}`"
                >
                  <strong>{{ interactionSummary(fact) }}</strong>
                  <details>
                    <summary>查看来源</summary>
                    <code>{{ fact.factId }}</code>
                  </details>
                </article>
              </section>

              <section v-if="item.regions.length" class="evidence-group">
                <h4>页面语义区域（按采集顺序）</h4>
                <div class="region-list">
                  <article
                    v-for="(region, regionIndex) in item.regions"
                    :key="region.regionId"
                    class="region-card"
                  >
                    <span class="region-index">{{
                      String(regionIndex + 1).padStart(2, "0")
                    }}</span>
                    <div class="region-copy">
                      <strong>{{ region.label }}</strong>
                      <span>{{ regionMeta(region) }}</span>
                      <p v-if="region.text && region.text !== region.label">
                        {{ region.text }}
                      </p>
                      <small>{{ bboxLabel(region) }}</small>
                    </div>
                    <details>
                      <summary>{{ region.facts.length }} 个来源事实</summary>
                      <div
                        v-for="fact in region.facts"
                        :key="fact.factId"
                        class="source-fact"
                      >
                        <span
                          >#{{ fact.sourceIndex + 1 }} {{ fact.label }}</span
                        >
                        <code>{{ fact.factId }}</code>
                        <pre>{{ friendlyValue(fact.value) }}</pre>
                      </div>
                    </details>
                  </article>
                </div>
              </section>

              <section
                v-if="
                  !item.contextFacts.length &&
                  !item.interactionFacts.length &&
                  !item.regions.length
                "
                class="screenshot-empty"
              >
                <FileJson2 :size="22" />
                <strong>此 Case 没有可映射的语义事实</strong>
                <span>原始 Revision 标识仍保留在下方技术详情。</span>
              </section>

              <details class="raw-facts">
                <summary>
                  所有原始事实（严格按 JSON 顺序，共
                  {{ item.facts.length }} 项）
                </summary>
                <article
                  v-for="fact in item.facts"
                  :key="fact.factId"
                  :class="`is-${fact.resolution}`"
                >
                  <div class="fact-title">
                    <strong
                      >#{{ fact.sourceIndex + 1 }} {{ fact.label }}</strong
                    >
                    <span>{{ fact.resolution }}</span>
                  </div>
                  <pre>{{ friendlyValue(fact.value) }}</pre>
                  <p v-if="fact.issueRef">原因：{{ fact.issueRef }}</p>
                  <details>
                    <summary>来源与技术详情</summary>
                    <code>{{ fact.factId }}</code>
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

          <details class="revision-details">
            <summary>Revision、Case 与映射说明</summary>
            <code>{{ item.revisionId }}</code>
            <code>{{ item.caseId }}</code>
            <p>
              上方区域是只读映射；Fact ID、顺序、值与 provenance 均来自该
              Revision，Store JSON 未重排或改写。
            </p>
          </details>
        </article>
      </section>
    </template>

    <section v-else-if="!capture.lastError" class="viewer-loading">
      <v-progress-circular indeterminate color="primary" />
      <strong>正在读取固定 Snapshot</strong>
    </section>
  </main>
</template>

<style scoped>
.evidence-viewer {
  width: min(1280px, calc(100% - 48px));
  margin: 0 auto;
  padding: 28px 0 72px;
}
.viewer-header {
  margin-bottom: 20px;
}
.back-link,
.header-actions a,
.screen-heading a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.74rem;
  text-decoration: none;
}
.header-main {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-top: 14px;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
}
.viewer-header h1 {
  margin: 5px 0 0;
  font-size: 2rem;
}
.viewer-header p {
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
}
.result-hero {
  margin-top: 18px;
  padding: 22px;
  border: 1px solid
    color-mix(in srgb, rgb(var(--v-theme-success)) 28%, transparent);
  border-radius: 18px;
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-success)) 6%,
    rgb(var(--v-theme-surface))
  );
}
.result-hero.is-attention {
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-warning)) 32%,
    transparent
  );
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-warning)) 6%,
    rgb(var(--v-theme-surface))
  );
}
.result-status {
  display: flex;
  align-items: center;
  gap: 12px;
}
.result-status > span,
.status-dimensions span {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.68rem;
}
.result-status h2 {
  margin: 2px 0 0;
}
.status-dimensions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}
.status-dimensions article {
  padding: 13px;
  border-radius: 11px;
  background: rgba(var(--v-theme-surface), 0.72);
}
.status-dimensions strong,
.status-dimensions small {
  display: block;
}
.status-dimensions strong {
  margin-top: 3px;
}
.status-dimensions small {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.result-hero ul {
  margin: 14px 0 0;
  padding-left: 20px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.76rem;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.metric-grid article {
  padding: 13px 15px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.metric-grid span,
.metric-grid strong {
  display: block;
}
.metric-grid span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
}
.metric-grid strong {
  margin-top: 3px;
  font-size: 1.1rem;
}
.metric-grid article.attention {
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-warning)) 35%,
    transparent
  );
}
.screen-evidence {
  margin-top: 22px;
}
.screen-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}
.screen-heading > div > span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
}
.screen-heading h2 {
  display: inline-block;
  margin: 3px 8px 0 0;
}
.screen-heading code {
  color: rgba(var(--v-theme-on-surface), 0.43);
  font-size: 0.67rem;
}
.case-evidence {
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 17px;
  background: rgb(var(--v-theme-surface));
}
.case-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.case-heading > div > span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
}
.case-heading h3 {
  margin: 2px 0 0;
}
.case-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}
.case-badges span {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 12%, transparent);
  color: rgb(var(--v-theme-success));
  font-size: 0.66rem;
  font-weight: 700;
}
.case-badges span.limited {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 12%, transparent);
  color: rgb(var(--v-theme-warning));
}
.case-layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(420px, 1.4fr);
}
.visual-evidence,
.fact-evidence {
  min-width: 0;
  padding: 18px;
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
  margin-bottom: 12px;
}
.subheading > div {
  display: flex;
  align-items: center;
  gap: 7px;
}
.subheading > span {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.68rem;
}
.screenshot-list {
  display: grid;
  gap: 12px;
}
.screenshot-list figure {
  overflow: hidden;
  margin: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.screenshot-list img {
  display: block;
  width: 100%;
  max-height: 560px;
  object-fit: contain;
  background: #eef2f7;
}
.screenshot-list figcaption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 10px;
  font-size: 0.68rem;
}
.screenshot-list figcaption code {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.4);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.screenshot-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 5px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  color: rgba(var(--v-theme-on-surface), 0.52);
  text-align: center;
}
.fragment-summary {
  display: grid;
  gap: 5px;
  margin-top: 12px;
  padding: 11px;
  border-radius: 10px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent);
  font-size: 0.7rem;
}
.evidence-group + .evidence-group {
  margin-top: 16px;
}
.evidence-group h4 {
  margin: 0 0 7px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.7rem;
}
.context-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}
.context-grid article {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 9px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.context-grid span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.66rem;
}
.context-grid strong {
  overflow: hidden;
  font-size: 0.72rem;
  text-overflow: ellipsis;
}
.interaction-card {
  padding: 10px 11px;
  border-left: 3px solid rgb(var(--v-theme-success));
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.025);
}
.interaction-card + .interaction-card {
  margin-top: 6px;
}
.interaction-card.is-unknown,
.interaction-card.is-unresolved-conflict,
.context-grid article.is-unknown,
.context-grid article.is-unresolved-conflict {
  border-left-color: rgb(var(--v-theme-warning));
}
.interaction-card details {
  margin-top: 5px;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.65rem;
}
.interaction-card code {
  display: block;
  overflow: hidden;
  margin-top: 5px;
  text-overflow: ellipsis;
}
.region-list {
  display: grid;
  gap: 7px;
}
.region-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 11px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 11px;
  background: rgba(var(--v-theme-on-surface), 0.018);
}
.region-index {
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
  color: rgb(var(--v-theme-primary));
  font:
    700 0.65rem ui-monospace,
    monospace;
}
.region-copy {
  min-width: 0;
}
.region-copy > strong,
.region-copy > span,
.region-copy > small {
  display: block;
}
.region-copy > strong {
  overflow: hidden;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.region-copy > span,
.region-copy > small {
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.66rem;
}
.region-copy p {
  display: -webkit-box;
  overflow: hidden;
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.7rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.region-card > details {
  grid-column: 2;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.66rem;
}
.source-fact {
  display: grid;
  gap: 3px;
  margin-top: 7px;
  padding: 7px 8px;
  border-radius: 7px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}
.source-fact code,
.source-fact pre {
  overflow: auto;
  margin: 0;
  font:
    0.64rem/1.4 ui-monospace,
    monospace;
}
.source-fact code {
  color: rgba(var(--v-theme-on-surface), 0.48);
}
.raw-facts {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgba(var(--v-theme-on-surface), 0.54);
  font-size: 0.68rem;
}
.raw-facts > article {
  margin-top: 7px;
  padding: 9px 10px;
  border-left: 3px solid rgb(var(--v-theme-success));
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.025);
}
.raw-facts > article.is-unknown,
.raw-facts > article.is-unresolved-conflict {
  border-left-color: rgb(var(--v-theme-warning));
}
.fact-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.fact-title span {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.64rem;
}
.raw-facts pre {
  overflow: auto;
  max-height: 180px;
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.74);
  font:
    0.7rem/1.5 ui-monospace,
    monospace;
  white-space: pre-wrap;
}
.raw-facts p {
  margin: 6px 0 0;
  color: rgb(var(--v-theme-warning));
  font-size: 0.68rem;
}
.raw-facts details,
.revision-details {
  margin-top: 7px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.66rem;
}
.raw-facts details code,
.revision-details code {
  display: block;
  overflow: hidden;
  margin-top: 5px;
  text-overflow: ellipsis;
}
.raw-facts details ul {
  margin: 5px 0 0;
  padding-left: 18px;
}
.revision-details {
  padding: 0 18px 14px;
}
.revision-details p {
  margin: 7px 0 0;
}
.viewer-loading {
  display: grid;
  min-height: 420px;
  place-items: center;
  align-content: center;
  gap: 12px;
}
@media (max-width: 980px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
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
  .context-grid {
    grid-template-columns: 1fr;
  }
}
</style>
