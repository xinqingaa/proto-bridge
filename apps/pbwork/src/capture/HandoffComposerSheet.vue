<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Handshake,
  X,
} from "lucide-vue-next";
import type { RiskKind } from "@proto-bridge/core/v2";
import { useCaptureStore } from "@/app/stores/capture";
import { riskKindLabel } from "@/capture/presentation";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchCheckbox from "@/workbench/ui/WorkbenchCheckbox.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";
import WorkbenchTextField from "@/workbench/ui/WorkbenchTextField.vue";

const capture = useCaptureStore();
const copied = ref(false);
let intentTimer: ReturnType<typeof setTimeout> | undefined;

const risks = computed(() => capture.handoffPreview?.risks ?? []);
const created = computed(() => capture.handoff);
const coverageLabel = computed(() => {
  const status = created.value?.coverageStatus ?? capture.handoffPreview?.coverageStatus;
  if (status === "complete") return "完整";
  if (status === "partial") return "部分";
  return "检查中";
});
const freshnessLabel = computed(() => {
  const status =
    created.value?.freshnessStatus ?? capture.handoffPreview?.freshnessStatus;
  if (status === "fresh") return "新鲜";
  if (status === "stale") return "已过期";
  return "检查中";
});

watch(
  () => capture.handoffIntent,
  () => {
    if (!capture.handoffSheetOpen || created.value) return;
    if (intentTimer) clearTimeout(intentTimer);
    intentTimer = setTimeout(() => {
      void capture.previewCurrentHandoff();
    }, 320);
  },
);

onBeforeUnmount(() => {
  if (intentTimer) clearTimeout(intentTimer);
});

async function copyHandoffId() {
  if (!created.value) return;
  try {
    await navigator.clipboard.writeText(created.value.handoffId);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    capture.setError(new Error("无法复制交接 ID，请手动选择文本。"));
  }
}

function toggleRisk(kind: string, accepted: boolean) {
  capture.toggleRisk(kind as RiskKind, accepted);
}
</script>

<template>
  <v-bottom-sheet
    v-model="capture.handoffSheetOpen"
    :retain-focus="false"
    content-class="handoff-composer-overlay"
    data-testid="handoff-composer"
  >
    <section class="handoff-composer" aria-label="创建 Agent 交接">
      <header class="composer-header">
        <div class="header-mark"><Handshake :size="22" /></div>
        <div>
          <h2>{{ created ? "交接已创建" : "创建 Agent 交接" }}</h2>
          <p>固定本次 Snapshot，供 Cursor / Codex 只读消费</p>
        </div>
        <WorkbenchIconButton
          label="关闭交接确认"
          size="large"
          @click="capture.closeHandoffSheet"
        >
          <X :size="20" />
        </WorkbenchIconButton>
      </header>

      <div class="composer-scroll">
        <v-alert
          v-if="capture.lastError"
          type="error"
          variant="tonal"
          density="comfortable"
          closable
          @click:close="capture.clearError"
        >
          {{ capture.lastError }}
        </v-alert>

        <template v-if="created">
          <section class="success-panel">
            <div class="success-mark"><Check :size="22" /></div>
            <div>
              <span>Handoff ID</span>
              <strong data-testid="handoff-id">{{ created.handoffId }}</strong>
              <small
                >覆盖 {{ coverageLabel }} · 新鲜度 {{ freshnessLabel }} · 风险
                {{ created.risks.length }} 项</small
              >
            </div>
            <WorkbenchButton
              tone="primary"
              data-testid="handoff-copy-id"
              @click="copyHandoffId"
            >
              <ClipboardCopy :size="16" />
              {{ copied ? "已复制" : "复制 ID" }}
            </WorkbenchButton>
          </section>
          <p class="next-step">
            Agent 通过 MCP 读取此固定交接；不要改用 active / latest Snapshot。
          </p>
          <pre class="cli-hint">pnpm pb -- handoff show --handoff {{ created.handoffId }} --json</pre>
        </template>

        <template v-else>
          <section class="refs-panel">
            <span>固定引用</span>
            <dl>
              <div>
                <dt>Workspace</dt>
                <dd>{{ capture.details?.bundle.workspaceId ?? "—" }}</dd>
              </div>
              <div>
                <dt>Bundle</dt>
                <dd>{{ capture.details?.bundle.bundleId ?? "—" }}</dd>
              </div>
              <div>
                <dt>Snapshot</dt>
                <dd>
                  {{ capture.details?.activeSnapshot.snapshotId ?? "—" }}
                </dd>
              </div>
              <div>
                <dt>覆盖</dt>
                <dd>{{ coverageLabel }}</dd>
              </div>
              <div>
                <dt>新鲜度</dt>
                <dd>{{ freshnessLabel }}</dd>
              </div>
            </dl>
          </section>

          <label class="intent-field">
            <span>实现意图（可选）</span>
            <WorkbenchTextField
              :model-value="capture.handoffIntent"
              aria-label="实现意图"
              placeholder="例如：在 Flutter 示例工程还原任务列表与领奖任务"
              @update:model-value="capture.handoffIntent = $event"
            />
          </label>

          <section class="risk-panel">
            <div class="risk-heading">
              <div>
                <span>必须确认的风险</span>
                <h3>
                  {{
                    risks.length
                      ? `${risks.length} 项需要逐项确认`
                      : "当前没有必须确认的风险"
                  }}
                </h3>
              </div>
              <strong :class="{ warning: risks.length }">
                {{ risks.length ? "确认后不会修改 Evidence" : "可以直接创建" }}
              </strong>
            </div>
            <div
              v-for="risk in risks"
              :key="risk.kind"
              class="risk-row"
              data-testid="handoff-risk-row"
            >
              <AlertTriangle :size="17" />
              <span>
                <strong>{{ riskKindLabel(risk.kind) }}</strong>
                <small>{{ risk.message }}</small>
              </span>
              <WorkbenchCheckbox
                :model-value="
                  capture.acknowledgedRiskKinds.includes(risk.kind)
                "
                label="我已了解并继续"
                @update:model-value="toggleRisk(risk.kind, $event)"
              />
            </div>
          </section>
        </template>
      </div>

      <footer class="composer-actions">
        <div>
          <strong v-if="created">交接已写入 Store，可供 MCP 固定读取</strong>
          <span v-else-if="capture.busy">正在检查交接风险…</span>
          <span v-else>确认不会修改 Evidence，只会记入交接</span>
        </div>
        <WorkbenchButton
          v-if="created"
          tone="primary"
          data-testid="handoff-done"
          @click="capture.closeHandoffSheet"
        >
          完成
        </WorkbenchButton>
        <WorkbenchButton
          v-else
          tone="primary"
          :loading="capture.busy"
          :disabled="!capture.handoffPreview || !capture.risksAccepted"
          data-testid="handoff-create"
          @click="capture.createCurrentHandoff()"
        >
          <Handshake :size="16" /> 创建交接
        </WorkbenchButton>
      </footer>
    </section>
  </v-bottom-sheet>
