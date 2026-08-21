<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Handshake,
  LoaderCircle,
  ScanLine,
  X,
} from "lucide-vue-next";
import { riskKindLabel } from "@proto-bridge/core/v2/prompts/agent-prompt";
import { useCaptureStore } from "@/app/stores/capture";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import { usePointerSwipe } from "@/design-system/components/_shared/usePointerSwipe";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchCheckbox from "@/workbench/ui/WorkbenchCheckbox.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";
import WorkbenchTextField from "@/workbench/ui/WorkbenchTextField.vue";

const capture = useCaptureStore();
const router = useRouter();
const prototypes = loadPrototypes();
const screens = loadPrototypeScreens();
const copied = ref(false);
const selectionCopied = ref(false);

const STEP_TITLES = [
  "确认范围",
  "执行中",
  "结果与风险",
  "Agent 提示词",
] as const;

const prototype = computed(() =>
  prototypes.find((item) => item.id === capture.draft?.prototypeId),
);
const entryLabel = computed(
  () =>
    ({
      "current-screen": "当前页面",
      fragment: "所选元素",
      custom: "自定义页面范围",
      prototype: "整个原型",
    })[capture.entryKind ?? "custom"],
);
const fragmentLabel = computed(() => {
  const fragments = capture.draft?.screens[0]?.captureScope.fragments ?? [];
  if (!fragments.length) return "";
  return fragments
    .map((item) => (item.pbKey ? `${item.pbId}#${item.pbKey}` : item.pbId))
    .join(", ");
});
const prototypeScreens = computed(() =>
  screens.filter((screen) => screen.prototypeId === capture.draft?.prototypeId),
);
const selectedScreenIds = computed(
  () => new Set(capture.draft?.screens.map((screen) => screen.screenId) ?? []),
);
const omittedScreenLabels = computed(() =>
  prototypeScreens.value
    .filter((screen) => !selectedScreenIds.value.has(screen.screenId))
    .map((screen) => screen.label),
);
const draftScreens = computed(() =>
  (capture.draft?.screens ?? []).map((selection) => ({
    selection,
    record: screens.find((screen) => screen.screenId === selection.screenId),
  })),
);
const warnings = computed(() => capture.preflight?.result.warnings ?? []);
const blocks = computed(() =>
  (capture.preflight?.result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.severity === "block",
  ),
);
const matrixCount = computed(
  () => capture.preflight?.result.matrix.length ?? 0,
);
const selectedVariantCount = computed(() =>
  draftScreens.value.reduce(
    (total, { selection }) => total + selection.variants.variantIds.length,
    0,
  ),
);
const totalVariantCount = computed(() =>
  prototypeScreens.value.reduce(
    (total, screen) => total + screen.variants.length,
    0,
  ),
);
const selectedScenarioCheckpointCount = computed(() =>
  draftScreens.value.reduce(
    (total, { selection, record }) =>
      total +
      (record?.scenarios ?? [])
        .filter(
          (scenario) =>
            selection.scenarios.mode === "explicit" &&
            selection.scenarios.scenarioIds.includes(scenario.id),
        )
        .reduce((count, scenario) => count + scenario.checkpoints.length, 0),
    0,
  ),
);
const selectedCaseCount = computed(
  () => selectedVariantCount.value + selectedScenarioCheckpointCount.value,
);
const totalScenarioCheckpointCount = computed(() =>
  prototypeScreens.value.reduce(
    (total, screen) =>
      total +
      (screen.scenarios ?? []).reduce(
        (count, scenario) => count + scenario.checkpoints.length,
        0,
      ),
    0,
  ),
);
const risks = computed(() => capture.handoffPreview?.risks ?? []);
const successfulCount = computed(() => {
  const counts = capture.details?.activeSnapshot.coverage.counts;
  if (!counts) return 0;
  return counts.captured + counts.reused;
});
const promptHtml = computed(() => renderMarkdown(capture.agentPrompt ?? ""));

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

