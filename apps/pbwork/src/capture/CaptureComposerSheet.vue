<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Layers3,
  MousePointer2,
  Play,
  ScanLine,
  X,
} from "lucide-vue-next";
import { useCaptureStore } from "@/app/stores/capture";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchCheckbox from "@/workbench/ui/WorkbenchCheckbox.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";
import WorkbenchSelect, {
  type WorkbenchSelectItem,
} from "@/workbench/ui/WorkbenchSelect.vue";

const capture = useCaptureStore();
const prototypes = loadPrototypes();
const screens = loadPrototypeScreens();

const prototype = computed(() =>
  prototypes.find((item) => item.id === capture.draft?.prototypeId),
);
const draftScreens = computed(() =>
  (capture.draft?.screens ?? []).map((selection) => ({
    selection,
    record: screens.find((screen) => screen.screenId === selection.screenId),
  })),
);
const matrix = computed(() => capture.preflight?.result.matrix ?? []);
const entryLabel = computed(
  () =>
    ({
      "current-screen": "当前页面",
      fragment: "所选元素",
      custom: "自定义页面范围",
      prototype: "整个原型",
    })[capture.entryKind ?? "custom"],
);
const fragmentCount = computed(() =>
  (capture.draft?.screens ?? []).reduce(
    (sum, screen) => sum + screen.captureScope.fragments.length,
    0,
  ),
);
const variantItems: WorkbenchSelectItem[] = [
  { label: "默认状态", value: "default" },
  { label: "仅关键状态", value: "critical" },
  { label: "默认 + 关键状态", value: "default-and-critical" },
  { label: "全部状态", value: "all" },
];
const scenarioItems: WorkbenchSelectItem[] = [
  { label: "不执行场景", value: "none" },
  { label: "关键场景", value: "critical" },
  { label: "全部场景", value: "all" },
];
const allVariantMode = computed(
  () => capture.draft?.screens[0]?.variants.mode ?? "default",
);
const allScenarioMode = computed(
  () => capture.draft?.screens[0]?.scenarios.mode ?? "none",
);
const mixedVariantModes = computed(
  () =>
    new Set(
      (capture.draft?.screens ?? []).map((screen) => screen.variants.mode),
    ).size > 1,
);
const mixedScenarioModes = computed(
  () =>
    new Set(
      (capture.draft?.screens ?? []).map((screen) => screen.scenarios.mode),
    ).size > 1,
);
const sourcePolicy = computed(
  () =>
    capture.draft?.screens.some((screen) => screen.captureScope.sourcePolicy) ??
    false,
);

let autoPreflightTimer: ReturnType<typeof setTimeout> | undefined;

async function autoPreflight() {
  if (!capture.composerOpen || !capture.draft?.screens.length) return;
  if (!capture.connected) {
    await capture.connect();
    return;
  }
  if (capture.composerOpen) await capture.runPreflight();
}

watch(
  () =>
    [
      capture.composerOpen,
      capture.draft ? JSON.stringify(capture.draft) : "",
      capture.connected,
    ] as const,
  ([open]) => {
    if (autoPreflightTimer) clearTimeout(autoPreflightTimer);
    if (!open) return;
    autoPreflightTimer = setTimeout(() => void autoPreflight(), 240);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (autoPreflightTimer) clearTimeout(autoPreflightTimer);
});

function variantMode(screenId: string) {
  return capture.draft?.screens.find((screen) => screen.screenId === screenId)
    ?.variants.mode;
}

function scenarioMode(screenId: string) {
  return capture.draft?.screens.find((screen) => screen.screenId === screenId)
    ?.scenarios.mode;
}

function setVariant(screenId: string, value: string) {
  capture.setVariantMode(
    screenId,
    value as "default" | "critical" | "default-and-critical" | "all",
  );
}

function setScenario(screenId: string, value: string) {
  capture.setScenarioMode(screenId, value as "none" | "critical" | "all");
}

function setAllVariants(value: string) {
  capture.setAllVariantMode(
    value as "default" | "critical" | "default-and-critical" | "all",
  );
}

