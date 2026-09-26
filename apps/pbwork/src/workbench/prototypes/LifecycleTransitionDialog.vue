<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  ScanLine,
} from "lucide-vue-next";
import type { PrototypeRecord } from "@/design-system/types";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import { useCaptureStore } from "@/app/stores/capture";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchCheckbox from "@/workbench/ui/WorkbenchCheckbox.vue";

export type LifecycleIntent =
  | "advance"
  | "return-active"
  | "finalize"
  | "rollback"
  | "archive";

const props = defineProps<{
  modelValue: boolean;
  prototype: PrototypeRecord;
  intent: LifecycleIntent;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  changed: [];
}>();

const lifecycle = usePrototypeLifecycleStore();
const capture = useCaptureStore();
const note = ref("");
const converged = ref(false);
const consequenceAccepted = ref(false);
const submitting = ref(false);
const polling = ref(false);
let pollTimer: ReturnType<typeof setInterval> | undefined;

const record = computed(() => lifecycle.recordFor(props.prototype.id));
const current = computed(() => record.value?.stage ?? "active");
const operation = computed(() => record.value?.operation ?? { kind: "idle" as const });
const warnings = computed(() => capture.preflight?.result.warnings ?? []);
const risks = computed(() => capture.handoffPreview?.risks ?? []);
const target = computed(() => {
  if (props.intent === "advance") return "review";
  if (props.intent === "return-active") return "active";
  if (props.intent === "finalize") return "final";
  if (props.intent === "rollback") return "review";
  return "archived";
});
const title = computed(() => {
  if (props.intent === "advance") return "送交待确定";
  if (props.intent === "return-active") return "退回进行中";
  if (props.intent === "finalize") return "定稿并自动采集";
  if (props.intent === "rollback") return "回退到待确定";
  return "归档原型";
});
const progressLabel = computed(() => {
  const op = operation.value;
  if (op.kind === "failed") return op.message;
  if (op.kind !== "finalizing") return "";
  if (op.phase === "preflighting") return "正在检查整个原型…";
  if (op.phase === "awaiting-confirmation") return "预检完成，等待定稿确认";
  if (op.phase === "capturing") {
    const job = capture.activeJob;
    const completed =
      job?.journal.filter((entry) => entry.event === "case-finished").length ?? 0;
    const total = job?.selection.cases.length ?? 0;
    return total ? `正在采集整个原型 · ${completed}/${total}` : "正在创建整原型 Evidence…";
  }
  if (op.phase === "awaiting-risks") return "Evidence 已完成，等待风险确认";
  return "正在生成唯一 Agent 提示词…";
});
const canConfirmFinalization = computed(
  () => converged.value && capture.warningsAccepted,
);
const canConfirmRisks = computed(() => capture.risksAccepted);

function close() {
  emit("update:modelValue", false);
}

async function initialize() {
  note.value = "";
  converged.value = false;
  consequenceAccepted.value = false;
  if (props.intent !== "finalize") return;
  const op = operation.value;
  if (op.kind === "failed") await lifecycle.clearFailure(props.prototype.id);
  if (op.kind === "finalizing") {
    await lifecycle.recoverFinalization(props.prototype);
  } else {
    await lifecycle.prepareFinalization(props.prototype);
  }
}

async function poll() {
  if (
    polling.value ||
    (operation.value.kind !== "finalizing" && operation.value.kind !== "rolling-back")
  ) {
    return;
  }
  polling.value = true;
  try {
    await lifecycle.pollFinalization(props.prototype);
  } finally {
    polling.value = false;
  }
}

async function submitSimple() {
  submitting.value = true;
  try {
    if (props.intent === "advance") {
      await lifecycle.transition(props.prototype, "review", note.value);
    } else if (props.intent === "return-active") {
      await lifecycle.transition(props.prototype, "active", note.value);
    } else if (props.intent === "archive") {
      await lifecycle.transition(props.prototype, "archived", note.value);
    } else if (props.intent === "rollback") {
      const completed = await lifecycle.rollbackToReview(
        props.prototype,
        note.value,
      );
      if (!completed) return;
    }
    emit("changed");
    close();
  } finally {
    submitting.value = false;
  }
}

