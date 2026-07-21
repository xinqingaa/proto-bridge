<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onMounted,
  ref,
  watch,
  type Component,
} from "vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import {
  componentViewModules,
  loadComponentContract,
} from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";
import { usePlaygroundStore } from "@/app/stores/playground";
import type { PlaygroundControl } from "@/design-system/types";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import { resolveLiveTokenBindings } from "@/design-system/resolveLiveTokenBindings";
import { componentScenarios } from "@/design-system/components/scenarios";

const props = defineProps<{ componentId: string }>();
const playground = usePlaygroundStore();
const selectedStateId = ref("default");
const selectedScenarioId = ref("");
const previewTheme = ref<"light" | "dark">("light");

const record = computed(() =>
  componentRecords.find((item) => item.id === props.componentId),
);
const contract = computed(() =>
  record.value ? loadComponentContract(record.value.contract) : undefined,
);
const controls = computed(
  () => (record.value?.controls ?? []) as PlaygroundControl[],
);
const states = computed(() => contract.value?.states ?? []);
const scenarios = computed(() => componentScenarios(props.componentId));
const selectedScenario = computed(
  () =>
    scenarios.value.find((item) => item.id === selectedScenarioId.value) ??
    scenarios.value[0],
);
const tokenBindings = computed(() =>
  Object.entries(
    resolveLiveTokenBindings(
      contract.value?.tokenBindings ?? {},
      playground.props,
    ),
  ),
);
const previewStyle = computed(() =>
  tokensToCssVars(resolveThemeTokens(previewTheme.value)),
);
const vuetifyPreviewTheme = computed(() =>
  previewTheme.value === "dark" ? "pbworkDark" : "pbworkLight",
);
const tallPreview = computed(() =>
  [
    "bottom-sheet",
    "data-list",
    "app-bar",
    "tabs",
    "dialog",
    "snackbar",
  ].includes(props.componentId),
);

const isOverlayPreview = computed(() =>
  ["dialog", "bottom-sheet", "snackbar"].includes(props.componentId),
);

const previewAttach = "[data-pb-scenario-preview]";

function previewBind() {
  const base = { ...playground.props };
  if (!isOverlayPreview.value) return base;
  return {
    ...base,
    attach: previewAttach,
    contained: true,
    modelValue: Boolean(base.modelValue),
  };
}

watch(
  () => props.componentId,
  () => {
    previewTheme.value = "light";
  },
);

const contentControlKeys = new Set([
  "label",
  "title",
  "subtitle",
  "description",
  "message",
  "placeholder",
  "modelValue",
  "emptyText",
  "actionLabel",
  "confirmLabel",
  "ariaLabel",
  "icon",
  "name",
]);
const behaviorControlKeys = new Set([
  "loading",
  "disabled",
  "readonly",
  "required",
  "clearable",
  "block",
  "modelValue",
  "showBack",
  "showAction",
  "showActions",
  "showFilter",
  "showIndicator",
  "showDivider",
  "grow",
  "elevated",
  "indeterminate",
  "inset",
]);
const controlGroups = computed(() => {
  const groups = [
    { id: "content", label: "内容", controls: [] as PlaygroundControl[] },
    { id: "appearance", label: "外观", controls: [] as PlaygroundControl[] },
    { id: "behavior", label: "行为", controls: [] as PlaygroundControl[] },
  ];
  for (const control of controls.value) {
    if (behaviorControlKeys.has(control.key) || control.control === "boolean")
      groups[2]!.controls.push(control);
    else if (contentControlKeys.has(control.key))
      groups[0]!.controls.push(control);
    else groups[1]!.controls.push(control);
  }
  return groups.filter((group) => group.controls.length > 0);
});

/** Named panel slots for Tabs playground (contract.slots). */
const tabsPreviewSlots = computed(() =>
  record.value?.id === "tabs" ? (contract.value?.slots ?? []) : [],
);

function tabsSlotLabel(name: string) {
  if (name === "overview") return "概览内容 · 点选或左右滑动切换";
  if (name === "activity") return "活动内容 · 点选或左右滑动切换";
  return `${name} 面板`;
}

const previewComponent = computed(() => {
  if (!record.value) return null;
  const match = Object.entries(componentViewModules).find(([path]) =>
    path.endsWith(`/${record.value!.view}`),
  );
  if (!match) return null;
  return defineAsyncComponent(
    match[1] as () => Promise<{ default: Component }>,
  );
});

