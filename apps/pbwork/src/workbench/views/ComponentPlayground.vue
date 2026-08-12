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
import DataList from "@/design-system/components/data/DataList.vue";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import WorkbenchStatChip from "@/workbench/ui/WorkbenchStatChip.vue";
import {
  componentViewModules,
  loadComponentContract,
  loadTokens,
} from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";
import {
  usePlaygroundStore,
  type PlaygroundThemeId,
} from "@/app/stores/playground";
import {
  resolveThemeTokens,
  tokensToCssVars,
  tokenValueToCssValue,
  normalizeTokenCssVarName,
} from "@/design-system/resolveThemeTokens";
import { resolveLiveTokenBindings } from "@/design-system/resolveLiveTokenBindings";
import {
  componentScenarios,
  type ComponentScenario,
} from "@/design-system/components/scenarios";
import { storeToRefs } from "pinia";

const props = defineProps<{ componentId: string }>();
const playground = usePlaygroundStore();
const { scenarioId, themeId, resolvedProps } = storeToRefs(playground);

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
    "confirm",
    "toast",
    "loading",
    "tabbar",
  ].includes(props.componentId),
);
const isOverlayPreview = computed(() => isTriggerPresentation.value);
const isButton = computed(() => record.value?.id === "button");
const isTabbar = computed(() => record.value?.id === "tabbar");
const isFilterBar = computed(() => record.value?.id === "filter-bar");
const isScrollableDataList = computed(
  () => record.value?.id === "scrollable-data-list",
);
const isSplitTabPresentation = computed(() =>
  ["tabbar", "primary-tabs", "secondary-tabs"].includes(record.value?.id ?? ""),
);
const typeScenarioIds: Record<string, string[]> = {
  button: ["submit", "secondary", "primary-accent", "outlined"],
  chip: ["status", "warning"],
  "text-field": ["empty", "contact"],
  textarea: ["note", "description"],
};
const isWideExhibit = computed(() =>
  [
    "app-bar",
    "card",
    "data-list",
    "divider",
    "tab-viewport",
    "text-field",
    "textarea",
    "search-bar",
    "menu",
  ].includes(record.value?.id ?? ""),
);

type ExhibitItem = {
  id: string;
  label: string;
  props: Record<string, unknown>;
};

const hidesStateExhibits = computed(
  () =>
    isGalleryPresentation.value ||
    isTriggerPresentation.value ||
    isSplitTabPresentation.value ||
    isFilterBar.value ||
    isScrollableDataList.value,
);

const typeExhibits = computed((): ExhibitItem[] => {
  const ids = typeScenarioIds[props.componentId] ?? [];
  if (ids.length) {
    return ids
      .map((id) => scenarios.value.find((item) => item.id === id))
      .filter((item): item is ComponentScenario => Boolean(item))
      .map((item) => ({
        id: item.id,
        label: item.label,
        props: item.props ?? {},
      }));
  }
  if (hidesStateExhibits.value) return [];
  return states.value
    .filter((state) => state.kind === "variant")
    .map((state) => ({
      id: state.id,
      label: state.label,
      props: state.props ?? {},
    }));
});

function isLoadingState(state: { id: string; props?: Record<string, unknown> }) {
  return (
    state.id === "loading" ||
    state.props?.loading === true ||
    state.props?.refreshing === true ||
    state.props?.loadingMore === true
  );
}

function isDisabledState(state: {
  id: string;
  props?: Record<string, unknown>;
}) {
  return state.id === "disabled" || state.props?.disabled === true;
}

const interactionStates = computed(() =>
  hidesStateExhibits.value
    ? []
    : states.value.filter((state) => state.kind !== "variant"),
);

const loadingExhibits = computed((): ExhibitItem[] =>
  interactionStates.value
    .filter((state) => state.kind === "interaction" && isLoadingState(state))
    .map((state) => ({
      id: state.id,
      label: state.label,
      props: state.props ?? {},
    })),
);

const disabledExhibits = computed((): ExhibitItem[] =>
  interactionStates.value
    .filter((state) => state.kind === "interaction" && isDisabledState(state))
    .map((state) => ({
      id: state.id,
      label: state.label,
      props: state.props ?? {},
    })),
);