async function submitFinalization() {
  const op = operation.value;
  if (op.kind !== "finalizing") return;
  submitting.value = true;
  try {
    if (op.phase === "awaiting-confirmation") {
      await lifecycle.startFinalization(props.prototype);
      return;
    }
    if (op.phase === "awaiting-risks") {
      const completed = await lifecycle.completeFinalization(props.prototype);
      if (completed) {
        emit("changed");
        close();
      }
    }
  } finally {
    submitting.value = false;
  }
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

watch(current, (stage) => {
  if (props.modelValue && props.intent === "finalize" && stage === "final") {
    emit("changed");
    close();
  }
});

watch([current, () => operation.value.kind], ([stage, kind]) => {
  if (
    props.modelValue &&
    props.intent === "rollback" &&
    stage === "review" &&
    kind === "idle"
  ) {
    emit("changed");
    close();
  }
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    :persistent="operation.kind === 'finalizing' && operation.phase === 'building-prompt'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <section class="lifecycle-dialog" role="document">
      <header>
        <p>原型生命周期</p>
        <h2>{{ title }}</h2>
        <span>{{ prototype.label }}</span>
      </header>

      <div class="transition-route">
        <strong>{{ LIFECYCLE_LABELS[current] }}</strong>
        <ArrowRight :size="17" />
        <strong>{{ LIFECYCLE_LABELS[target] }}</strong>
      </div>

      <template v-if="intent === 'finalize'">
        <div
          v-if="operation.kind === 'finalizing' || operation.kind === 'failed'"
          class="operation-status"
          :class="{ failed: operation.kind === 'failed' }"
          aria-live="polite"
        >
          <AlertTriangle v-if="operation.kind === 'failed'" :size="17" />
          <LoaderCircle
            v-else-if="operation.phase !== 'awaiting-confirmation' && operation.phase !== 'awaiting-risks'"
            :size="17"
            class="spin"
          />
          <CheckCircle2 v-else :size="17" />
          <span>{{ progressLabel }}</span>
        </div>

        <template
          v-if="operation.kind === 'finalizing' && operation.phase === 'awaiting-confirmation'"
        >
          <section class="consequence-block">
            <strong>本次定稿会自动完成</strong>
            <ul>
              <li>采集所有正式页面、状态和场景；</li>
              <li>创建固定 Evidence、Handoff 和唯一提示词；</li>
              <li>成功后原型进入只读的“已定稿”。</li>
            </ul>
          </section>
          <WorkbenchCheckbox
            v-model="converged"
            label="我确认候选方案已经收敛，正式入口和 Registry 中只保留唯一方案"
          />
          <section v-if="warnings.length" class="warning-block">
            <strong>预检提醒</strong>
            <div v-for="warning in warnings" :key="warning.warningId" class="check-row">
              <span>{{ warning.message }}</span>
              <WorkbenchCheckbox
                :model-value="capture.acceptedWarningIds.includes(warning.warningId)"
                label="我已了解"
                @update:model-value="capture.toggleWarning(warning.warningId, $event)"
              />
            </div>
          </section>
        </template>

        <section
          v-if="operation.kind === 'finalizing' && operation.phase === 'awaiting-risks'"
          class="warning-block"
        >
          <strong>这些风险会原样写入提示词</strong>
          <div v-for="risk in risks" :key="risk.kind" class="check-row">
            <span>{{ risk.message }}</span>
            <WorkbenchCheckbox
              :model-value="capture.acknowledgedRiskKinds.includes(risk.kind)"
              label="我已了解"
              @update:model-value="capture.toggleRisk(risk.kind, $event)"
            />
          </div>
        </section>

        <div v-if="operation.kind === 'failed'" class="failure-actions">
          <p>原型仍停留在“待确定”，没有强制定稿，也没有隐藏失败原因。</p>
          <WorkbenchButton tone="neutral" @click="initialize">
            <RotateCcw :size="14" />重新执行定稿检查
          </WorkbenchButton>
        </div>
      </template>

      <template v-else>
        <div
          v-if="intent === 'rollback' && operation.kind === 'rolling-back'"
          class="operation-status"
          aria-live="polite"
        >
          <LoaderCircle :size="17" class="spin" />
          <span>Local Service 正在清理定稿 Evidence…</span>
        </div>
        <div
          v-else-if="intent === 'rollback' && operation.kind === 'failed' && operation.action === 'rollback'"
          class="operation-status failed"
          role="alert"
        >
          <AlertTriangle :size="17" />
          <span>{{ operation.message }}</span>
        </div>
        <section class="consequence-block">
          <strong v-if="intent === 'advance'">进入方案确认阶段</strong>
          <strong v-else-if="intent === 'return-active'">继续制作原型</strong>
          <strong v-else-if="intent === 'rollback'">定稿产物将失效</strong>
          <strong v-else>归档后永久只读</strong>
          <p v-if="intent === 'advance'">不会提前采集 Evidence；候选方案可在待确定阶段并存。</p>
          <p v-else-if="intent === 'return-active'">不会产生或清理正式 Evidence。</p>
          <p v-else-if="intent === 'rollback'">先把本次定稿 Bundle 移入 Store trash，再回到待确定。</p>
          <p v-else>归档后不能回退、修改、重新采集或删除。</p>
        </section>
        <WorkbenchCheckbox
          v-if="intent === 'rollback' || intent === 'archive'"
          v-model="consequenceAccepted"
          :label="
            intent === 'rollback'
              ? '我确认定稿 Evidence 和提示词将不再可用'
              : '我确认归档是不可逆的终态'
          "
        />
        <label class="transition-note">
          流转备注（可选）
          <v-textarea
            v-model="note"
            maxlength="300"
            rows="2"
            auto-grow
            hide-details
            density="compact"
            variant="outlined"
            placeholder="记录本次状态变化的原因"
          />
        </label>
      </template>

      <footer>
        <WorkbenchButton tone="ghost" @click="close">关闭</WorkbenchButton>
        <WorkbenchButton
          v-if="intent !== 'finalize'"
          :tone="intent === 'rollback' || intent === 'archive' ? 'danger' : 'primary'"
          :loading="submitting"
          :disabled="
            (intent === 'rollback' || intent === 'archive') &&
              (!consequenceAccepted || operation.kind === 'rolling-back')
          "
          @click="submitSimple"
        >
          <Archive v-if="intent === 'archive'" :size="14" />
          <RotateCcw v-else-if="intent === 'rollback'" :size="14" />
          {{
            intent === 'rollback' && operation.kind === 'failed' && operation.action === 'rollback'
              ? '重试回退'
              : `确认${title}`
          }}
        </WorkbenchButton>
        <WorkbenchButton
          v-else-if="operation.kind === 'finalizing' && operation.phase === 'awaiting-confirmation'"
          tone="primary"
          :loading="submitting"
          :disabled="!canConfirmFinalization"
          @click="submitFinalization"
        >
          <ScanLine :size="14" />确认并开始完整采集
        </WorkbenchButton>
        <WorkbenchButton
          v-else-if="operation.kind === 'finalizing' && operation.phase === 'awaiting-risks'"
          tone="primary"
          :loading="submitting"
          :disabled="!canConfirmRisks"
          @click="submitFinalization"
        >
          <CheckCircle2 :size="14" />确认风险并自动生成提示词
        </WorkbenchButton>
      </footer>
    </section>
  </v-dialog>
</template>

<style scoped>
.lifecycle-dialog {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  box-shadow: 0 24px 70px rgba(6, 10, 18, 0.34);
}
header p {
  margin: 0 0 4px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
header h2 {
  margin: 0 0 5px;
  font-size: 1.3rem;
}
header span {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.78rem;
}
.transition-route {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  font-size: 0.78rem;
}
.transition-route svg {
  color: rgb(var(--v-theme-primary));
}
.operation-status {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border-radius: 10px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
  color: rgb(var(--v-theme-primary));
  font-size: 0.78rem;
  font-weight: 700;
}
.operation-status.failed {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 10%, transparent);
  color: rgb(var(--v-theme-error));
}
.consequence-block,
.warning-block {
  display: grid;
  gap: 8px;
  padding: 13px;
  border-left: 3px solid rgb(var(--v-theme-primary));
  border-radius: 4px 10px 10px 4px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  font-size: 0.78rem;
}
.consequence-block p,
.failure-actions p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.65);
  line-height: 1.55;
}
.consequence-block ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
.warning-block {
  border-left-color: rgb(var(--v-theme-warning));
}
.check-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}
.check-row > span {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.73rem;
  line-height: 1.45;
}
.failure-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.transition-note {
  display: grid;
  gap: 7px;
  font-size: 0.72rem;
  font-weight: 700;
}
footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.spin {
  animation: spin 0.85s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 620px) {
  .lifecycle-dialog {
    padding: 18px;
  }
  .check-row,
  .failure-actions {
    grid-template-columns: 1fr;
  }
  .failure-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
