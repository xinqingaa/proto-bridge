<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
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
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import { resolveLiveTokenBindings } from "@/design-system/resolveLiveTokenBindings";
import { componentScenarios } from "@/design-system/components/scenarios";
import { storeToRefs } from "pinia";

const props = defineProps<{ componentId: string }>();
const playground = usePlaygroundStore();
const { scenarioId, themeId, resolvedProps, selectedScenario } =
  storeToRefs(playground);

const record = computed(() =>
  componentRecords.find((item) => item.id === props.componentId),
);
const contract = computed(() =>
  record.value ? loadComponentContract(record.value.contract) : undefined,
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
const presentation = computed(
  () => contract.value?.playground?.presentation ?? "interactive",
);
const isGalleryPresentation = computed(() => presentation.value === "gallery");
const isTriggerPresentation = computed(() => presentation.value === "trigger");
const presentationLabel = computed(() => {
  if (isGalleryPresentation.value) return "平铺";
  if (isTriggerPresentation.value) return "触发";
  return "互动";
});
const toolbarHint = computed(() => {
  if (isGalleryPresentation.value) return "状态平铺；只切换主题";
  if (isTriggerPresentation.value) return "点击触发，观察打开与关闭";
  return "直接使用组件；状态在画布内反馈";
});
const tallPreview = computed(() =>
  [
    "bottom-sheet",
    "flow-sheet",
    "data-list",
    "scrollable-data-list",
    "tab-viewport",
    "app-bar",
    "primary-tabs",
    "secondary-tabs",
    "dialog",
    "snackbar",
    "tabbar",
  ].includes(props.componentId),
);
const isOverlayPreview = computed(() => isTriggerPresentation.value);
const isButton = computed(() => record.value?.id === "button");
const isTabbar = computed(() => record.value?.id === "tabbar");
const isFilterBar = computed(() => record.value?.id === "filter-bar");
const previewAttach = "[data-pb-scenario-preview]";

const hasDisabledState = computed(() => {
  const schema = contract.value?.propsSchema as
    { properties?: Record<string, unknown> } | undefined;
  return Boolean(schema?.properties?.disabled);
});

type GalleryEntry = {
  id: string;
  label: string;
  props: Record<string, unknown>;
};
const galleryEntries = computed((): GalleryEntry[] => {
  const defaults = contract.value?.defaultProps ?? {};
  return [
    { id: "default", label: "默认", props: { ...defaults } },
    ...states.value.map((state) => ({
      id: state.id,
      label: state.label,
      props: { ...defaults, ...(state.props ?? {}) },
    })),
  ];
});

const panelPreviewSlots = computed(() =>
  ["primary-tabs", "secondary-tabs"].includes(record.value?.id ?? "")
    ? (contract.value?.slots ?? [])
    : [],
);
function panelSlotLabel(name: string) {
  if (name === "overview") return "概览内容 · 点选或左右滑动切换";
  if (name === "activity") return "活动内容 · 点选或左右滑动切换";
  return `${name}视图 · 点击导航或拖动切换`;
}

const playgroundNavIcons = [Home, List, User];
function enrichBind(base: Record<string, unknown>): Record<string, unknown> {
  const next = { ...base };
  if (props.componentId === "tabbar") {
    const rawItems = Array.isArray(next.items) ? next.items : [];
    next.items = rawItems.map((item, index) => {
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
  if (!isOverlayPreview.value) return next;
  return {
    ...next,
    attach: previewAttach,
    contained: true,
    modelValue: Boolean(next.modelValue),
  };
}

const buttonActionBusy = ref(false);
const buttonActionFinished = ref(false);
let buttonActionTimer: ReturnType<typeof setTimeout> | undefined;

function previewBind() {
  const next = { ...resolvedProps.value };
  if (isButton.value && buttonActionBusy.value) next.loading = true;
  return enrichBind(next);
}
function disabledPreviewBind() {
  return enrichBind({ ...resolvedProps.value, disabled: true, loading: false });
}
function galleryBind(entry: GalleryEntry) {
  return enrichBind({ ...entry.props });
}
function openTriggeredPreview() {
  playground.setOverride("modelValue", true);
}
function onPreviewUpdate(value: unknown) {
  playground.setOverride("modelValue", value);
}
function onPreviewStep(value: unknown) {
  playground.setOverride("step", value);
}
function onPreviewClick() {
  if (!isButton.value || buttonActionBusy.value) return;
  buttonActionBusy.value = true;
  buttonActionFinished.value = false;
  buttonActionTimer = setTimeout(() => {
    buttonActionBusy.value = false;
    buttonActionFinished.value = true;
  }, 800);
}

const previewComponent = computed(() => {
  if (!record.value) return null;
  const match = Object.entries(componentViewModules).find(([path]) =>
    path.endsWith(`/${record.value!.view}`),
  );
  return match
    ? defineAsyncComponent(match[1] as () => Promise<{ default: Component }>)
    : null;
});

const checkboxMultiValues = ref({ sms: true, push: false, email: true });
const isCheckboxMulti = computed(
  () => record.value?.id === "checkbox" && scenarioId.value === "multi",
);
const tabbarSelectedLabel = computed(() => {
  if (!isTabbar.value) return "";
  const items = previewBind().items;
  if (!Array.isArray(items)) return "当前目的地";
  const selected = items.find(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { value?: string }).value === resolvedProps.value.modelValue,
  ) as { label?: string } | undefined;
  return selected?.label ?? "当前目的地";
});
const filterRows = computed(() => {
  const selected = String(resolvedProps.value.modelValue ?? "全部");
  const rows = [
    { title: "C-204 · 温控告警", state: "进行中" },
    { title: "C-177 · 巡检待复核", state: "已超时" },
    { title: "C-152 · 路线偏离", state: "进行中" },
  ];
  return selected === "全部"
    ? rows
    : rows.filter((row) => row.state === selected);
});

watch(
  () => props.componentId,
  (id) => {
    if (buttonActionTimer) clearTimeout(buttonActionTimer);
    buttonActionBusy.value = false;
    buttonActionFinished.value = false;
    playground.open(id);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  if (buttonActionTimer) clearTimeout(buttonActionTimer);
});

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
      <WorkbenchStatChip :value="states.length" label="个状态" />
      <WorkbenchStatChip :value="presentationLabel" label="展示" />
      <WorkbenchStatChip :value="tokenBindings.length" label="个令牌绑定" />
    </template>

    <template #toolbar>
      <v-select
        v-if="!isGalleryPresentation"
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
      <span class="preset-hint">{{ toolbarHint }}</span>
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

    <div class="playground-stage">
      <article class="preview-wrap" :style="previewStyle">
        <header class="scenario-header">
          <div>
            <strong>{{
              isGalleryPresentation ? "状态矩阵" : selectedScenario?.label
            }}</strong>
            <span>{{
              isGalleryPresentation
                ? "默认与 Contract 状态并置"
                : selectedScenario?.description
            }}</span>
          </div>
          <code>{{ `theme.${themeId}` }}</code>
        </header>

        <v-theme-provider :theme="vuetifyPreviewTheme">
          <div
            v-if="isGalleryPresentation"
            class="preview gallery-matrix"
            :style="previewStyle"
          >
            <section
              v-for="entry in galleryEntries"
              :key="entry.id"
              class="gallery-cell"
            >
              <header>{{ entry.label }}</header>
              <div>
                <component :is="previewComponent" v-bind="galleryBind(entry)" />
              </div>
            </section>
          </div>

          <div
            v-else-if="isTriggerPresentation"
            class="preview is-tall is-overlay"
            data-pb-scenario-preview
            :style="previewStyle"
          >
            <div class="trigger-bar">
              <v-btn
                color="primary"
                variant="flat"
                size="small"
                @click="openTriggeredPreview"
                >打开{{ record.label }}</v-btn
              >
              <span>关闭后可再次打开</span>
            </div>
            <component
              :is="previewComponent"
              v-bind="previewBind()"
              @update:model-value="onPreviewUpdate"
              @update:step="onPreviewStep"
            >
              <template v-if="record.id === 'bottom-sheet'"
                >选择状态、优先级和时间范围后应用筛选。</template
              >
              <template v-else-if="record.id === 'flow-sheet'">
                <div v-for="step in 4" :key="step">
                  <strong>步骤 {{ step }}</strong>
                  <p>观察当前步骤的上下文与进度。</p>
                </div>
              </template>
            </component>
          </div>

          <div
            v-else
            class="preview"
            :class="{ 'is-tall': tallPreview }"
            data-pb-scenario-preview
            :style="previewStyle"
          >
            <template v-if="isTabbar">
              <div class="tabbar-demo-viewport">
                <strong>{{ tabbarSelectedLabel }}</strong>
                <span
                  >视图区位于 Tabbar
                  上方；根目的地仅点击切换，不接受横滑。</span
                >
              </div>
              <component
                :is="previewComponent"
                v-bind="previewBind()"
                @update:model-value="onPreviewUpdate"
              />
            </template>

            <template v-else-if="isFilterBar">
              <component
                :is="previewComponent"
                v-bind="previewBind()"
                @update:model-value="onPreviewUpdate"
              />
              <div class="filter-results" aria-live="polite">
                <p>当前筛选结果</p>
                <div
                  v-for="row in filterRows"
                  :key="row.title"
                  class="list-slot-demo"
                >
                  <strong>{{ row.title }}</strong
                  ><span>{{ row.state }}</span>
                </div>
                <p v-if="!filterRows.length" class="empty">
                  当前筛选没有匹配项。
                </p>
              </div>
            </template>

            <div v-else-if="isCheckboxMulti" class="checkbox-multi-demo">
              <component
                :is="previewComponent"
                label="短信通知"
                :model-value="checkboxMultiValues.sms"
                selected-color="color.primary"
                unchecked-border-color="color.outline"
                inspect-id="ds.checkbox.multi.sms"
                @update:model-value="checkboxMultiValues.sms = Boolean($event)"
              />
              <component
                :is="previewComponent"
                label="推送通知"
                :model-value="checkboxMultiValues.push"
                selected-color="color.primary"
                unchecked-border-color="color.outline"
                inspect-id="ds.checkbox.multi.push"
                @update:model-value="checkboxMultiValues.push = Boolean($event)"
              />
              <component
                :is="previewComponent"
                label="邮件通知"
                :model-value="checkboxMultiValues.email"
                selected-color="color.success"
                unchecked-border-color="color.outline"
                inspect-id="ds.checkbox.multi.email"
                @update:model-value="
                  checkboxMultiValues.email = Boolean($event)
                "
              />
            </div>

            <component
              v-else
              :is="previewComponent"
              v-bind="previewBind()"
              @click="onPreviewClick"
              @update:model-value="onPreviewUpdate"
              @update:step="onPreviewStep"
            >
              <template v-if="record.id === 'card'"
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
                <DataList surface="default" rounded="md" divided
                  ><div
                    v-for="row in ['今日流水', '本周任务', '即将过期']"
                    :key="row"
                    role="listitem"
                    class="list-slot-demo"
                  >
                    <strong>{{ row }}</strong
                    ><span>ScrollableDataList 壳 + DataList 外观</span>
                  </div></DataList
                >
              </template>
              <template v-if="record.id === 'tab-viewport'" #item="{ value }"
                ><div class="panel-slot-demo">
                  <strong>{{ value }}</strong
                  ><span>由外部导航控制的保活内容视图</span>
                </div></template
              >
              <template
                v-for="slotName in panelPreviewSlots"
                :key="slotName"
                #[slotName]
                ><div class="panel-slot-demo">
                  <strong>{{ slotName }}</strong
                  ><span>{{ panelSlotLabel(slotName) }}</span>
                </div></template
              >
            </component>

            <p
              v-if="isButton && buttonActionFinished"
              class="action-feedback"
              role="status"
            >
              已完成；按钮已恢复可继续操作。
            </p>
            <section
              v-if="hasDisabledState && !isCheckboxMulti"
              class="state-compare"
              aria-label="可用与禁用状态对照"
            >
              <div>
                <span>可操作</span
                ><component
                  :is="previewComponent"
                  v-bind="enrichBind({ ...resolvedProps, loading: false })"
                />
              </div>
              <div>
                <span>条件不满足 · 禁用</span
                ><component
                  :is="previewComponent"
                  v-bind="disabledPreviewBind()"
                />
              </div>
            </section>
          </div>
        </v-theme-provider>
      </article>

      <details class="semantic-details">
        <summary>查看语义与令牌</summary>
        <p>
          只读：这里展示组件固定消费的语义令牌；换肤改主题值，不在 Playground
          改绑。
        </p>
        <ul v-if="tokenBindings.length" class="binding-list">
          <li v-for="[slot, tokenId] in tokenBindings" :key="slot">
            <span>{{ slot }}</span
            ><code>{{ tokenId }}</code
            ><code>{{ bindingResolvedValue(tokenId) ?? "—" }}</code>
          </li>
        </ul>
        <p v-else class="empty">该组件未声明 tokenBindings。</p>
      </details>
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
.playground-stage {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.preview-wrap,
.semantic-details {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
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
  min-height: 160px;
  padding: 20px;
  overflow: hidden;
  background: var(--pb-color-background, #f5f8fc);
  color: var(--pb-color-on-surface, #1f2937);
}
.preview.is-tall {
  min-height: 320px;
}
.preview.is-overlay {
  min-height: 480px;
  overflow: visible;
}
.preview-wrap:has(.is-overlay) {
  overflow: visible;
}
.preview :deep(.v-overlay-container),
.preview :deep(.v-overlay) {
  position: absolute !important;
}
.gallery-matrix {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 12px;
  align-items: start;
}
.gallery-cell {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--pb-color-border, #d7dee8);
  border-radius: 12px;
  background: var(--pb-color-surface, #fff);
  justify-items: center;
  text-align: center;
}
.gallery-cell header {
  color: var(--pb-color-on-surface-muted, #64748b);
  font: var(--pb-typography-caption);
}
.gallery-cell > div {
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
}
.trigger-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.trigger-bar span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.tabbar-demo-viewport,
.panel-slot-demo {
  display: grid;
  min-height: 160px;
  place-content: center;
  gap: var(--pb-spacing-xs, 4px);
  padding: var(--pb-spacing-md, 16px);
  color: var(--pb-color-on-surface-muted, #64748b);
  text-align: center;
  font: var(--pb-typography-caption);
}
.tabbar-demo-viewport strong,
.panel-slot-demo strong {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-subtitle);
}
.checkbox-multi-demo {
  display: grid;
  gap: 4px;
  width: 100%;
}
.filter-results {
  display: grid;
  gap: 4px;
  margin-top: 20px;
}
.filter-results > p {
  margin: 0 0 4px;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
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
.action-feedback {
  margin: 16px 0 0;
  color: var(--pb-color-success);
  font: var(--pb-typography-caption);
}
.state-compare {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: var(--pb-border-hairline);
}
.state-compare > div {
  display: grid;
  gap: 8px;
  min-width: 0;
}
.state-compare > div > span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.semantic-details {
  padding: 0 16px 16px;
}
.semantic-details summary {
  padding: 14px 0;
  cursor: pointer;
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-label);
}
.semantic-details > p {
  margin: 0 0 12px;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.binding-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.binding-list li {
  display: grid;
  grid-template-columns: minmax(90px, 1fr) minmax(150px, 1fr) minmax(
      90px,
      auto
    );
  gap: 8px;
  align-items: center;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  font-size: 0.75rem;
}
.binding-list code {
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
@media (max-width: 700px) {
  .state-compare {
    grid-template-columns: 1fr;
  }
  .binding-list li {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}
</style>