const otherStateExhibits = computed((): ExhibitItem[] =>
  interactionStates.value
    .filter((state) => {
      if (state.kind === "interaction" && isLoadingState(state)) return false;
      if (state.kind === "interaction" && isDisabledState(state)) return false;
      return true;
    })
    .map((state) => ({
      id: state.id,
      label: state.label,
      props: state.props ?? {},
    })),
);

const hasStateGroups = computed(
  () =>
    loadingExhibits.value.length > 0 ||
    disabledExhibits.value.length > 0 ||
    otherStateExhibits.value.length > 0,
);

type ExhibitGroup = {
  id: string;
  title: string;
  scope: "type" | "state" | "loading" | "disabled" | "content";
  items: ExhibitItem[];
};

const exhibitSections = computed(() => {
  const sections: Array<{
    id: string;
    title: string;
    groups: ExhibitGroup[];
  }> = [];
  if (typeExhibits.value.length) {
    sections.push({
      id: "type",
      title: "类型",
      groups: [
        {
          id: "type",
          title: "",
          scope: "type",
          items: typeExhibits.value,
        },
      ],
    });
  }
  if (hasStateGroups.value) {
    const groups: ExhibitGroup[] = [];
    if (loadingExhibits.value.length) {
      groups.push({
        id: "loading",
        title: "加载",
        scope: "loading",
        items: loadingExhibits.value,
      });
    }
    if (disabledExhibits.value.length) {
      groups.push({
        id: "disabled",
        title: "禁用",
        scope: "disabled",
        items: disabledExhibits.value,
      });
    }
    if (otherStateExhibits.value.length) {
      groups.push({
        id: "other",
        title: groups.length ? "其他" : "",
        scope: "state",
        items: otherStateExhibits.value,
      });
    }
    sections.push({ id: "state", title: "状态", groups });
  }
  return sections;
});

const hasExhibits = computed(() => exhibitSections.value.length > 0);
const stageTitle = computed(() => {
  if (isGalleryPresentation.value) return "状态矩阵";
  if (isSplitTabPresentation.value) return "布局对照";
  if (isTriggerPresentation.value) return "触发演示";
  if (isFilterBar.value) return "筛选演示";
  return "互动演示";
});
const stageDescription = computed(() => {
  if (isGalleryPresentation.value) return "默认与 Contract 状态并置";
  if (isSplitTabPresentation.value) return "自适应与等宽两种稳定布局并置";
  if (isTriggerPresentation.value) return "通过明确操作观察组件打开与关闭";
  if (isFilterBar.value) return "直接切换筛选项并观察结果";
  return "直接操作组件并观察状态反馈";
});
const previewAttach = "[data-pb-scenario-preview]";

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

const tabComparisonValues = ref<Record<string, string>>({
  adaptive: "",
  equal: "",
});

const playgroundNavIcons = [Home, List, User];
const triggeredPreviewOpen = ref(false);
const activeTriggerScenarioId = ref("");
const triggeredPreviewStep = ref(0);
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
    modelValue: triggeredPreviewOpen.value,
  };
}

const buttonActionBusy = ref(false);
const buttonActionFinished = ref(false);
let buttonActionTimer: ReturnType<typeof setTimeout> | undefined;
const listRefreshing = ref(false);
const listLoadingMore = ref(false);
const listRowCount = ref(8);
const listRefreshCount = ref(0);
let listActionTimer: ReturnType<typeof setTimeout> | undefined;

const listRows = computed(() =>
  Array.from({ length: listRowCount.value }, (_, index) => ({
    id: index + 1,
    title: `业务记录 ${String(index + 1).padStart(2, "0")}`,
    detail:
      index === 0 && listRefreshCount.value > 0
        ? `刚刚完成第 ${listRefreshCount.value} 次刷新`
        : index % 2 === 0
          ? "包含自定义摘要与状态"
          : "行结构由业务插槽提供",
    state: index % 3 === 0 ? "待处理" : "已同步",
  })),
);

