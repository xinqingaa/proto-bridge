<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  ref,
  watch,
  type Component,
} from "vue";
import { Home, List, User } from "lucide-vue-next";
import DataList from "@/design-system/components/complex/DataList.vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import WorkbenchStatChip from "@/workbench/ui/WorkbenchStatChip.vue";
import {
  componentViewModules,
  loadComponentContract,
} from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";
import {
  usePlaygroundStore,
  type PlaygroundThemeId,
} from "@/app/stores/playground";
import type { PlaygroundControl } from "@/design-system/types";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import { resolveLiveTokenBindings } from "@/design-system/resolveLiveTokenBindings";
import { componentScenarios } from "@/design-system/components/scenarios";
import { storeToRefs } from "pinia";

const props = defineProps<{ componentId: string }>();
const playground = usePlaygroundStore();
const {
  scenarioId,
  themeId,
  resolvedProps,
  selectedScenario,
  highlightedPresetId,
} = storeToRefs(playground);

/** Stable tab ids: 内容 | 类型 | 行为 | 令牌 — never filter tabs away. */
type ControlPanelId = "content" | "type" | "behavior" | "tokens";
const activeControlPanel = ref<ControlPanelId>("content");

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

const tokenBindings = computed(() =>
  Object.entries(
    resolveLiveTokenBindings(
      contract.value?.tokenBindings ?? {},
      resolvedProps.value,
    ),
  ),
);
const resolvedPreviewTokens = computed(() => resolveThemeTokens(themeId.value));
const previewStyle = computed(() =>
  tokensToCssVars(resolvedPreviewTokens.value),
);
const vuetifyPreviewTheme = computed(() =>
  themeId.value === "dark" ? "pbworkDark" : "pbworkLight",
);
const tallPreview = computed(() =>
  [
    "bottom-sheet",
    "flow-sheet",
    "data-list",
    "scrollable-data-list",
    "tab-viewport",
    "app-bar",
    "tabs",
    "dialog",
    "snackbar",
    "bottom-navigation",
  ].includes(props.componentId),
);

const isOverlayPreview = computed(() =>
  ["dialog", "bottom-sheet", "flow-sheet", "snackbar"].includes(
    props.componentId,
  ),
);

const previewAttach = "[data-pb-scenario-preview]";

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
  "actionIcon",
  "name",
]);
const behaviorControlKeys = new Set([
  "loading",
  "disabled",
  "readonly",
  "required",
  "clearable",
  "block",
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
  "mouseSwipe",
  "showView",
]);

/** Always three groups + tokens tab; empty groups stay visible. */
const controlGroups = computed(() => {
  const groups = [
    {
      id: "content" as const,
      label: "内容",
      controls: [] as PlaygroundControl[],
    },
    { id: "type" as const, label: "类型", controls: [] as PlaygroundControl[] },
    {
      id: "behavior" as const,
      label: "行为",
      controls: [] as PlaygroundControl[],
    },
  ];
  for (const control of controls.value) {
    // Boolean toggles (incl. boolean modelValue) → 行为; text modelValue → 内容.
    if (control.control === "boolean" || behaviorControlKeys.has(control.key))
      groups[2]!.controls.push(control);
    else if (contentControlKeys.has(control.key))
      groups[0]!.controls.push(control);
    else groups[1]!.controls.push(control);
  }
  return groups;
});

const activeControlGroup = computed(() =>
  controlGroups.value.find((group) => group.id === activeControlPanel.value),
);

const panelPreviewSlots = computed(() =>
  ["tabs"].includes(record.value?.id ?? "")
    ? (contract.value?.slots ?? [])
    : [],
);

function panelSlotLabel(name: string) {
  if (name === "overview") return "概览内容 · 点选或左右滑动切换";
  if (name === "activity") return "活动内容 · 点选或左右滑动切换";
  return `${name}视图 · 点击导航或拖动切换`;
}

const playgroundNavIcons = [Home, List, User];

function previewBind() {
  const base: Record<string, unknown> = { ...resolvedProps.value };
  if (props.componentId === "bottom-navigation") {
    const rawItems = Array.isArray(base.items) ? base.items : [];
    base.items = rawItems.map((item, index) => {
      const row =
        item && typeof item === "object"
          ? (item as { value?: string; label?: string })
          : { value: String(item), label: String(item) };
      return {
        value: row.value ?? `item-${index}`,
        label: row.label ?? row.value ?? `项 ${index + 1}`,
        icon: playgroundNavIcons[index % playgroundNavIcons.length],
      };
    });
  }
  if (!isOverlayPreview.value) return base;
  return {
    ...base,
    attach: previewAttach,
    contained: true,
    modelValue: Boolean(base.modelValue),
  };
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
    activeControlPanel.value = "content";
  },
  { immediate: true },
);

function onPreviewUpdate(value: unknown) {
  playground.setOverride("modelValue", value);
}