watch(
  () => props.componentId,
  (id) => {
    playground.open(id);
    selectedStateId.value = "default";
    selectedScenarioId.value = componentScenarios(id)[0]?.id ?? "default";
    const scenario = componentScenarios(id)[0];
    for (const [key, value] of Object.entries(scenario?.props ?? {}))
      playground.setProp(key, value);
  },
  { immediate: true },
);

onMounted(() =>
  selectScenario(
    selectedScenarioId.value || scenarios.value[0]?.id || "default",
  ),
);

function onPreviewUpdate(value: unknown) {
  setControlValue("modelValue", value);
}

function controlValue(key: string): unknown {
  return playground.props[key];
}

function setControlValue(key: string, value: unknown) {
  playground.setProp(key, value);
}

function resetCurrent() {
  selectState(selectedStateId.value);
}

function selectState(id: string) {
  selectedStateId.value = id;
  playground.open(props.componentId);
  const state = states.value.find((item) => item.id === id);
  for (const [key, value] of Object.entries(state?.props ?? {})) {
    playground.setProp(key, value);
  }
}

function selectScenario(id: string) {
  selectedScenarioId.value = id;
  selectedStateId.value = "default";
  playground.open(props.componentId);
  const scenario = scenarios.value.find((item) => item.id === id);
  for (const [key, value] of Object.entries(scenario?.props ?? {}))
    playground.setProp(key, value);
}
</script>

<template>
  <ResourcePageShell
    v-if="record && contract"
    :eyebrow="record.category === 'basic' ? '基础组件' : '复杂组件'"
    :title="record.label"
    description="从真实业务场景开始体验组件，再按内容、外观与行为调整为需要的状态。"
  >
    <template #stats>
      <v-chip size="small" variant="tonal"
        >{{ controls.length }} 个可调项</v-chip
      >
      <v-chip size="small" variant="tonal"
        >{{ states.length }} 个预设状态</v-chip
      >
      <v-chip size="small" variant="tonal"
        >{{ tokenBindings.length }} Bindings</v-chip
      >
    </template>

    <template #toolbar>
      <v-select
        :model-value="selectedScenarioId"
        :items="scenarios"
        item-title="label"
        item-value="id"
        label="使用场景"
        density="compact"
        variant="outlined"
        hide-details
        class="scenario-select"
        @update:model-value="selectScenario(String($event))"
      />
      <v-btn-toggle
        v-if="states.length"
        :model-value="selectedStateId"
        density="compact"
        color="primary"
        variant="outlined"
        divided
        mandatory
      >
        <v-btn value="default" size="small" @click="selectState('default')"
          >默认</v-btn
        >
        <v-btn
          v-for="state in states"
          :key="state.id"
          :value="state.id"
          size="small"
          @click="selectState(state.id)"
          >{{ state.label }}</v-btn
        >
      </v-btn-toggle>
      <v-btn-toggle
        v-model="previewTheme"
        density="compact"
        color="primary"
        variant="outlined"
        divided
        mandatory
        aria-label="预览主题"
      >
        <v-btn value="light" size="small">浅色</v-btn>
        <v-btn value="dark" size="small">深色</v-btn>
      </v-btn-toggle>
    </template>

    <div class="playground-grid">
      <div class="preview-wrap">
        <article class="scenario-preview-card" :style="previewStyle">
          <header class="scenario-header">
            <div>
              <strong>{{ selectedScenario?.label }}</strong>
              <span>{{ selectedScenario?.description }}</span>
            </div>
            <code>{{ `theme.${previewTheme}` }}</code>
          </header>
          <v-theme-provider :theme="vuetifyPreviewTheme">
            <div
              class="preview scenario-preview"
              data-pb-scenario-preview
              :class="{
                'is-tall': tallPreview,
                'is-overlay': isOverlayPreview,
              }"
            >
              <component
                :is="previewComponent"
                v-bind="previewBind()"
                @update:model-value="onPreviewUpdate"
              >
                <template v-if="record.id === 'bottom-sheet'"
                  >选择状态、优先级和时间范围后应用筛选。</template
                >
                <template v-else-if="record.id === 'card'"
                  >4 个待处理 · 2 个即将超时</template
                >
                <template v-else-if="record.id === 'form-section'"
                  >在这里放置该业务分组的表单字段。</template
                >
                <template
                  v-for="slotName in tabsPreviewSlots"
                  :key="slotName"
                  #[slotName]
                >
                  <p class="tabs-panel-demo">{{ tabsSlotLabel(slotName) }}</p>
                </template>
              </component>
            </div>
          </v-theme-provider>
        </article>
      </div>

      <v-form class="controls" @submit.prevent>
        <div class="controls-header">
          <div>
            <strong>调整组件</strong>
            <span>修改后立即更新当前业务场景</span>
          </div>
          <v-btn size="small" variant="text" @click="resetCurrent">重置</v-btn>
        </div>

        <p class="controls-explainer">
          无需理解 Props：下面的设置分别控制组件内容、外观和交互状态。
        </p>

        <fieldset
          v-for="group in controlGroups"
          :key="group.id"
          class="controls-fields"
        >
          <legend>{{ group.label }}</legend>
          <template v-for="control in group.controls" :key="control.key">
            <div class="control-label">
              <span>{{ control.label }}</span>
            </div>
            <v-switch
              v-if="control.control === 'boolean'"
              :model-value="Boolean(controlValue(control.key))"
              :label="control.label"
              color="primary"
              hide-details
              class="mb-3"
              @update:model-value="setControlValue(control.key, $event)"
            />
            <v-select
              v-else-if="control.control === 'select'"
              :model-value="controlValue(control.key)"
              :items="control.options ?? []"
              item-title="label"
              item-value="value"
              :label="`${control.label} · ${control.key}`"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-3"
              @update:model-value="setControlValue(control.key, $event)"
            />
            <v-text-field
              v-else
              :model-value="String(controlValue(control.key) ?? '')"
              :label="`${control.label} · ${control.key}`"
              :type="control.control === 'number' ? 'number' : 'text'"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-3"
              @update:model-value="
                setControlValue(
                  control.key,
                  control.control === 'number' ? Number($event) : $event,
                )
              "
            />
          </template>
        </fieldset>

        <section class="token-bindings">
          <strong>Token 绑定</strong>
          <ul v-if="tokenBindings.length" class="binding-list">
            <li v-for="[slot, tokenId] in tokenBindings" :key="slot">
              <span>{{ slot }}</span>
              <code>{{ tokenId }}</code>
            </li>
          </ul>
          <p v-else class="empty">无 Token 绑定。</p>
        </section>

        <v-alert type="info" variant="tonal" density="comfortable">
          高级写回（更新组件示例）将在 M6 启用。
        </v-alert>
      </v-form>
    </div>
  </ResourcePageShell>
  <v-alert v-else type="error" variant="tonal"
    >未知组件：{{ componentId }}</v-alert
  >