function previewBind() {
  const next = { ...resolvedProps.value };
  if (isButton.value && buttonActionBusy.value) next.loading = true;
  return enrichBind(next);
}
function exhibitBind(
  source: Record<string, unknown> | undefined,
  scope: "type" | "state" | "loading" | "disabled" | "content",
  id: string,
) {
  const next: Record<string, unknown> = {
    ...resolvedProps.value,
    ...(source ?? {}),
    inspectId: `ds.${props.componentId}.${scope}.${id}`,
  };
  if (props.componentId === "button" && scope === "type") next.block = false;
  return enrichBind(next);
}
function triggerPreviewBind() {
  const activeScenario =
    scenarios.value.find((item) => item.id === activeTriggerScenarioId.value) ??
    scenarios.value[0];
  const next: Record<string, unknown> = {
    ...(contract.value?.defaultProps ?? {}),
    ...(activeScenario?.props ?? {}),
  };
  if (props.componentId === "flow-sheet")
    next.step = triggeredPreviewStep.value;
  return enrichBind(next);
}
function scrollablePreviewBind() {
  return enrichBind({
    ...resolvedProps.value,
    pullRefresh: { enabled: true, mouse: true },
    loadMore: { enabled: true, manualFallback: true },
    dragScroll: { enabled: true, mouse: true, momentum: true },
    refreshing: listRefreshing.value,
    loadingMore: listLoadingMore.value,
    hasMore: listRowCount.value < 12,
  });
}
function tabComparisonBind(modeId: string, grow: boolean) {
  return enrichBind({
    ...resolvedProps.value,
    modelValue:
      tabComparisonValues.value[modeId] ?? resolvedProps.value.modelValue,
    grow,
    fill: false,
  });
}
function onTabComparisonUpdate(modeId: string, value: unknown) {
  if (typeof value !== "string") return;
  tabComparisonValues.value = {
    ...tabComparisonValues.value,
    [modeId]: value,
  };
}
function galleryBind(entry: GalleryEntry) {
  return enrichBind({ ...entry.props });
}
function openTriggeredPreview(scenarioId?: string) {
  const id = scenarioId ?? scenarios.value[0]?.id ?? "";
  activeTriggerScenarioId.value = id;
  const scenario = scenarios.value.find((item) => item.id === id);
  triggeredPreviewStep.value =
    typeof scenario?.props?.step === "number" ? scenario.props.step : 0;
  triggeredPreviewOpen.value = true;
}
function onPreviewUpdate(value: unknown) {
  if (isOverlayPreview.value) {
    triggeredPreviewOpen.value = Boolean(value);
    return;
  }
  playground.setOverride("modelValue", value);
}
function onPreviewStep(value: unknown) {
  if (isOverlayPreview.value && props.componentId === "flow-sheet") {
    if (typeof value === "number") triggeredPreviewStep.value = value;
    return;
  }
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

function onListRefresh() {
  if (listRefreshing.value || listLoadingMore.value) return;
  listRefreshing.value = true;
  if (listActionTimer) clearTimeout(listActionTimer);
  listActionTimer = setTimeout(() => {
    listRefreshing.value = false;
    listRefreshCount.value += 1;
  }, 700);
}

function onListLoadMore() {
  if (listRefreshing.value || listLoadingMore.value || listRowCount.value >= 12)
    return;
  listLoadingMore.value = true;
  if (listActionTimer) clearTimeout(listActionTimer);
  listActionTimer = setTimeout(() => {
    listRowCount.value = Math.min(12, listRowCount.value + 2);
    listLoadingMore.value = false;
  }, 700);
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

function tabbarSelectedLabel(modeId: string) {
  if (!isTabbar.value) return "";
  const items = tabComparisonBind(modeId, modeId === "equal").items;
  if (!Array.isArray(items)) return "当前目的地";
  const selected = items.find(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { value?: string }).value === tabComparisonValues.value[modeId],
  ) as { label?: string } | undefined;
  return selected?.label ?? "当前目的地";
}
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
    if (listActionTimer) clearTimeout(listActionTimer);
    buttonActionBusy.value = false;
    buttonActionFinished.value = false;
    triggeredPreviewOpen.value = false;
    activeTriggerScenarioId.value = "";
    triggeredPreviewStep.value = 0;
    listRefreshing.value = false;
    listLoadingMore.value = false;
    listRowCount.value = 8;
    listRefreshCount.value = 0;
    playground.open(id);
  },
  { immediate: true },
);
watch(scenarioId, () => {
  triggeredPreviewOpen.value = false;
});
watch(
  [() => props.componentId, scenarioId],
  () => {
    const initialValue = String(resolvedProps.value.modelValue ?? "");
    tabComparisonValues.value = {
      adaptive: initialValue,
      equal: initialValue,
    };
  },
  { immediate: true, flush: "post" },
);
onBeforeUnmount(() => {
  if (buttonActionTimer) clearTimeout(buttonActionTimer);
  if (listActionTimer) clearTimeout(listActionTimer);
});