function controlValue(key: string): unknown {
  return resolvedProps.value[key];
}

function setControlValue(key: string, value: unknown) {
  playground.setOverride(key, value);
}

function resetCurrent() {
  playground.reset();
}

function selectPreset(id: string) {
  playground.applyPreset(id);
}

function selectScenario(id: string) {
  playground.setScenario(id);
}

function setPreviewTheme(value: unknown) {
  if (value === "light" || value === "dark") {
    playground.setTheme(value as PlaygroundThemeId);
  }
}

function bindingResolvedValue(tokenId: string) {
  return resolvedPreviewTokens.value[tokenId];
}
</script>

<template>
  <ResourcePageShell
    v-if="record && contract"
    :eyebrow="record.category === 'basic' ? '基础组件' : '复杂组件'"
    :title="record.label"
    :description="record.description"
  >
    <template #stats>
      <WorkbenchStatChip :value="controls.length" label="个可调项" />
      <WorkbenchStatChip :value="states.length" label="个预设" />
      <WorkbenchStatChip :value="tokenBindings.length" label="个令牌绑定" />
    </template>

    <template #toolbar>
      <v-select
        :model-value="scenarioId"
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
        :model-value="highlightedPresetId"
        density="compact"
        color="primary"
        variant="outlined"
        divided
      >
        <v-btn value="default" size="small" @click="selectPreset('default')"
          >默认</v-btn
        >
        <v-btn
          v-for="state in states"
          :key="state.id"
          :value="state.id"
          size="small"
          @click="selectPreset(state.id)"
          >{{ state.label }}</v-btn
        >
      </v-btn-toggle>
      <span class="preset-hint"
        >匹配当前预览时高亮；侧栏调整后若不匹配则取消</span
      >
      <v-btn-toggle
        :model-value="themeId"
        density="compact"
        color="primary"
        variant="outlined"
        divided
        mandatory
        aria-label="预览主题"
        @update:model-value="setPreviewTheme"
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
            <code>{{ `theme.${themeId}` }}</code>
          </header>
          <v-theme-provider :theme="vuetifyPreviewTheme">
            <div
              class="preview scenario-preview"
              data-pb-scenario-preview
              :style="previewStyle"
              :class="{
                'is-tall': tallPreview,
                'is-overlay': isOverlayPreview,
              }"
            >
              <component
                :is="previewComponent"
                v-bind="previewBind()"
                @update:model-value="onPreviewUpdate"
                @update:step="setControlValue('step', $event)"
              >
                <template v-if="record.id === 'bottom-sheet'"
                  >选择状态、优先级和时间范围后应用筛选。</template
                >
                <template v-else-if="record.id === 'flow-sheet'">
                  <div>
                    <strong>步骤 1 · 确认范围</strong>
                    <p>核对要采集的页面与状态。</p>
                  </div>
                  <div>
                    <strong>步骤 2 · 执行中</strong>
                    <p>显示 case 级进度。</p>
                  </div>
                  <div>
                    <strong>步骤 3 · 结果与风险</strong>
                    <p>Review 截图与提醒。</p>
                  </div>
                  <div>
                    <strong>步骤 4 · Agent 提示词</strong>
                    <p>复制提示词并交付。</p>
                  </div>
                </template>
                <template v-else-if="record.id === 'card'"
                  >4 个待处理 · 2 个即将超时</template
                >
                <template v-else-if="record.id === 'form-section'"
                  >在这里放置该业务分组的表单字段。</template
                >
                <template v-else-if="record.id === 'data-list'">
                  <div
                    v-for="row in ['今日流水', '本周任务', '即将过期']"
                    :key="row"
                    role="listitem"
                    class="list-slot-demo"
                  >
                    <strong>{{ row }}</strong
                    ><span>业务完全自定义的列表项</span>
                  </div>
                </template>
                <template v-else-if="record.id === 'scrollable-data-list'">
                  <DataList surface="default" rounded="md" divided>
                    <div
                      v-for="row in ['今日流水', '本周任务', '即将过期']"
                      :key="row"
                      role="listitem"
                      class="list-slot-demo"
                    >
                      <strong>{{ row }}</strong
                      ><span>ScrollableDataList 壳 + DataList 外观</span>
                    </div>
                  </DataList>
                </template>
                <template v-if="record.id === 'tab-viewport'" #item="{ value }">
                  <div class="panel-slot-demo">
                    <strong>{{ value }}</strong>
                    <span>由外部导航控制的保活内容视图</span>
                  </div>
                </template>
                <template
                  v-for="slotName in panelPreviewSlots"
                  :key="slotName"
                  #[slotName]
                >
                  <div class="panel-slot-demo">
                    <strong>{{ slotName }}</strong>
                    <span>{{ panelSlotLabel(slotName) }}</span>
                  </div>
                </template>
              </component>
            </div>
          </v-theme-provider>
        </article>
      </div>

      <v-form class="controls" @submit.prevent>
        <div class="controls-header">
          <strong>调整组件</strong>
          <v-btn size="small" variant="text" @click="resetCurrent">重置</v-btn>
        </div>

        <v-tabs
          v-model="activeControlPanel"
          class="control-tabs"
          density="compact"
          color="primary"
          grow
        >
          <v-tab
            v-for="group in controlGroups"
            :key="group.id"
            :value="group.id"
            >{{ group.label }}</v-tab
          >
          <v-tab value="tokens">令牌</v-tab>
        </v-tabs>

        <div class="controls-body">
          <fieldset v-if="activeControlGroup" class="controls-fields">
            <p v-if="!activeControlGroup.controls.length" class="empty">
              暂无可调项
            </p>
            <template
              v-for="control in activeControlGroup.controls"
              :key="control.key"
            >
              <v-switch
                v-if="control.control === 'boolean'"
                :model-value="Boolean(controlValue(control.key))"
                :label="control.label"
                color="primary"
                density="compact"
                inset
                hide-details
                class="compact-switch"
                @update:model-value="setControlValue(control.key, $event)"
              />
              <template v-else>
                <div class="control-label">
                  <span>{{ control.label }}</span>
                </div>
                <v-select
                  v-if="control.control === 'select'"
                  :model-value="controlValue(control.key)"
                  :items="control.options ?? []"
                  item-title="label"
                  item-value="value"
                  :label="control.label"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="compact-control"
                  @update:model-value="setControlValue(control.key, $event)"
                />
                <v-text-field
                  v-else
                  :model-value="String(controlValue(control.key) ?? '')"
                  :label="control.label"
                  :type="control.control === 'number' ? 'number' : 'text'"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="compact-control"
                  @update:model-value="
                    setControlValue(
                      control.key,
                      control.control === 'number' ? Number($event) : $event,
                    )
                  "
                />
              </template>
            </template>
          </fieldset>

          <section
            v-else-if="activeControlPanel === 'tokens'"
            class="token-list"
          >
            <p class="token-list-hint">
              只读：组件固定消费这些语义令牌。换肤请改主题值，不要在此换绑。
            </p>
            <ul v-if="tokenBindings.length" class="binding-list">
              <li v-for="[slot, tokenId] in tokenBindings" :key="slot">
                <div class="binding-heading">
                  <span>{{ slot }}</span>
                  <code>{{ tokenId }}</code>
                </div>
                <code class="binding-value">{{
                  bindingResolvedValue(tokenId) ?? "—"
                }}</code>
              </li>
            </ul>
            <p v-else class="empty">该组件未声明 tokenBindings。</p>
          </section>
        </div>
      </v-form>
    </div>
  </ResourcePageShell>
  <v-alert v-else type="error" variant="tonal"
    >未知组件：{{ componentId }}</v-alert
  >