</template>

<style scoped>
.toolbar-hint {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
.scenario-select {
  flex: 0 1 220px;
  min-width: 180px;
}
.playground-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 20px;
  align-items: start;
}
.preview-wrap,
.controls {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}
.scenario-preview-card {
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.scenario-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--pb-color-border, #d7dee8);
}
.scenario-header > div {
  display: grid;
  gap: 3px;
}
.scenario-header strong {
  font: var(--pb-typography-label);
}
.scenario-header span,
.scenario-header code {
  color: var(--pb-color-on-surface-muted, #64748b);
  font: var(--pb-typography-caption);
}
.preview {
  position: relative;
  overflow: hidden;
  min-height: 120px;
  padding: 20px;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.preview.is-tall {
  min-height: 320px;
}
.preview.is-overlay {
  overflow: visible;
  min-height: 360px;
}
.preview-wrap:has(.is-overlay) {
  overflow: visible;
}
.preview :deep(.v-overlay-container),
.preview :deep(.v-overlay) {
  position: absolute !important;
}
.tabs-panel-demo {
  margin: 0;
  padding: 4px 0;
  color: var(--pb-color-on-surface-muted, #64748b);
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
.controls {
  padding: 16px;
}
.controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.controls-header > div {
  display: grid;
  gap: 2px;
}
.controls-header span,
.controls-explainer {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
.controls-explainer {
  margin: 0 0 16px;
  line-height: 1.5;
}
.control-label {
  display: flex;
  justify-content: space-between;
  margin: 2px 0 5px;
  font-size: 0.75rem;
}
.control-label code {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.6875rem;
}
.controls-fields {
  margin: 0 0 16px;
  padding: 0;
  border: 0;
  min-width: 0;
}
.controls-fields legend {
  width: 100%;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8125rem;
  font-weight: 650;
}
.token-bindings {
  margin: 8px 0 16px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.token-bindings strong {
  display: block;
  margin-bottom: 8px;
  font-size: 0.8125rem;
}
.binding-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.binding-list li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.75rem;
}
.binding-list code {
  color: rgba(var(--v-theme-on-surface), 0.62);
}
.empty {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
@media (max-width: 1279px) {
  .playground-grid {
    grid-template-columns: 1fr;
  }
}
</style>