const totalCases = computed(
  () => capture.activeJob?.selection.cases.length ?? 0,
);
const completedCases = computed(
  () =>
    capture.activeJob?.journal.filter(
      (entry) => entry.event === "case-finished",
    ).length ?? 0,
);
const caseProgress = computed(() =>
  totalCases.value === 0
    ? 0
    : Math.min(100, (completedCases.value / totalCases.value) * 100),
);
const statusLabel = computed(() => {
  const status = capture.activeJob?.status;
  return status ? STATUS_LABELS[status] : "准备中";
});
const currentCaseLabel = computed(() => {
  const job = capture.activeJob;
  if (!job) return "";
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

const stepKeys = computed(() => ["0", "1", "2", "3"]);
const currentStepKey = computed(() => String(capture.deliverStep));
const swipeOn = ref(true);
const offsetPercent = computed(() => `-${capture.deliverStep * 100}%`);
const swipeGesture = usePointerSwipe(
  stepKeys,
  currentStepKey,
  (value) => capture.setDeliverStep(Number(value)),
  { swipe: swipeOn, mouseSwipe: swipeOn },
);

watch(
  () => capture.composerOpen,
  (open) => {
    if (
      open &&
      capture.deliverStep === 0 &&
      capture.draft &&
      !capture.preflight
    ) {
      void capture.runPreflight();
    }
  },
);

function variantSelected(screenId: string, variantId: string): boolean {
  const selection = capture.draft?.screens.find(
    (screen) => screen.screenId === screenId,
  );
  const record = screens.find((screen) => screen.screenId === screenId);
  if (!selection || !record) return false;
  return selection.variants.variantIds.includes(variantId);
}

function scenarioSelected(screenId: string, scenarioId: string): boolean {
  const selection = capture.draft?.screens.find(
    (screen) => screen.screenId === screenId,
  );
  const record = screens.find((screen) => screen.screenId === screenId);
  if (!selection || !record || selection.scenarios.mode === "none")
    return false;
  return selection.scenarios.scenarioIds.includes(scenarioId);
}

function refreshAfterEdit() {
  void capture.runPreflight();
}

async function startDeliver() {
  if (!capture.preflight) await capture.runPreflight();
  if (!capture.warningsAccepted) return;
  await capture.createJob();
}

async function finishHandoff() {
  await capture.createCurrentHandoff();
}

async function copyPrompt() {
  if (!capture.agentPrompt) return;
  try {
    await navigator.clipboard.writeText(capture.agentPrompt);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    capture.setError(new Error("无法复制提示词，请手动选择文本。"));
  }
}

async function copySelection() {
  if (!capture.draft) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(capture.draft, null, 2));
    selectionCopied.value = true;
    setTimeout(() => {
      selectionCopied.value = false;
    }, 1600);
  } catch {
    capture.setError(new Error("无法复制 Selection，请检查浏览器剪贴板权限。"));
  }
}

async function openDetails() {
  const bundleId = capture.details?.bundle.bundleId;
  const snapshotId = capture.details?.activeSnapshot.snapshotId;
  if (!bundleId || !snapshotId) return;
  capture.closeComposer();
  await router.push(`/workbench/evidence/${bundleId}/${snapshotId}`);
}

function renderMarkdown(source: string): string {
  const escaped = source
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])/gm, (line) => (line.trim() ? line : ""))
    .replace(/^(?!<)/, "<p>")
    .concat("</p>")
    .replaceAll("<p></p>", "")
    .replaceAll("<p><h", "<h")
    .replaceAll("</h1></p>", "</h1>")
    .replaceAll("</h2></p>", "</h2>")
    .replaceAll("</h3></p>", "</h3>")
    .replaceAll("<p><ul>", "<ul>")
    .replaceAll("</ul></p>", "</ul>");
}
</script>

