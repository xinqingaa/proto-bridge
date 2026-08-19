<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCopy,
  FileCheck2,
  LoaderCircle,
  ScanLine,
  X,
} from "lucide-vue-next";
import type { PrototypeRecord } from "@/design-system/types";
import { useCaptureStore } from "@/app/stores/capture";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchCheckbox from "@/workbench/ui/WorkbenchCheckbox.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";

const props = defineProps<{
  modelValue: boolean;
  prototype: PrototypeRecord;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  changed: [];
}>();

const lifecycle = usePrototypeLifecycleStore();
const capture = useCaptureStore();
const router = useRouter();
const converged = ref(false);
const submitting = ref(false);
const polling = ref(false);
const copied = ref(false);
let pollTimer: ReturnType<typeof setInterval> | undefined;

const record = computed(() => lifecycle.recordFor(props.prototype.id));
const operation = computed(() => record.value?.operation ?? { kind: "idle" as const });
const warnings = computed(() => capture.preflight?.result.warnings ?? []);
const risks = computed(() => capture.handoffPreview?.risks ?? []);
const final = computed(() => record.value?.stage === "final" && record.value.artifacts);
const step = computed(() => {
  if (final.value) return 3;
  const current = operation.value;
  if (current.kind !== "finalizing") return 0;
  if (current.phase === "capturing") return 1;
  if (current.phase === "awaiting-risks") return 2;
  if (current.phase === "building-prompt") return 3;
  return 0;
});
const steps = ["确认收敛", "预检与采集", "风险确认", "Evidence 与提示词"];
const completedCases = computed(
  () =>
    capture.activeJob?.journal.filter((entry) => entry.event === "case-finished")
      .length ?? 0,
);
const totalCases = computed(() => capture.activeJob?.selection.cases.length ?? 0);
const progress = computed(() =>
  totalCases.value ? (completedCases.value / totalCases.value) * 100 : 0,
);
const successfulCases = computed(() => {
  const counts = capture.details?.activeSnapshot.coverage.counts;
  return counts ? counts.captured + counts.reused : 0;
});
const statusText = computed(() => {
  const current = operation.value;
  if (current.kind === "failed") return current.message;
  if (final.value) return "定稿已写入 Core Store，Evidence 与提示词已经固定。";
  if (current.kind !== "finalizing") return "正在准备定稿检查。";
  if (current.phase === "preflighting") return "正在检查整个原型的正式范围。";
  if (current.phase === "awaiting-confirmation") return "预检完成，等待确认候选方案已经收敛。";
  if (current.phase === "capturing") return `正在采集整个原型 · ${completedCases.value}/${totalCases.value}`;
  if (current.phase === "awaiting-risks") return "Evidence 已完成，等待逐项确认风险。";
  return "正在创建 Handoff、Delivery 和唯一 Agent 提示词。";
});

async function initialize() {
  converged.value = false;
  copied.value = false;
  const current = operation.value;
  const artifacts = record.value?.artifacts;
  if (record.value?.stage === "final" && artifacts) {
    if (
      capture.deliveryArtifact?.deliveryId !== artifacts.deliveryId ||
      !capture.agentPrompt
    ) {
      await capture.loadDelivery(artifacts.deliveryId);
    }
    return;
  }
  if (current.kind === "failed") await lifecycle.clearFailure(props.prototype.id);
  if (current.kind === "finalizing") {
    await lifecycle.recoverFinalization(props.prototype);
  } else if (record.value?.stage === "review") {
    await lifecycle.prepareFinalization(props.prototype);
  }
}

async function poll() {
  if (
    polling.value ||
    operation.value.kind !== "finalizing" ||
    operation.value.phase !== "capturing"
  ) return;
  polling.value = true;
  try {
    await lifecycle.pollFinalization(props.prototype);
  } finally {
    polling.value = false;
  }
}

async function advance() {
  const current = operation.value;
  if (current.kind !== "finalizing") return;
  submitting.value = true;
  try {
    if (current.phase === "awaiting-confirmation") {
      await lifecycle.startFinalization(props.prototype);
    } else if (current.phase === "awaiting-risks") {
      await lifecycle.completeFinalization(props.prototype);
    }
  } finally {
    submitting.value = false;
  }
}

async function copyPrompt() {
  if (!capture.agentPrompt) return;
  await navigator.clipboard.writeText(capture.agentPrompt);
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1400);
}

function openEvidence() {
  const artifacts = record.value?.artifacts;
  if (!artifacts) return;
  void router.push(
    `/workbench/evidence/${artifacts.bundleId}/${artifacts.snapshotId}`,
  );
  emit("update:modelValue", false);
}