function setAllScenarios(value: string) {
  capture.setAllScenarioMode(value as "none" | "critical" | "all");
}

function formatFragment(fragment: {
  pbId: string;
  pbKey?: string | undefined;
}) {
  return `${fragment.pbId}${fragment.pbKey ? `#${fragment.pbKey}` : ""}`;
}

async function startCapture() {
  await capture.createJob();
}
</script>

<template>
  <v-bottom-sheet
    v-model="capture.composerOpen"
    :retain-focus="false"
    content-class="capture-composer-overlay"
    data-testid="capture-composer"
  >
    <section class="capture-composer" aria-label="确认采集内容">
      <header class="composer-header">
        <div class="header-mark"><ScanLine :size="22" /></div>
        <div>
          <h2>{{ entryLabel }}</h2>
          <p>
            {{
              prototype?.label ?? capture.draft?.prototypeId ?? "尚未选择原型"
            }}
          </p>
        </div>
        <WorkbenchIconButton
          label="关闭采集确认"
          size="large"
          @click="capture.closeComposer"
        >
          <X :size="20" />
        </WorkbenchIconButton>
      </header>

      <div class="composer-scroll">
        <div v-if="!capture.draft" class="composer-empty">
          <Layers3 :size="30" />
          <strong>还没有采集范围</strong>
          <p>请从原型、页面画布或元素检查面板发起采集。</p>
        </div>

        <template v-else>
          <div class="scope-summary">
            <article>
              <span>范围</span>
              <strong>{{ capture.draft.screens.length }} 个页面</strong>
            </article>
            <article>
              <span>稳定元素</span>
              <strong>{{ fragmentCount || "完整页面" }}</strong>
            </article>
            <article>
              <span>截图</span>
              <strong>自动保存</strong>
            </article>
            <article>
              <span>执行方式</span>
              <strong>后台任务</strong>
            </article>
          </div>

          <section class="composer-section">
            <div class="section-title">
              <div>
                <span>要采集什么</span>
                <h3>页面、状态和关键场景</h3>
              </div>
              <small>先统一设置，仅在例外页面中单独覆盖</small>
            </div>

            <div class="prototype-policy">
              <label>
                <span>所有页面的状态范围</span>
                <WorkbenchSelect
                  :model-value="allVariantMode"
                  :items="variantItems"
                  aria-label="所有页面的状态范围"
                  @update:model-value="setAllVariants"
                />
                <small v-if="mixedVariantModes">当前存在页面级例外</small>
              </label>
              <label>
                <span>所有页面的交互场景 · Scenario</span>
                <WorkbenchSelect
                  :model-value="allScenarioMode"
                  :items="scenarioItems"
                  aria-label="所有页面的交互场景"
                  @update:model-value="setAllScenarios"
                />
                <small v-if="mixedScenarioModes">当前存在页面级例外</small>
              </label>
            </div>

            <div class="screen-list">
              <article
                v-for="{ selection, record } in draftScreens"
                :key="selection.screenId"
                class="screen-selection"
              >
                <div class="screen-copy">
                  <span class="screen-icon"><Layers3 :size="16" /></span>
                  <div>
                    <strong>{{ record?.label ?? selection.screenId }}</strong>
                    <small>{{ selection.screenId }}</small>
                  </div>
                </div>
                <details class="screen-override">
                  <summary>单独调整</summary>
                  <div class="screen-override-fields">
                    <label>
                      <span>页面状态</span>
                      <WorkbenchSelect
                        :model-value="
                          variantMode(selection.screenId) ?? 'default'
                        "
                        :items="variantItems"
                        aria-label="页面状态"
                        @update:model-value="
                          setVariant(selection.screenId, $event)
                        "
                      />
                    </label>
                    <label>
                      <span>交互场景</span>
                      <WorkbenchSelect
                        :model-value="
                          scenarioMode(selection.screenId) ?? 'none'
                        "
                        :items="scenarioItems"
                        aria-label="交互场景"
                        @update:model-value="
                          setScenario(selection.screenId, $event)
                        "
                      />
                    </label>
                  </div>
                </details>
                <div
                  v-if="selection.captureScope.fragments.length"
                  class="fragment-list"
                >
                  <span
                    v-for="fragment in selection.captureScope.fragments"
                    :key="formatFragment(fragment)"
                  >
                    <MousePointer2 :size="13" />
                    {{ formatFragment(fragment) }}
                  </span>
                </div>
                <div v-else class="page-scope">
                  <Check :size="14" /> 包含当前页面全部可观测语义和截图
                </div>
              </article>
            </div>
          </section>

          <details class="advanced-options">
            <summary>
              采集环境
              <span>主题、设备、源码证据与最低证据级别</span>
              <ChevronRight :size="16" />
            </summary>
            <div class="advanced-grid">
              <span
                >Theme：{{
                  capture.draft.screens
                    .flatMap((screen) => screen.themeIds)
                    .join(", ")
                }}</span
              >
              <span
                >Device：{{
                  capture.draft.screens
                    .flatMap((screen) => screen.deviceIds)
                    .join(", ")
                }}</span
              >
              <WorkbenchCheckbox
                :model-value="sourcePolicy"
                label="同时采集源码证据"
                @update:model-value="capture.setSourcePolicy"
              />
              <span>最低证据级别：运行时语义</span>
            </div>
          </details>

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

          <section v-if="capture.preflight" class="preflight-result">
            <div class="preflight-heading">
              <div>
                <span>范围检查 · Preflight / Case Matrix</span>
                <h3>{{ matrix.length }} 个将执行的采集项</h3>
              </div>
              <strong
                :class="{ warning: capture.preflight.result.warnings.length }"
              >
                {{
                  capture.preflight.result.warnings.length
                    ? `${capture.preflight.result.warnings.length} 项需要确认`
                    : "可以开始"
                }}
              </strong>
            </div>
            <div
              v-for="warning in capture.preflight.result.warnings"
              :key="warning.warningId"
              class="warning-row"
            >
              <AlertTriangle :size="17" />
              <span>
                <strong>{{ warning.message }}</strong>
                <small>影响 {{ warning.caseIds.length }} 个采集项</small>
              </span>
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
            <div class="matrix-preview">
              <span
                v-for="entry in matrix.slice(0, 6)"
                :key="entry.selectedCase.caseId"
              >
                {{ entry.selectedCase.caseKey.screenId }} ·
                {{ entry.selectedCase.caseKey.variantId }}
                <template v-if="entry.selectedCase.caseKey.scenario">
                  · {{ entry.selectedCase.caseKey.scenario.checkpointId }}
                </template>
              </span>
              <small v-if="matrix.length > 6"
                >还有 {{ matrix.length - 6 }} 项将在后台执行</small
              >
            </div>
          </section>
        </template>
      </div>

      <footer v-if="capture.draft" class="composer-actions">
        <div>
          <strong v-if="capture.preflight">
            范围检查已完成；开始后仍可继续浏览工作台
          </strong>
          <span v-else-if="capture.busy">正在自动检查采集范围…</span>
          <span v-else>采集范围变化后会自动重新检查</span>
        </div>
        <WorkbenchButton
          v-if="!capture.preflight"
          tone="neutral"
          :loading="capture.busy"
          :disabled="capture.busy"
          data-testid="composer-run-preflight"
          @click="capture.runPreflight"
        >
          <ScanLine :size="16" /> 重新检查
        </WorkbenchButton>
        <WorkbenchButton
          v-else
          tone="primary"
          :loading="capture.busy"
          :disabled="!capture.warningsAccepted"
          data-testid="composer-start-capture"
          @click="startCapture"
        >
          <Play :size="16" /> 开始
        </WorkbenchButton>
      </footer>
    </section>
  </v-bottom-sheet>