<template>
  <v-bottom-sheet
    v-model="capture.composerOpen"
    :retain-focus="false"
    content-class="deliver-flow-overlay"
    data-testid="capture-composer"
  >
    <section
      class="deliver-flow"
      aria-label="非正式采集"
      data-testid="deliver-flow-sheet"
    >
      <header class="flow-header">
        <div class="header-mark">
          <Handshake v-if="capture.deliverStep === 3" :size="22" />
          <LoaderCircle
            v-else-if="capture.deliverStep === 1"
            :size="22"
            class="spin"
          />
          <ScanLine v-else :size="22" />
        </div>
        <div>
          <h2>非正式采集</h2>
          <p>
            {{ STEP_TITLES[capture.deliverStep] }} ·
            {{ prototype?.label ?? capture.draft?.prototypeId ?? "未选择" }}
          </p>
        </div>
        <WorkbenchIconButton
          label="关闭非正式采集"
          size="large"
          @click="capture.closeComposer"
        >
          <X :size="20" />
        </WorkbenchIconButton>
      </header>

      <div class="step-dots" aria-hidden="true">
        <span
          v-for="index in 4"
          :key="index"
          :class="{ active: index - 1 === capture.deliverStep }"
        />
      </div>

      <div
        class="flow-body"
        :class="{ 'is-dragging': swipeGesture.dragging.value }"
        @pointerdown="swipeGesture.onPointerDown"
        @pointermove="swipeGesture.onPointerMove"
        @pointerup="swipeGesture.onPointerUp"
        @pointercancel="swipeGesture.onPointerCancel"
        @touchstart="swipeGesture.onTouchStart"
        @touchmove="swipeGesture.onTouchMove"
        @touchend="swipeGesture.onTouchEnd"
        @touchcancel="swipeGesture.onTouchCancel"
        @click.capture="swipeGesture.onClickCapture"
      >
        <div
          class="flow-track"
          :style="{ transform: `translateX(${offsetPercent})` }"
        >
          <div class="flow-page">
            <div class="flow-scroll" data-no-swipe>
              <v-alert
                v-if="capture.lastError && capture.deliverStep === 0"
                type="error"
                variant="tonal"
                density="comfortable"
                closable
                @click:close="capture.clearError"
              >
                {{ capture.lastError }}
              </v-alert>

              <!-- Step 0: scope -->
              <section class="step-panel">
                <div v-if="!capture.draft" class="empty">
                  <strong>还没有交付范围</strong>
                  <p>请从原型、页面画布或元素检查面板发起。</p>
                </div>
                <template v-else>
                  <div class="summary-grid">
                    <article>
                      <span>入口</span>
                      <strong>{{ entryLabel }}</strong>
                    </article>
                    <article>
                      <span>页面</span>
                      <strong
                        >{{ capture.draft.screens.length }} /
                        {{ prototypeScreens.length }}</strong
                      >
                    </article>
                    <article>
                      <span>状态</span>
                      <strong
                        >{{ selectedVariantCount }} /
                        {{ totalVariantCount }}</strong
                      >
                    </article>
                    <article>
                      <span>场景检查点</span>
                      <strong
                        >{{ selectedScenarioCheckpointCount }} /
                        {{ totalScenarioCheckpointCount }}</strong
                      >
                    </article>
                    <article>
                      <span>将采集</span>
                      <strong
                        >{{
                          matrixCount || selectedCaseCount || "…"
                        }}
                        项</strong
                      >
                    </article>
                  </div>
                  <p v-if="fragmentLabel" class="ok-line">
                    稳定元素：{{ fragmentLabel }}
                  </p>
                  <p v-if="omittedScreenLabels.length" class="hint">
                    未包含：{{ omittedScreenLabels.join("、") }}
                  </p>
                  <div class="scope-tools">
                    <WorkbenchButton
                      tone="ghost"
                      size="small"
                      @click="copySelection"
                    >
                      <ClipboardCopy :size="14" />
                      {{
                        selectionCopied ? "已复制 Selection" : "复制 Selection"
                      }}
                    </WorkbenchButton>
                  </div>

                  <section
                    v-if="capture.entryKind === 'custom'"
                    class="scope-editor"
                  >
                    <strong>选择页面</strong>
                    <div class="choice-grid">
                      <WorkbenchCheckbox
                        v-for="screen in prototypeScreens"
                        :key="screen.screenId"
                        :model-value="selectedScreenIds.has(screen.screenId)"
                        :label="screen.label"
                        @update:model-value="
                          capture.toggleCustomScreen(screen.screenId, $event);
                          refreshAfterEdit();
                        "
                      />
                    </div>
                  </section>

                  <section class="scope-editor">
                    <strong>逐页选择状态与行为</strong>
                    <article
                      v-for="{ selection, record } in draftScreens"
                      :key="selection.screenId"
                      class="screen-editor"
                    >
                      <header>
                        <b>{{ record?.label ?? selection.screenId }}</b>
                        <small>{{ selection.screenId }}</small>
                      </header>
                      <div class="choice-group">
                        <span>页面状态</span>
                        <div class="choice-grid">
                          <WorkbenchCheckbox
                            v-for="variant in record?.variants ?? []"
                            :key="variant.id"
                            :model-value="
                              variantSelected(selection.screenId, variant.id)
                            "
                            :label="variant.label"
                            @update:model-value="
                              capture.toggleVariantId(
                                selection.screenId,
                                variant.id,
                                $event,
                              );
                              refreshAfterEdit();
                            "
                          />
                        </div>
                      </div>
                      <div
                        v-if="record?.scenarios?.length"
                        class="choice-group"
                      >
                        <span>行为场景</span>
                        <div class="choice-grid">
                          <WorkbenchCheckbox
                            v-for="scenario in record.scenarios"
                            :key="scenario.id"
                            :model-value="
                              scenarioSelected(selection.screenId, scenario.id)
                            "
                            :label="scenario.label"
                            @update:model-value="
                              capture.toggleScenarioId(
                                selection.screenId,
                                scenario.id,
                                $event,
                              );
                              refreshAfterEdit();
                            "
                          />
                        </div>
                      </div>
                    </article>
                  </section>
                  <label class="field">
                    <span>实现意图（可选）</span>
                    <WorkbenchTextField
                      :model-value="capture.handoffIntent"
                      aria-label="实现意图"
                      placeholder="例如：在 Flutter 示例工程还原任务列表"
                      @update:model-value="capture.handoffIntent = $event"
                    />
                  </label>

                  <section v-if="blocks.length" class="risk-block is-blocking">
                    <strong>必须修复</strong>
                    <div
                      v-for="diagnostic in blocks"
                      :key="diagnostic.diagnosticId"
                      class="risk-row"
                    >
                      <AlertTriangle :size="16" />
                      <span>{{ diagnostic.message }}</span>
                    </div>
                  </section>

                  <section v-if="warnings.length" class="risk-block">
                    <strong>需要确认的事项</strong>
                    <div
                      v-for="warning in warnings"
                      :key="warning.warningId"
                      class="risk-row"
                    >
                      <AlertTriangle :size="16" />
                      <span>{{ warning.message }}</span>
                      <WorkbenchCheckbox
                        :model-value="
                          capture.acceptedWarningIds.includes(warning.warningId)
                        "
                        label="我已了解并继续"
                        @update:model-value="
                          capture.toggleWarning(warning.warningId, $event)
                        "
                      />
                    </div>
                  </section>
                </template>
              </section>
            </div>
          </div>

          <div class="flow-page">
            <div class="flow-scroll" data-no-swipe>
              <!-- Step 1: running -->
              <section class="step-panel loading">
                <LoaderCircle :size="36" class="spin" />
                <strong>{{ statusLabel }}</strong>
                <p>
                  {{ completedCases }} / {{ totalCases }} 个采集项
                  <template v-if="currentCaseLabel">
                    · 当前 {{ currentCaseLabel }}
                  </template>
                </p>
                <v-progress-linear
                  class="case-progress"
                  :model-value="caseProgress"
                  color="primary"
                  height="8"
                  rounded
                />
                <p class="hint">
                  可点蒙层或关闭收起面板；后台任务会继续，顶栏铃铛可再打开。
                </p>
              </section>
            </div>
          </div>

          <div class="flow-page">
            <div class="flow-scroll" data-no-swipe>
              <!-- Step 2: result + risks -->
              <section class="step-panel">
                <div class="result-banner">
                  <Check :size="20" />
                  <div>
                    <strong>{{ successfulCount }} 个视图已就绪</strong>
                    <small>
                      Snapshot
                      {{ capture.details?.activeSnapshot.snapshotId ?? "—" }}
                    </small>
                  </div>
                </div>

                <section v-if="risks.length" class="risk-block">
                  <strong
                    >提醒（不会修改 Evidence，会写入 Agent 提示词）</strong
                  >
                  <div
                    v-for="risk in risks"
                    :key="risk.kind"
                    class="risk-row"
                    data-testid="deliver-risk-row"
                  >
                    <AlertTriangle :size="16" />
                    <span>
                      <b>{{ riskKindLabel(risk.kind) }}</b>
                      <small>{{ risk.message }}</small>
                    </span>
                  </div>
                </section>
                <p v-else class="ok-line">
                  当前没有必须确认的风险，可以直接生成交接。
                </p>
              </section>
            </div>
          </div>

          <div class="flow-page">
            <div class="flow-scroll" data-no-swipe>
              <!-- Step 3: prompt -->
              <section class="step-panel">
                <div v-if="capture.handoff" class="result-banner">
                  <Check :size="20" />
                  <div>
                    <strong>交接已创建</strong>
                    <small data-testid="handoff-id">{{
                      capture.handoff.handoffId
                    }}</small>
                  </div>
                </div>
                <p
                  v-if="capture.deliveryArtifact"
                  class="ok-line"
                  data-testid="delivery-path"
                >
                  已写入：{{ capture.deliveryArtifact.agentPromptPath }}
                </p>
                <article
                  v-if="capture.agentPrompt"
                  class="prompt-md"
                  data-testid="agent-prompt"
                  v-html="promptHtml"
                />
                <p class="hint">
                  请到 Cursor / Codex 粘贴本提示词，并确认已配置 ProtoBridge
                  MCP。
                  <small>一键拉起 Agent 暂不支持。</small>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>

      <footer class="flow-actions">
        <WorkbenchButton
          v-if="[2, 3].includes(capture.deliverStep)"
          tone="neutral"
          @click="openDetails"
        >
          查看采集结果
        </WorkbenchButton>
        <div class="spacer" />
        <WorkbenchButton
          v-if="capture.deliverStep === 0"
          tone="primary"
          :loading="capture.busy"
          :disabled="
            !capture.draft || !capture.preflight || !capture.warningsAccepted
          "
          data-testid="composer-start-capture"
          @click="startDeliver"
        >
          开始交付
        </WorkbenchButton>
        <WorkbenchButton
          v-else-if="capture.deliverStep === 2"
          tone="primary"
          :loading="capture.busy"
          :disabled="!capture.handoffPreview || !capture.risksAccepted"
          data-testid="handoff-create"
          @click="finishHandoff"
        >
          生成交接与提示词
        </WorkbenchButton>
        <template v-else-if="capture.deliverStep === 3">
          <WorkbenchButton
            tone="primary"
            data-testid="deliver-copy-prompt"
            @click="copyPrompt"
          >
            <ClipboardCopy :size="16" />
            {{ copied ? "已复制" : "复制提示词" }}
          </WorkbenchButton>
          <WorkbenchButton tone="neutral" @click="capture.closeComposer">
            完成
          </WorkbenchButton>
        </template>
      </footer>
    </section>
  </v-bottom-sheet>