watch(
  () => props.modelValue,
  (open) => {
    if (pollTimer) clearInterval(pollTimer);
    if (!open) return;
    void initialize();
    pollTimer = setInterval(() => void poll(), 1000);
  },
  { immediate: true },
);
watch(
  () => record.value?.stage,
  (stage) => {
    if (stage === "final") emit("changed");
  },
);
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <v-bottom-sheet
    :model-value="modelValue"
    content-class="lifecycle-flow-overlay"
    :persistent="operation.kind === 'finalizing' && operation.phase === 'building-prompt'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="lifecycle-flow" data-testid="lifecycle-finalization-sheet">
      <header class="flow-header">
        <span class="flow-mark"><ScanLine :size="20" /></span>
        <div>
          <p>Prototype finalization</p>
          <h2>定稿并采集 · {{ prototype.label }}</h2>
          <span>{{ statusText }}</span>
        </div>
        <WorkbenchIconButton
          label="收起定稿流程"
          tone="neutral"
          @click="emit('update:modelValue', false)"
        >
          <X :size="18" />
        </WorkbenchIconButton>
      </header>

      <ol class="flow-steps" aria-label="定稿进度">
        <li
          v-for="(label, index) in steps"
          :key="label"
          :class="{ current: step === index, complete: step > index || final }"
        >
          <span><Check v-if="step > index || final" :size="13" />{{ index + 1 }}</span>
          <strong>{{ label }}</strong>
        </li>
      </ol>

      <div class="flow-body">
        <section v-if="operation.kind === 'failed'" class="flow-failure" role="alert">
          <AlertTriangle :size="22" />
          <div><strong>定稿未完成</strong><p>{{ operation.message }}</p></div>
          <WorkbenchButton tone="neutral" @click="initialize">重新检查</WorkbenchButton>
        </section>

        <section
          v-else-if="operation.kind === 'finalizing' && operation.phase === 'awaiting-confirmation'"
          class="flow-section"
        >
          <div class="section-lead">
            <strong>确认正式入口已经收敛</strong>
            <p>本次会采集所有正式页面、状态和场景，成功后固定 Evidence、Handoff 与唯一提示词。</p>
          </div>
          <WorkbenchCheckbox
            v-model="converged"
            label="候选方案已经收敛，正式入口和 Registry 只保留唯一方案"
          />
          <div v-if="warnings.length" class="check-list">
            <article v-for="warning in warnings" :key="warning.warningId">
              <AlertTriangle :size="16" />
              <span>{{ warning.message }}</span>
              <WorkbenchCheckbox
                :model-value="capture.acceptedWarningIds.includes(warning.warningId)"
                label="已了解"
                @update:model-value="capture.toggleWarning(warning.warningId, $event)"
              />
            </article>
          </div>
        </section>

        <section
          v-else-if="operation.kind === 'finalizing' && operation.phase === 'capturing'"
          class="capture-progress"
          aria-live="polite"
        >
          <LoaderCircle :size="34" class="spin" />
          <strong>{{ completedCases }} / {{ totalCases }} 个采集项</strong>
          <v-progress-linear :model-value="progress" color="primary" height="8" rounded />
          <p>可以收起面板，采集任务会继续运行。</p>
        </section>

        <section
          v-else-if="operation.kind === 'finalizing' && operation.phase === 'awaiting-risks'"
          class="flow-section"
        >
          <div class="section-lead">
            <strong>{{ successfulCases }} 个 Case 已形成 Evidence</strong>
            <p>确认不会改变 Evidence；所有风险会原样写入 Agent 提示词。</p>
          </div>
          <div v-if="risks.length" class="check-list">
            <article v-for="risk in risks" :key="risk.kind">
              <AlertTriangle :size="16" />
              <span>{{ risk.message }}</span>
              <WorkbenchCheckbox
                :model-value="capture.acknowledgedRiskKinds.includes(risk.kind)"
                label="已了解"
                @update:model-value="capture.toggleRisk(risk.kind, $event)"
              />
            </article>
          </div>
          <p v-else class="quiet-result">当前没有必须确认的风险。</p>
        </section>

        <section
          v-else-if="operation.kind === 'finalizing' && operation.phase === 'building-prompt'"
          class="capture-progress"
          aria-live="polite"
        >
          <LoaderCircle :size="34" class="spin" />
          <strong>正在固定交付产物</strong>
          <p>正在写入 Handoff、Delivery、Agent 提示词和生命周期状态。</p>
        </section>

        <section v-else-if="final" class="prompt-result">
          <div class="result-heading">
            <span><FileCheck2 :size="20" /></span>
            <div>
              <strong>定稿完成</strong>
              <p>Bundle 已归档为只读，提示词与当前 Snapshot 固定绑定。</p>
            </div>
          </div>
          <div class="prompt-toolbar">
            <div>
              <strong>Agent 提示词</strong>
              <code>{{ record?.artifacts?.deliveryId }}</code>
            </div>
            <WorkbenchButton tone="neutral" @click="copyPrompt">
              <ClipboardCopy :size="15" />{{ copied ? "已复制" : "复制提示词" }}
            </WorkbenchButton>
          </div>
          <pre data-testid="final-agent-prompt">{{ capture.agentPrompt }}</pre>
        </section>
      </div>

      <footer class="flow-actions">
        <span v-if="operation.kind === 'finalizing' && operation.phase === 'capturing'">
          后台任务会继续
        </span>
        <span v-else />
        <WorkbenchButton
          v-if="operation.kind === 'finalizing' && operation.phase === 'awaiting-confirmation'"
          tone="primary"
          :loading="submitting"
          :disabled="!converged || !capture.warningsAccepted"
          @click="advance"
        >
          <ScanLine :size="15" />开始完整采集
        </WorkbenchButton>
        <WorkbenchButton
          v-else-if="operation.kind === 'finalizing' && operation.phase === 'awaiting-risks'"
          tone="primary"
          :loading="submitting"
          :disabled="!capture.risksAccepted"
          @click="advance"
        >
          <CheckCircle2 :size="15" />确认并生成提示词
        </WorkbenchButton>
        <template v-else-if="final">
          <WorkbenchButton tone="neutral" @click="openEvidence">查看 Evidence</WorkbenchButton>
          <WorkbenchButton tone="primary" @click="emit('update:modelValue', false)">完成</WorkbenchButton>
        </template>
      </footer>
    </section>
  </v-bottom-sheet>