function setPreviewTheme(value: unknown) {
  if (value === "light" || value === "dark") {
    playground.setTheme(value as PlaygroundThemeId);
  }
}
function bindingResolvedValue(tokenId: string) {
  const value = resolvedPreviewTokens.value[tokenId];
  if (value === undefined) return "—";
  return tokenValueToCssValue(tokenId, value);
}

const tokenCategoryById = computed(() => {
  const map = new Map<string, string>();
  for (const token of loadTokens()) {
    map.set(token.id, token.category);
  }
  return map;
});

const categoryEyebrow: Record<string, string> = {
  action: "操作组件",
  input: "输入组件",
  display: "展示组件",
  navigation: "导航组件",
  data: "数据组件",
  feedback: "反馈组件",
};
</script>

<template>
  <ResourcePageShell
    v-if="record && contract"
    :eyebrow="categoryEyebrow[record.category] ?? record.category"
    :title="record.label"
    :description="record.description"
  >
    <template #stats>
      <WorkbenchStatChip :value="states.length" label="个状态" />
      <WorkbenchStatChip :value="presentationLabel" label="展示" />
      <WorkbenchStatChip :value="tokenBindings.length" label="个令牌绑定" />
    </template>

    <template #toolbar>
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
            <strong>{{ stageTitle }}</strong>
            <span>{{ stageDescription }}</span>
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
              <template v-if="record.id === 'toast'">
                <v-btn
                  v-for="scenario in scenarios"
                  :key="scenario.id"
                  color="primary"
                  variant="flat"
                  size="small"
                  @click="openTriggeredPreview(scenario.id)"
                  >显示{{ scenario.label }}</v-btn
                >
              </template>
              <v-btn
                v-else
                color="primary"
                variant="flat"
                size="small"
                @click="openTriggeredPreview()"
                >打开{{ record.label }}</v-btn
              >
              <span>关闭后可再次打开</span>
            </div>
            <component
              :is="previewComponent"
              v-bind="triggerPreviewBind()"
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
            <template v-if="isSplitTabPresentation">
              <section
                v-for="mode in [
                  { id: 'adaptive', label: '自适应', grow: false },
                  { id: 'equal', label: '等宽', grow: true },
                ]"
                :key="mode.id"
                class="tab-comparison"
                :data-tab-layout="mode.id"
              >
                <header>
                  <strong>{{ mode.label }}</strong>
                  <span>{{
                    mode.grow ? "各项平分可用宽度" : "各项按内容宽度排列"
                  }}</span>
                </header>
                <div class="tab-comparison-frame">
                  <div v-if="isTabbar" class="tabbar-demo-viewport">
                    <strong>{{ tabbarSelectedLabel(mode.id) }}</strong>
                    <span>根目的地视图区；导航本身不拥有横滑手势。</span>
                  </div>
                  <component
                    :is="previewComponent"
                    v-bind="tabComparisonBind(mode.id, mode.grow)"
                    @update:model-value="onTabComparisonUpdate(mode.id, $event)"
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
                </div>
              </section>
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

            <div v-else-if="isScrollableDataList" class="scrollable-list-demo">
              <div class="scrollable-list-demo-toolbar">
                <div>
                  <strong>桌面端交互辅助</strong>
                  <span>也可在列表内鼠标下拉、拖拽滚动或加载更多</span>
                </div>
                <div class="scrollable-list-demo-actions">
                  <v-btn
                    color="primary"
                    variant="tonal"
                    size="small"
                    :loading="listRefreshing"
                    :disabled="listLoadingMore"
                    @click="onListRefresh"
                    >刷新</v-btn
                  >
                  <v-btn
                    color="primary"
                    variant="tonal"
                    size="small"
                    :loading="listLoadingMore"
                    :disabled="listRefreshing || listRowCount >= 12"
                    @click="onListLoadMore"
                    >加载更多</v-btn
                  >
                </div>
              </div>
              <div class="scrollable-list-demo-viewport">
                <component
                  :is="previewComponent"
                  v-bind="scrollablePreviewBind()"
                  @refresh="onListRefresh"
                  @load-more="onListLoadMore"
                >
                  <DataList surface="default" rounded="md" divided>
                    <div
                      v-for="row in listRows"
                      :key="row.id"
                      role="listitem"
                      class="list-slot-demo is-record"
                    >
                      <div>
                        <strong>{{ row.title }}</strong>
                        <span>{{ row.detail }}</span>
                      </div>
                      <span class="list-state">{{ row.state }}</span>
                    </div>
                  </DataList>
                </component>
              </div>
            </div>

            <div v-else data-primary-preview>
              <component
                :is="previewComponent"
                v-bind="previewBind()"
                v-on="isButton ? { click: onPreviewClick } : {}"
                @update:model-value="onPreviewUpdate"
                @update:step="onPreviewStep"
              >
                <template v-if="record.id === 'card'">
                  <div class="card-slot-demo">
                    <strong>外部内容</strong>
                    <span>Card 只提供 surface；内容由调用方定义。</span>
                  </div>
                </template>
                <template v-else-if="record.id === 'data-list'">
                  <div role="listitem" class="list-slot-demo is-heading">
                    <strong>仅标题行</strong>
                  </div>
                  <div role="listitem" class="list-slot-demo is-record">
                    <div>
                      <strong>双行业务记录</strong>
                      <span>副标题、状态与密度均由调用方决定</span>
                    </div>
                    <span class="list-state">进行中</span>
                  </div>
                  <div role="listitem" class="list-slot-demo is-metric">
                    <span>自定义指标</span>
                    <strong>86%</strong>
                  </div>
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
            </div>

            <p
              v-if="isButton && buttonActionFinished"
              class="action-feedback"
              role="status"
            >
              已完成；按钮已恢复可继续操作。
            </p>

            <section v-if="hasExhibits" class="exhibit-stack">
              <div
                v-for="section in exhibitSections"
                :key="section.id"
                class="exhibit-section"
              >
                <h2>{{ section.title }}</h2>
                <div
                  v-for="group in section.groups"
                  :key="group.id"
                  class="exhibit-subgroup"
                  :class="{ 'has-title': Boolean(group.title) }"
                >
                  <h3 v-if="group.title">{{ group.title }}</h3>
                  <div
                    class="exhibit-row"
                    :class="{ 'is-wide': isWideExhibit }"
                  >
                    <div
                      v-for="item in group.items"
                      :key="item.id"
                      class="exhibit-item"
                      :data-exhibit="`${section.id === 'type' ? 'type' : 'state'}.${item.id}`"
                    >
                      <span
                        v-if="!group.title || item.label !== group.title"
                        >{{ item.label }}</span
                      >
                      <component
                        :is="previewComponent"
                        v-bind="exhibitBind(item.props, group.scope, item.id)"
                      >
                        <template v-if="record.id === 'card'">
                          <div class="card-slot-demo">
                            <strong>外部内容</strong>
                            <span>Card 只提供 surface；内容由调用方定义。</span>
                          </div>
                        </template>
                        <template v-else-if="record.id === 'data-list'">
                          <div role="listitem" class="list-slot-demo is-heading">
                            <strong>仅标题行</strong>
                          </div>
                          <div role="listitem" class="list-slot-demo is-record">
                            <div>
                              <strong>双行业务记录</strong>
                              <span>副标题、状态与密度由调用方决定</span>
                            </div>
                            <span class="list-state">进行中</span>
                          </div>
                        </template>
                        <template
                          v-if="record.id === 'tab-viewport'"
                          #item="{ value }"
                        >
                          <div class="panel-slot-demo">
                            <strong>{{ value }}</strong>
                            <span>由外部导航控制的保活内容视图</span>
                          </div>
                        </template>
                      </component>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </v-theme-provider>
      </article>

      <section class="token-bindings">
        <header>
          <strong>语义与令牌</strong>
          <span
            >只读：组件固定消费的语义令牌；换肤改主题值，不在 Playground
            改绑。</span
          >
        </header>
        <table v-if="tokenBindings.length" class="binding-table">
          <thead>
            <tr>
              <th>Slot</th>
              <th>Token</th>
              <th>CSS 值</th>
              <th>CSS 变量</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="[slot, tokenId] in tokenBindings" :key="slot">
              <td>{{ slot }}</td>
              <td><code>{{ tokenId }}</code></td>
              <td><code>{{ bindingResolvedValue(tokenId) }}</code></td>
              <td><code>{{ normalizeTokenCssVarName(tokenId) }}</code></td>
              <td>{{ tokenCategoryById.get(tokenId) ?? "—" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">该组件未声明 tokenBindings。</p>
      </section>
    </div>
  </ResourcePageShell>
  <v-alert v-else type="error" variant="tonal"
    >未知组件：{{ componentId }}</v-alert
  >
</template>

<style scoped>
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
.token-bindings {
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
  flex-wrap: wrap;
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
.tab-comparison {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.tab-comparison:last-child {
  margin-bottom: 0;
}
.tab-comparison > header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: var(--pb-color-on-surface-muted, #64748b);
  font: var(--pb-typography-caption);
}
.tab-comparison > header strong {
  color: var(--pb-color-on-surface, #1f2937);
  font: var(--pb-typography-label);
}
.tab-comparison-frame {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  padding: var(--pb-spacing-md, 16px);
  overflow: hidden;
  border: var(--pb-border-hairline, 1px solid #d7dee8);
  border-radius: var(--pb-radius-lg, 16px);
  background: var(--pb-color-surface, #fff);
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
.list-slot-demo.is-record > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.list-slot-demo.is-heading {
  justify-content: flex-start;
}
.list-slot-demo.is-metric strong {
  color: var(--pb-color-primary);
  font: var(--pb-typography-title);
}
.list-slot-demo .list-state {
  flex: none;
  color: var(--pb-color-primary);
}
.scrollable-list-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.scrollable-list-demo-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.scrollable-list-demo-toolbar > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.scrollable-list-demo-toolbar > .scrollable-list-demo-actions {
  flex: none;
  flex-direction: row;
  gap: 8px;
}
.scrollable-list-demo-toolbar strong {
  font: var(--pb-typography-label);
}
.scrollable-list-demo-toolbar span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.scrollable-list-demo-viewport {
  height: 320px;
  overflow: hidden;
  border-radius: var(--pb-radius-lg);
}
.action-feedback {
  margin: 16px 0 0;
  color: var(--pb-color-success);
  font: var(--pb-typography-caption);
}
.card-slot-demo {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-xs);
  padding: var(--pb-spacing-md);
  color: var(--pb-color-on-surface);
}
.card-slot-demo strong {
  font: var(--pb-typography-subtitle);
}
.card-slot-demo span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.exhibit-stack {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-lg);
  margin-top: var(--pb-spacing-xl);
  padding-top: var(--pb-spacing-lg);
  border-top: var(--pb-border-hairline);
}
.exhibit-section {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-md);
}
.exhibit-section h2 {
  margin: var(--pb-spacing-none);
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-label);
}
.exhibit-subgroup {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-sm);
}
.exhibit-subgroup.has-title {
  padding: var(--pb-spacing-sm);
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-md);
  background: var(--pb-color-surface-recessed);
}
.exhibit-subgroup h3 {
  margin: var(--pb-spacing-none);
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption-strong);
}
.exhibit-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--pb-spacing-lg);
}
.exhibit-item {
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--pb-spacing-xs);
  min-width: 0;
}
.exhibit-item > span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.exhibit-row.is-wide {
  flex-direction: column;
  align-items: stretch;
  gap: var(--pb-spacing-md);
}
.exhibit-row.is-wide .exhibit-item {
  width: var(--pb-layout-fill);
  padding-bottom: var(--pb-spacing-sm);
  border-bottom: var(--pb-border-hairline);
}
.exhibit-row.is-wide .exhibit-item:last-child {
  padding-bottom: var(--pb-spacing-none);
  border-bottom: none;
}
.exhibit-row.is-wide .exhibit-item > :deep(*) {
  width: var(--pb-layout-fill);
}
.token-bindings {
  padding: 14px 16px 16px;
}
.token-bindings header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.token-bindings header strong {
  color: var(--pb-color-on-surface);
  font: var(--pb-typography-label);
}
.token-bindings header span {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.binding-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
}
.binding-table th,
.binding-table td {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  text-align: left;
  vertical-align: top;
}
.binding-table th {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-weight: 600;
}
.binding-table code {
  word-break: break-word;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.empty {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}
</style>