</template>

<style scoped>
.handoff-composer {
  display: flex;
  width: min(920px, calc(100vw - 32px));
  max-height: min(88vh, 820px);
  margin-inline: auto;
  overflow: hidden;
  flex-direction: column;
  border-radius: 24px 24px 0 0;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 -24px 70px rgba(15, 23, 42, 0.18);
}
.composer-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 14px;
  padding: 22px 28px 18px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-surface)) 94%,
    rgb(var(--v-theme-primary))
  );
}
.header-mark,
.success-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.success-mark {
  background: rgb(var(--v-theme-success));
  color: rgb(var(--v-theme-on-success));
}
.composer-header h2,
.risk-heading h3 {
  margin: 2px 0 0;
  font-size: 1.05rem;
  font-weight: 800;
}
.composer-header p,
.composer-header span,
.risk-heading span,
.refs-panel > span,
.intent-field > span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.composer-header p {
  margin: 4px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}
.composer-scroll {
  display: grid;
  gap: 16px;
  overflow: auto;
  padding: 18px 28px 12px;
}
.refs-panel,
.success-panel,
.risk-panel {
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.refs-panel dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 16px;
  margin: 10px 0 0;
}
.refs-panel dt {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.68rem;
}
.refs-panel dd {
  margin: 2px 0 0;
  overflow: hidden;
  font-size: 0.78rem;
  font-weight: 700;
  text-overflow: ellipsis;
}
.intent-field {
  display: grid;
  gap: 8px;
}
.risk-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}
.risk-heading > strong {
  padding: 5px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 14%, transparent);
  color: rgb(var(--v-theme-success));
  font-size: 0.68rem;
  white-space: nowrap;
}
.risk-heading > strong.warning {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 14%, transparent);
  color: rgb(var(--v-theme-warning));
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
.risk-row strong,
.risk-row small {
  display: block;
}
.risk-row small {
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.72rem;
}
.success-panel {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
}
.success-panel span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.success-panel strong {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
  font-size: 0.92rem;
}
.success-panel small {
  display: block;
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.72rem;
}
.next-step {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.8rem;
}
.cli-hint {
  overflow: auto;
  margin: 0;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.72rem;
  white-space: pre-wrap;
}
.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 28px 22px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.composer-actions div {
  min-width: 0;
}
.composer-actions strong,
.composer-actions span {
  display: block;
  font-size: 0.78rem;
}
.composer-actions span {
  color: rgba(var(--v-theme-on-surface), 0.55);
}
</style>
