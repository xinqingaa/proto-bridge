<script setup lang="ts">
import {
  computed,
  toRefs,
  defineAsyncComponent,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
  type Component,
} from "vue";

import { Home, List, User } from "lucide-vue-next";
import DataList from "@/design-system/components/data/DataList.vue";
import ScreenTransition from "@/design-system/components/navigation/ScreenTransition.vue";
import type {
  ScreenTransitionMode,
  ScreenTransitionNavigation,
} from "@/design-system/components/navigation/screenTransition";

import {
  componentViewModules,
  loadComponentContract,
} from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";

import {
  componentScenarios,
  type ComponentScenario,
} from "@/design-system/components/scenarios";

const props = defineProps<{
  componentId: string;
  device: import("./model").PreviewDeviceSession;
  attach: string;
}>();
// Every mounted sample owns its mutable session; no Pinia Playground singleton.
const session = reactive({
  overrides: {} as Record<string, unknown>,
  scenarioId: props.device.demo.scenarioId,
  tabComparisonValues: { adaptive: "", equal: "" } as Record<string, string>,
  triggeredPreviewOpen: props.device.demo.open,
  activeTriggerScenarioId: "",
  triggeredPreviewStep: 0,
  triggeredDetent: "content" as "content" | "medium" | "expanded",
  lastComponentAction: "",
  listRefreshing: false,
  listLoadingMore: false,
  listRowCount: 8,
  listRefreshCount: 0,
  screenTransitionDemo: {
    ios: { screenKey: "home", navigation: "replace" },
    android: { screenKey: "home", navigation: "replace" },
  } as Record<ScreenTransitionMode, ScreenTransitionDemoPane>,
});
Object.assign(
  session,
  JSON.parse(JSON.stringify(props.device.demo.session ?? {})),
);
// Pending requests are local demo timers, not a transferable in-flight operation.
session.listRefreshing = false;
session.listLoadingMore = false;
const {
  tabComparisonValues,
  triggeredPreviewOpen,
  activeTriggerScenarioId,
  triggeredPreviewStep,
  triggeredDetent,
  lastComponentAction,
  listRefreshing,
  listLoadingMore,
  listRowCount,
  listRefreshCount,
} = toRefs(session);
watch(
  session,
  (value) => {
    props.device.demo.session = JSON.parse(JSON.stringify(value));
    props.device.demo.scenarioId = value.scenarioId;
  },
  { deep: true, flush: "sync" },
);
const scenarioId = computed(() => session.scenarioId);
const themeId = computed(() => props.device.selection.mode);
const resolvedProps = computed<Record<string, unknown>>(() => ({
  ...contract.value?.defaultProps,
  ...record.value?.example,
  ...(
    scenarios.value.find((s) => s.id === scenarioId.value) ?? scenarios.value[0]
  )?.props,
  ...session.overrides,
}));
const playground = {
  setOverride(key: string, value: unknown) {
    session.overrides = { ...session.overrides, [key]: value };
  },
};
const record = computed(() =>
  componentRecords.find((item) => item.id === props.componentId),
);
const contract = computed(() =>
  record.value ? loadComponentContract(record.value.contract) : undefined,
);
const states = computed(() => contract.value?.states ?? []);
const scenarios = computed(() => {
  const authored = componentScenarios(props.componentId);
  if (contract.value?.playground?.presentation !== "trigger") return authored;
  return [
    ...authored,
    ...(contract.value.states ?? [])
      .filter((state) => !authored.some((item) => item.id === state.id))
      .map((state) => ({
        id: state.id,
        label: state.label,
        description: state.description ?? "",
        props: state.props,
      })),
  ];
});
const previewStyle = {};
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
const isBleedPreview = computed(() =>
  ["app-bar", "launch-screen"].includes(props.componentId),
);
const tallPreview = computed(() =>
  [
    "action-sheet",
    "launch-screen",
    "month-calendar",
    "bottom-sheet",
    "flow-sheet",
    "data-list",
    "scrollable-data-list",
    "tab-viewport",
    "screen-transition",
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
const isScreenTransitionDemo = computed(
  () => record.value?.id === "screen-transition",
);
const typeScenarioIds: Record<string, string[]> = {
  button: ["primary", "secondary", "outlined"],
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
    "month-calendar",
    "grouped-list",
    "list-cell",
    "launch-screen",
    "duration-picker",
    "segmented-control",
    "mini-bars",
    "heatmap",
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
    isScreenTransitionDemo.value ||
    isFilterBar.value ||
    isScrollableDataList.value,
);

const typeExhibits = computed((): ExhibitItem[] => {
  const ids = typeScenarioIds[props.componentId] ?? [];
  if (ids.length) {
    const examples = ids
      .map((id) => scenarios.value.find((item) => item.id === id))
      .filter((item): item is ComponentScenario => Boolean(item))
      .map((item) => ({
        id: item.id,
        label: item.label,
        props: item.props ?? {},
      }));
    return [
      ...examples,
      ...states.value
        .filter(
          (state) =>
            state.kind === "variant" &&
            !examples.some((item) => item.id === state.id),
        )
        .map((state) => ({
          id: state.id,
          label: state.label,
          props: state.props ?? {},
        })),
    ];
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

function isLoadingState(state: {
  id: string;
  props?: Record<string, unknown>;
}) {
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
  const size = record.value?.controls.find(
    (control) => control.key === "size" && control.control === "select",
  );
  if (size && "options" in size && size.options?.length)
    sections.push({
      id: "size",
      title: "尺寸",
      groups: [
        {
          id: "size",
          title: "",
          scope: "content",
          items: size.options.map((option) => ({
            id: String(option.value),
            label: option.label,
            props: { size: option.value },
          })),
        },
      ],
    });
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
  if (isScreenTransitionDemo.value) return "风格对照";
  if (isTriggerPresentation.value) return "触发演示";
  if (isFilterBar.value) return "筛选演示";
  return "互动演示";
});
const stageDescription = computed(() => {
  if (isGalleryPresentation.value) return "默认与 Contract 状态并置";
  if (isSplitTabPresentation.value) return "自适应与等宽两种稳定布局并置";
  if (isScreenTransitionDemo.value)
    return "在同一设备内对照两种转场，进入与返回保持独立";
  if (isTriggerPresentation.value) return "在手机屏幕里打开、关闭和选择";
  if (isFilterBar.value) return "直接切换筛选项并观察结果";
  return "直接操作组件并观察状态反馈";
});
const previewAttach = props.attach;
const tabModes = [
  { id: "adaptive", label: "自适应", grow: false, hint: "按内容宽度排列" },
  { id: "equal", label: "等宽", grow: true, hint: "平分可用宽度" },
];

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
watch(triggeredPreviewOpen, (value) => {
  props.device.demo.open = value;
});
type ScreenTransitionDemoPage = "home" | "detail";
type ScreenTransitionDemoPane = {
  screenKey: ScreenTransitionDemoPage;
  navigation: ScreenTransitionNavigation;
};
const screenTransitionDemoPanes = [
  {
    mode: "ios" as ScreenTransitionMode,
    label: "iOS 侧滑",
    hint: "新页从右侧进入",
  },
  {
    mode: "android" as ScreenTransitionMode,
    label: "Android 淡入",
    hint: "新页淡入并轻微缩放",
  },
];
const screenTransitionDemo = session.screenTransitionDemo;

function screenTransitionDemoTitle(page: ScreenTransitionDemoPage) {
  return page === "home" ? "今天" : "详情";
}

function playScreenTransitionDemo(
  mode: ScreenTransitionMode,
  direction: "push" | "back",
) {
  const pane = screenTransitionDemo[mode];
  pane.navigation = direction;
  pane.screenKey = direction === "push" ? "detail" : "home";
}
function enrichBind(base: Record<string, unknown>): Record<string, unknown> {
  const next = { ...base };
  next.inspectId ??= `preview.${props.device.id}.${props.componentId}.main`;
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
    inspectId: `preview.${props.device.id}.${props.componentId}.${scope}.${id}`,
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
  next.inspectId = `preview.${props.device.id}.${props.componentId}.trigger`;
  if (props.componentId === "bottom-sheet") next.detent = triggeredDetent.value;
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
    ...session.overrides,
  });
}
function tabComparisonBind(modeId: string, grow: boolean) {
  return enrichBind({
    ...resolvedProps.value,
    modelValue:
      tabComparisonValues.value[modeId] ?? resolvedProps.value.modelValue,
    inspectId: `preview.${props.device.id}.${props.componentId}.${modeId}`,
    grow,
    fill: !isTabbar.value,
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
  return enrichBind({
    ...entry.props,
    inspectId: `preview.${props.device.id}.${props.componentId}.gallery.${entry.id}`,
  });
}
function openTriggeredPreview(scenarioId?: string) {
  const id = scenarioId ?? scenarios.value[0]?.id ?? "";
  if (triggeredPreviewOpen.value && id === activeTriggerScenarioId.value) {
    triggeredPreviewOpen.value = false;
    return;
  }
  activeTriggerScenarioId.value = id;
  const scenario = scenarios.value.find((item) => item.id === id);
  triggeredPreviewStep.value =
    typeof scenario?.props?.step === "number" ? scenario.props.step : 0;
  triggeredDetent.value =
    (scenario?.props?.detent as "content" | "medium" | "expanded") ?? "content";
  lastComponentAction.value = "";
  triggeredPreviewOpen.value = !states.value.some(
    (state) => state.id === id && state.props?.modelValue === false,
  );
}
function onPreviewUpdate(value: unknown) {
  if (isOverlayPreview.value) {
    triggeredPreviewOpen.value = Boolean(value);
    return;
  }
  playground.setOverride("modelValue", value);
}
function onGroupedToggle(event: {
  groupId: string;
  itemId: string;
  value: boolean;
}) {
  const groups = resolvedProps.value.groups as Array<{
    id: string;
    items: Array<{ id: string; modelValue?: boolean }>;
  }>;
  playground.setOverride(
    "groups",
    groups.map((group) =>
      group.id === event.groupId
        ? {
            ...group,
            items: group.items.map((item) =>
              item.id === event.itemId
                ? { ...item, modelValue: event.value }
                : item,
            ),
          }
        : group,
    ),
  );
  lastComponentAction.value = "已更新列表开关";
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

watch(scenarioId, () => {
  triggeredPreviewOpen.value = false;
});
watch(
  [() => props.componentId, scenarioId],
  () => {
    const initialValue = String(resolvedProps.value.modelValue ?? "");
    if (!tabComparisonValues.value.adaptive && !tabComparisonValues.value.equal)
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

function applyState(id: string) {
  session.overrides = {
    ...(states.value.find((state) => state.id === id)?.props ?? {}),
  };
  if (isScreenTransitionDemo.value) {
    const mode = session.overrides.mode === "android" ? "android" : "ios";
    const navigation = session.overrides.navigation;
    screenTransitionDemo[mode] = {
      navigation:
        navigation === "back" || navigation === "push" ? navigation : "replace",
      screenKey: session.overrides.screenKey === "detail" ? "detail" : "home",
    };
  }
  const selected = session.overrides.modelValue;
  if (typeof selected === "string")
    tabComparisonValues.value = { adaptive: selected, equal: selected };
}
</script>
<template>
  <div
    v-if="record && contract"
    class="component-device-sample"
    :data-component-sample="componentId"
  >
    <header class="sample-title">
      <h2>{{ record.label }}</h2>
      <p>{{ record.description }}</p>
    </header>
    <div
      v-if="
        isSplitTabPresentation ||
        isScreenTransitionDemo ||
        isScrollableDataList ||
        isFilterBar
      "
      class="state-actions"
      aria-label="组件状态"
    >
      <button type="button" @click="session.overrides = {}">默认</button>
      <button
        v-for="state in states"
        :key="state.id"
        type="button"
        :data-preview-state="state.id"
        @click="applyState(state.id)"
      >
        {{ state.label }}
      </button>
    </div>
    <div v-if="isSplitTabPresentation" class="phone-row">
      <section
        v-for="mode in tabModes"
        :key="mode.id"
        class="phone-column"
        :data-tab-layout="mode.id"
      >
        <header>
          <strong>{{ mode.label }}</strong
          ><span>{{ mode.hint }}</span>
        </header>
        <div class="tab-screen" :class="{ 'is-tabbar': isTabbar }">
          <div v-if="isTabbar" class="tab-screen-body">
            <strong>{{ tabbarSelectedLabel(mode.id) }}</strong>
            <span>当前目的地</span>
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
                <strong>{{
                  slotName === "overview"
                    ? "概览"
                    : slotName === "activity"
                      ? "活动"
                      : slotName
                }}</strong
                ><span>{{ panelSlotLabel(slotName) }}</span>
              </div></template
            >
          </component>
        </div>
      </section>
    </div>
    <div v-else-if="isScreenTransitionDemo" class="phone-row">
      <section
        v-for="pane in screenTransitionDemoPanes"
        :key="pane.mode"
        class="phone-column"
        :data-transition-mode="pane.mode"
      >
        <header>
          <strong>{{ pane.label }}</strong
          ><span>{{ pane.hint }}</span>
        </header>
        <div class="phone-canvas">
          <div class="in-phone-actions">
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              :disabled="screenTransitionDemo[pane.mode].screenKey === 'detail'"
              @click="playScreenTransitionDemo(pane.mode, 'push')"
              >进入</v-btn
            >
            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              :disabled="screenTransitionDemo[pane.mode].screenKey === 'home'"
              @click="playScreenTransitionDemo(pane.mode, 'back')"
              >返回</v-btn
            >
          </div>
          <div class="phone-stage is-transition">
            <ScreenTransition
              :inspect-id="`preview.${device.id}.transition.${pane.mode}`"
              :mode="pane.mode"
              :navigation="screenTransitionDemo[pane.mode].navigation"
              :screen-key="screenTransitionDemo[pane.mode].screenKey"
            >
              <div class="panel-slot-demo">
                <strong>{{
                  screenTransitionDemoTitle(
                    screenTransitionDemo[pane.mode].screenKey,
                  )
                }}</strong>
                <span>{{ pane.label }}</span>
              </div>
            </ScreenTransition>
          </div>
        </div>
      </section>
    </div>
    <template v-else>
      <div class="phone-canvas">
        <div v-if="isTriggerPresentation" class="in-phone-actions">
          <template v-if="scenarios.length > 1">
            <v-btn
              v-for="(scenario, index) in scenarios"
              :key="scenario.id"
              :data-trigger-scenario="scenario.id"
              :data-preview-state="
                states.some((state) => state.id === scenario.id)
                  ? scenario.id
                  : undefined
              "
              color="primary"
              variant="flat"
              size="small"
              @click="openTriggeredPreview(scenario.id)"
              >{{
                triggeredPreviewOpen && scenario.id === activeTriggerScenarioId
                  ? "关闭"
                  : record.id === "bottom-sheet" && index === 0
                    ? "打开Bottom Sheet"
                    : "显示" + scenario.label
              }}</v-btn
            >
          </template>
          <v-btn
            v-else
            :data-preview-state="states[0]?.id"
            color="primary"
            variant="flat"
            size="small"
            @click="openTriggeredPreview()"
            >{{ triggeredPreviewOpen ? "关闭" : "打开" + record.label }}</v-btn
          >
        </div>
        <div class="phone-stage" data-pb-phone-stage>
          <div
            v-if="isGalleryPresentation"
            class="preview gallery-matrix is-inset"
            :style="previewStyle"
          >
            <section
              v-for="entry in galleryEntries"
              :key="entry.id"
              :data-preview-state="
                entry.id === 'default' ? undefined : entry.id
              "
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
            <component
              :is="previewComponent"
              v-bind="triggerPreviewBind()"
              @update:model-value="onPreviewUpdate"
              @update:step="onPreviewStep"
              @update:detent="triggeredDetent = $event"
              @undo="lastComponentAction = '已撤销；实际数据恢复由业务处理'"
              @select="lastComponentAction = '已选择操作：' + $event"
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
            <p v-if="lastComponentAction" class="screen-note" role="status">
              {{ lastComponentAction }}
            </p>
          </div>

          <div
            v-else
            class="preview"
            :class="{
              'is-tall': tallPreview,
              'is-bleed': isBleedPreview,
              'is-inset': !isBleedPreview,
            }"
            data-pb-scenario-preview
            :style="previewStyle"
          >
            <template v-if="isFilterBar">
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
                  <DataList
                    :inspect-id="`preview.${device.id}.${componentId}.rows`"
                    surface="default"
                    rounded="md"
                    divided
                  >
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
                @update:month="playground.setOverride('month', $event)"
                @start="lastComponentAction = '已触发开始；路由由业务决定'"
                @select="lastComponentAction = '已选择列表项'"
                @toggle="onGroupedToggle"
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
              v-if="lastComponentAction && !isOverlayPreview"
              class="screen-note"
              role="status"
            >
              {{ lastComponentAction }}
            </p>
            <p
              v-if="isButton && buttonActionFinished"
              class="action-feedback"
              role="status"
            >
              已完成；按钮已恢复可继续操作。
            </p>
          </div>
        </div>
      </div>
    </template>
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
          <div class="exhibit-row" :class="{ 'is-wide': isWideExhibit }">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="exhibit-item"
              :data-preview-state="
                section.id === 'state' ||
                states.some((state) => state.id === item.id)
                  ? item.id
                  : undefined
              "
              :data-exhibit="`${section.id === 'type' ? 'type' : section.id === 'size' ? 'size' : 'state'}.${item.id}`"
            >
              <span v-if="!group.title || item.label !== group.title">{{
                item.label
              }}</span>
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
                <template v-if="record.id === 'tab-viewport'" #item="{ value }">
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
.preview-wrap {
  overflow: visible;
  padding-bottom: 8px;
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
  min-height: 100%;
  overflow: hidden;
}
.stage-frame {
  display: flex;
  justify-content: center;
}
.phone-fit {
  position: relative;
  margin: 0 auto 28px;
}
.phone-fit > .playground-phone {
  position: absolute;
  top: 12px;
  left: 12px;
  display: block;
  transform: scale(0.72);
  transform-origin: top left;
}
.playground-phone :deep(.phone-body) > .phone-canvas,
.playground-phone :deep(.phone-body) > .tab-screen {
  height: 100%;
  min-height: 0;
}
.phone-canvas {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.in-phone-actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 0;
}
.phone-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.phone-stage > .preview {
  height: 100%;
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;
}
.preview.is-inset {
  padding: 16px;
}
.preview.is-bleed,
.preview.is-overlay {
  padding: 0;
  overflow: hidden;
}
.screen-note {
  margin: 12px 16px;
  color: var(--pb-color-on-surface, #1f2937);
  font: var(--pb-typography-content);
}
.phone-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 28px;
}
.phone-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.phone-column > header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
}
.phone-column > header strong {
  color: rgba(var(--v-theme-on-surface), 0.92);
  font-size: 0.875rem;
}
.tab-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.tab-screen-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-height: 0;
  padding: 24px 20px;
  color: var(--pb-color-on-surface-muted, #64748b);
  text-align: center;
}
.tab-screen-body strong {
  color: var(--pb-color-on-surface, #1f2937);
  font: var(--pb-typography-title);
}
.tab-screen > :deep(.pb-tabs) {
  flex: 1;
  min-height: 0;
  padding: 16px;
  box-sizing: border-box;
}
.tab-screen.is-tabbar > :deep(.pb-tabbar-shell) {
  flex: none;
  width: 100%;
}
.phone-stage.is-transition {
  display: flex;
  flex-direction: column;
}
.phone-stage.is-transition > :deep(.pb-screen-transition) {
  flex: 1;
  min-height: 0;
  height: 100%;
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
  border-radius: var(--pb-radius-surface, 16px);
  background: var(--pb-color-surface, #fff);
}
.route-transition-demo-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 24px;
  overflow-x: auto;
}
.route-transition-demo-row > .tab-comparison {
  margin-bottom: 0;
  flex: none;
}
.route-transition-demo-actions {
  display: flex;
  gap: 8px;
}
.route-transition-demo-frame {
  flex: none;
  overflow: hidden;
  border: var(--pb-border-hairline, 1px solid #d7dee8);
  border-radius: var(--pb-radius-surface, 16px);
  background: var(--pb-color-surface, #fff);
}
.route-transition-demo-frame :deep(.panel-slot-demo) {
  min-height: 100%;
  height: 100%;
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
  border-radius: var(--pb-radius-surface);
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
  margin-top: calc(var(--pb-spacing-lg) + var(--pb-spacing-sm));
  padding-top: var(--pb-spacing-lg);
  border-top: var(--pb-border-hairline);
}
.exhibit-section {
  display: flex;
  flex-direction: column;
  gap: var(--pb-spacing-md);
}
.exhibit-section h2 {
  margin: var(--pb-layout-zero);
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
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-surface-recessed);
}
.exhibit-subgroup h3 {
  margin: var(--pb-layout-zero);
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
  padding-bottom: var(--pb-layout-zero);
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
  word-break: normal;
  overflow-wrap: break-word;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.empty {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.75rem;
}

.component-device-sample {
  color: var(--pb-color-on-background);
  font: var(--pb-typography-content);
}
.sample-title {
  padding: var(--pb-spacing-md);
}
.sample-title h2 {
  margin: 0;
  font: var(--pb-typography-title);
}
.sample-title p {
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.phone-canvas {
  height: auto;
}
.phone-stage,
.phone-stage > .preview {
  height: auto;
  min-height: 0;
  overflow: visible;
}
.phone-stage {
  flex: none;
}
.phone-row {
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 20px;
  padding: 16px;
}
.phone-column {
  width: 100%;
  align-items: stretch;
}
.phone-column > .phone-canvas {
  height: 340px;
}
.phone-column > .tab-screen {
  height: 340px;
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-surface);
  overflow: hidden;
}
.phone-column .phone-stage.is-transition {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.gallery-matrix {
  display: flex;
  flex-wrap: wrap;
}
.gallery-cell {
  display: flex;
  flex-direction: column;
  flex: 1 1 120px;
}
.exhibit-stack {
  padding: 16px;
}
.exhibit-row {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.exhibit-item {
  min-width: 0;
  width: 100%;
}
.exhibit-row.is-wide {
  width: 100%;
}
.state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 12px;
}
.state-actions button {
  padding: 6px 10px;
  border: var(--pb-border-hairline);
  border-radius: var(--pb-radius-control);
  background: var(--pb-color-surface);
}
.state-actions button:focus-visible {
  outline: var(--pb-border-focus);
}
.scrollable-list-demo {
  height: 540px;
}
</style>