</template>

<style scoped>
.deliver-flow {
  display: flex;
  width: 100%;
  height: min(88vh, 820px);
  max-height: min(88vh, 820px);
  margin-inline: 0;
  overflow: hidden;
  flex-direction: column;
  border-radius: 20px 20px 0 0;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 -24px 70px rgba(15, 23, 42, 0.18);
}
.flow-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
  padding: 22px 28px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.header-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.flow-header h2 {
  margin: 2px 0 0;
  font-size: 1.05rem;
  font-weight: 800;
}
.flow-header p {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.78rem;
}
.step-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 10px 0 0;
}
.step-dots span {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.18);
}
.step-dots span.active {
  width: 16px;
  background: rgb(var(--v-theme-primary));
}
.flow-scroll {
  height: 100%;
  overflow: auto;
  padding: 16px 28px 8px;
}
.flow-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  cursor: grab;
  touch-action: pan-y;
}
.flow-body.is-dragging {
  cursor: grabbing;
}
.flow-track {
  display: flex;
  height: 100%;
  width: 100%;
  transition: transform 220ms ease;
}
.flow-page {
  flex: 0 0 100%;
  min-width: 100%;
  height: 100%;
  min-height: 0;
}
.step-panel {
  display: grid;
  gap: 14px;
}
.step-panel.loading {
  place-items: center;
  padding: 48px 12px;
  text-align: center;
}
.case-progress {
  width: min(360px, 100%);
  margin: 8px auto 0;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: 10px;
}
.summary-grid article,
.result-banner,
.risk-block {
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.summary-grid span,
.field > span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.summary-grid strong {
  display: block;
  margin-top: 4px;
  font-size: 0.92rem;
}
.risk-block.is-blocking {
  border-color: rgb(var(--v-theme-error));
}
.field {
  display: grid;
  gap: 8px;
}
.scope-editor {
  display: grid;
  gap: 10px;
  padding-block: 4px;
}
.scope-tools {
  display: flex;
  justify-content: flex-end;
}
.scope-editor > strong {
  font-size: 0.82rem;
}
.screen-editor {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.screen-editor header {
  display: grid;
  gap: 2px;
}
.screen-editor header small {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.68rem;
}
.choice-group {
  display: grid;
  gap: 4px;
}
.choice-group > span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 700;
}
.choice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 2px 10px;
}
.field small,
.hint small,
.risk-row small,
.result-banner small {
  display: block;
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.72rem;
}
.risk-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 9%, transparent);
}
.risk-row b,
.risk-row small {
  display: block;
}
.result-banner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}
.ok-line,
.hint,
.empty p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.8rem;
}
.prompt-md {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.82rem;
  line-height: 1.55;
  overflow: auto;
  max-height: 42vh;
}
.prompt-md :deep(h1),
.prompt-md :deep(h2),
.prompt-md :deep(h3) {
  margin: 0.6em 0 0.35em;
  font-size: 0.95rem;
}
.prompt-md :deep(ul) {
  margin: 0.4em 0;
  padding-left: 1.2em;
}
.prompt-md :deep(code) {
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  font-size: 0.78rem;
}
.flow-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px 22px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.spacer {
  flex: 1;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 600px) {
  .deliver-flow {
    width: 100%;
    height: min(92vh, 820px);
    max-height: min(92vh, 820px);
    border-radius: 16px 16px 0 0;
  }
  .flow-header {
    gap: 10px;
    padding: 14px 14px 10px;
  }
  .header-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
  .flow-scroll {
    padding: 12px 14px 8px;
  }
  .summary-grid {
    gap: 6px;
  }
  .summary-grid article {
    padding: 10px;
  }
  .choice-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .flow-actions {
    padding: 12px 14px 14px;
  }
}
</style>

<style>
.deliver-flow-overlay {
  width: 100% !important;
  max-width: 100% !important;
  margin-inline: 0 !important;
}
</style>