</template>

<style scoped>
.capture-composer {
  display: flex;
  width: min(1240px, calc(100vw - 32px));
  max-height: min(88vh, 900px);
  margin-inline: auto;
  overflow: hidden;
  flex-direction: column;
  border-radius: 24px 24px 0 0;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 -24px 70px rgba(15, 23, 42, 0.18);
}
.composer-header {
  position: sticky;
  top: 0;
  z-index: 3;
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
.header-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 13px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.composer-header span,
.section-title span,
.preflight-heading span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.composer-header h2,
.section-title h3,
.preflight-heading h3 {
  margin: 2px 0 0;
}
.composer-header p {
  margin: 5px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.78rem;
}
.composer-scroll {
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable both-edges;
}
.scope-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 18px 28px 0;
}
.scope-summary article {
  padding: 13px 15px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 13px;
  background: rgba(var(--v-theme-on-surface), 0.018);
}
.scope-summary span,
.screen-selection label > span {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.68rem;
}
.scope-summary strong {
  display: block;
  margin-top: 3px;
  font-size: 0.92rem;
}
.composer-section,
.advanced-options,
.preflight-result {
  margin: 16px 28px 0;
  padding: 18px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
}
.section-title,
.preflight-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}
.section-title small {
  color: rgba(var(--v-theme-on-surface), 0.48);
}
.prototype-policy {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 15px;
  padding: 13px;
  border-radius: 12px;
  background: color-mix(in srgb, rgb(var(--v-theme-action)) 7%, transparent);
}
.prototype-policy label > span,
.prototype-policy label > small {
  display: block;
  margin-bottom: 5px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.68rem;
}
.prototype-policy label > small {
  margin: 5px 0 0;
  color: rgb(var(--v-theme-warning));
}
.screen-list {
  display: grid;
  gap: 10px;
  margin-top: 15px;
}
.screen-selection {
  display: grid;
  grid-template-columns: minmax(210px, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}
.screen-copy {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}
.screen-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
  color: rgb(var(--v-theme-primary));
}
.screen-copy strong,
.screen-copy small {
  display: block;
}
.screen-copy small {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font:
    0.65rem ui-monospace,
    monospace;
  text-overflow: ellipsis;
}
.screen-override {
  min-width: 112px;
}
.screen-override summary {
  cursor: pointer;
  color: rgb(var(--v-theme-action));
  font-size: 0.72rem;
  font-weight: 700;
  text-align: right;
}
.screen-override-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(170px, 1fr));
  align-items: end;
  gap: 10px;
  margin-top: 10px;
}
.screen-override-fields > label > span {
  display: block;
  margin-bottom: 5px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.68rem;
}
.fragment-list,
.page-scope {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.fragment-list span,
.page-scope {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.7rem;
}
.fragment-list span {
  display: flex;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 8px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 9%, transparent);
}
.advanced-options summary {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 700;
}
.advanced-options summary span {
  flex: 1;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.7rem;
  font-weight: 500;
}
.advanced-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 14px;
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-size: 0.74rem;
}
.preflight-result {
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 25%,
    transparent
  );
}
.preflight-heading > strong {
  padding: 5px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 14%, transparent);
  color: rgb(var(--v-theme-success));
  font-size: 0.72rem;
}
.preflight-heading > strong.warning {
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 14%, transparent);
  color: rgb(var(--v-theme-warning));
}
.warning-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 11px;
  border-radius: 10px;
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 9%, transparent);
}
.warning-row strong,
.warning-row small {
  display: block;
}
.warning-row small {
  color: rgba(var(--v-theme-on-surface), 0.52);
}
.matrix-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}
.matrix-preview span,
.matrix-preview small {
  padding: 5px 8px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.045);
  font-size: 0.68rem;
}
.composer-actions {
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 16px 28px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}
.composer-actions > div {
  flex: 1;
}
.composer-actions strong,
.composer-actions span {
  display: block;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.72rem;
}
.composer-empty {
  display: grid;
  min-height: 260px;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.composer-empty p {
  margin: 0;
}
@media (max-width: 900px) {
  .scope-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .screen-selection {
    grid-template-columns: 1fr;
  }
  .prototype-policy {
    grid-template-columns: 1fr;
  }
  .screen-override summary {
    text-align: left;
  }
  .fragment-list,
  .page-scope {
    grid-column: 1;
  }
}
</style>