</template>

<style scoped>
.lifecycle-flow {
  display: flex;
  width: 100%;
  height: min(88vh, 820px);
  max-height: min(88vh, 820px);
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px 8px 0 0;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 -20px 60px rgba(20, 26, 34, 0.2);
}
.flow-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 26px 14px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.flow-mark {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.flow-header > div {
  min-width: 0;
  flex: 1;
}
.flow-header p,
.flow-header h2,
.flow-header span,
.section-lead p,
.capture-progress p,
.flow-failure p,
.result-heading p {
  margin: 0;
}
.flow-header p {
  color: rgb(var(--v-theme-primary));
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
}
.flow-header h2 {
  margin-top: 3px;
  font-size: 1.05rem;
}
.flow-header div > span {
  display: block;
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.75rem;
}
.flow-steps {
  display: flex;
  margin: 0;
  padding: 12px 26px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  list-style: none;
}
.flow-steps li {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
  color: rgba(var(--v-theme-on-surface), 0.42);
}
.flow-steps li:not(:last-child)::after {
  height: 1px;
  flex: 1;
  margin-inline: 8px;
  background: rgba(var(--v-theme-on-surface), 0.13);
  content: "";
}
.flow-steps li > span {
  display: inline-flex;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 0.65rem;
}
.flow-steps strong {
  white-space: nowrap;
  font-size: 0.72rem;
}
.flow-steps .current,
.flow-steps .complete {
  color: rgb(var(--v-theme-primary));
}
.flow-steps .complete > span {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.flow-body {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 22px 26px;
}
.flow-section,
.prompt-result {
  display: flex;
  max-width: 900px;
  margin: 0 auto;
  flex-direction: column;
  gap: 16px;
}
.section-lead strong {
  font-size: 1rem;
}
.section-lead p,
.capture-progress p,
.result-heading p {
  margin-top: 5px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.76rem;
  line-height: 1.55;
}
.check-list {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
.check-list article {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.check-list article:last-child {
  border-bottom: 0;
}
.check-list article > svg {
  color: rgb(var(--v-theme-warning));
}
.check-list article > span {
  min-width: 0;
  flex: 1;
  font-size: 0.74rem;
}
.capture-progress {
  display: flex;
  max-width: 560px;
  min-height: 280px;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  text-align: center;
}
.capture-progress .v-progress-linear {
  width: 100%;
}
.flow-failure {
  display: flex;
  max-width: 760px;
  margin: 0 auto;
  align-items: center;
  gap: 13px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-error)) 35%, transparent);
  border-radius: 8px;
  color: rgb(var(--v-theme-error));
}
.flow-failure > div {
  min-width: 0;
  flex: 1;
}
.flow-failure p {
  margin-top: 3px;
  font-size: 0.74rem;
}
.result-heading,
.prompt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.result-heading > span {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 12%, transparent);
  color: rgb(var(--v-theme-success));
}
.result-heading > div {
  min-width: 0;
  flex: 1;
}
.prompt-toolbar {
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.prompt-toolbar > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.prompt-toolbar code {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.67rem;
}
.prompt-result pre {
  min-height: 260px;
  max-height: 42vh;
  margin: 0;
  overflow: auto;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  font: 0.75rem/1.65 ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.quiet-result {
  color: rgb(var(--v-theme-success));
  font-size: 0.78rem;
}
.flow-actions {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 26px 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.flow-actions > span {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.7rem;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@media (max-width: 720px) {
  .lifecycle-flow { height: 92vh; max-height: 92vh; }
  .flow-header, .flow-body, .flow-actions { padding-inline: 14px; }
  .flow-steps { overflow-x: auto; padding-inline: 14px; }
  .flow-steps li { min-width: 120px; }
  .check-list article { align-items: flex-start; flex-wrap: wrap; }
  .check-list article > span { flex-basis: calc(100% - 30px); }
}
@media (prefers-reduced-motion: reduce) {
  .spin { animation: none; }
}
</style>

<style>
.lifecycle-flow-overlay {
  width: 100% !important;
  max-width: 100% !important;
  margin-inline: 0 !important;
}
</style>