</template>

<style scoped>
.scenario-select {
  flex: 0 1 220px;
  min-width: 180px;
}
.preset-hint {
  flex: 1 1 160px;
  min-width: 0;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.75rem;
  line-height: 1.35;
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
  min-height: 480px;
}
.preview-wrap:has(.is-overlay) {
  overflow: visible;
}
.preview :deep(.v-overlay-container),
.preview :deep(.v-overlay) {
  position: absolute !important;
}
.panel-slot-demo {
  display: grid;
  min-height: 120px;
  place-content: center;
  gap: var(--pb-spacing-xs, 4px);
  padding: var(--pb-spacing-md, 16px);
  color: var(--pb-color-on-surface-muted, #64748b);
  text-align: center;
  font: var(--pb-typography-caption, 400 12px/1.4 Inter, system-ui, sans-serif);
}
.panel-slot-demo strong {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-subtitle);
}
.list-slot-demo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 0 14px;
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-content);
}
.list-slot-demo span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.controls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px;
}
.control-tabs {
  flex: none;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.control-tabs :deep(.v-tab) {
  min-width: 0;
  padding-inline: 8px;
  font-size: 0.75rem;
}
.controls-body {
  padding: 12px;
}
.control-label {
  display: flex;
  justify-content: space-between;
  margin: 0 0 5px;
  font-size: 0.75rem;
}
.controls-fields {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.compact-control {
  margin-bottom: 10px;
}
.compact-switch {
  min-height: 40px;
  margin-bottom: 4px;
}
.token-list-hint {
  margin: 0 0 12px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
  line-height: 1.4;
}
.binding-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.binding-list li {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  background: rgba(var(--v-theme-on-surface), 0.025);
  font-size: 0.75rem;
}
.binding-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.binding-heading span {
  font-weight: 650;
}
.binding-heading code,
.binding-value {
  min-width: 0;
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.62);
  text-overflow: ellipsis;
  white-space: nowrap;
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
