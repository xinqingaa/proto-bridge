<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  Archive,
  BadgeCheck,
  Boxes,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Component as ComponentIcon,
  Info,
  Layers3,
  LayoutGrid,
  MessageSquareText,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Paintbrush,
  Search,
  Settings,
  Shapes,
  Sparkles,
  SunMoon,
  SwatchBook,
} from "lucide-vue-next";
import { RouterLink, RouterView, useRoute } from "vue-router";
import {
  DEFAULT_RESOURCE_WIDTH,
  useWorkbenchStore,
} from "@/app/stores/workbench";
import { useSelectionStore } from "@/app/stores/selection";
import {
  buildPrototypeTree,
  getSecondaryNavigation,
  groupSecondaryNavigation,
  isWorkbenchSectionId,
  parsePrototypeLifecycle,
  primaryNavigation,
  searchableNavigation,
} from "@/workbench/navigation";
import { loadPrototypes } from "@/design-system/loaders";
import InspectorPanel from "@/workbench/inspector/InspectorPanel.vue";

/** Keep in sync with `.resource-panel` / `.inspector-panel` width transition. */
const PANEL_SLIDE_MS = 320;
const PROTOTYPE_TREE_EXPAND_KEY = "pbwork.workbench.prototype-tree.v1";

function loadPrototypeTreeExpanded(): string[] {
  try {
    const raw = window.localStorage.getItem(PROTOTYPE_TREE_EXPAND_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

const route = useRoute();
const workbench = useWorkbenchStore();
const selection = useSelectionStore();
const searchOpen = ref(false);
const searchQuery = ref("");
const resizingInspector = ref(false);

/** Inner chrome lags width on collapse so overflow clipping reads as a slide. */
const resourceContentExpanded = ref(workbench.resourcePanelOpen);
const inspectorContentExpanded = ref(workbench.inspectorOpen);

let resourceSlideTimer: ReturnType<typeof setTimeout> | undefined;
let inspectorSlideTimer: ReturnType<typeof setTimeout> | undefined;

const sectionId = computed(() =>
  isWorkbenchSectionId(route.meta.sectionId)
    ? route.meta.sectionId
    : "foundations",
);
const section = computed(() =>
  primaryNavigation.find((item) => item.id === sectionId.value)!,
);
const secondaryItems = computed(() => getSecondaryNavigation(sectionId.value));
const secondaryGroups = computed(() =>
  groupSecondaryNavigation(secondaryItems.value),
);
const selectedSecondaryId = computed(() => {
  const match = secondaryItems.value.find((item) => item.to === route.path);
  if (match) return match.id;
  if (sectionId.value === "foundations" && route.path.includes("/tokens/")) {
    const category = route.path.split("/").pop();
    return `token-${category}`;
  }
  if (sectionId.value === "foundations" && route.path.includes("/themes/")) {
    return `theme-${route.params.themeId}`;
  }
  if (sectionId.value === "components") {
    return String(route.params.componentId ?? "");
  }
  if (sectionId.value === "prototypes") {
    const lifecycle = parsePrototypeLifecycle(
      String(route.params.lifecycle ?? ""),
    );
    if (lifecycle) return `lifecycle-${lifecycle}`;
    const prototypeId = route.params.prototypeId;
    if (typeof prototypeId === "string") {
      const prototype = loadPrototypes().find((item) => item.id === prototypeId);
      if (prototype) return `lifecycle-${prototype.lifecycle}`;
    }
  }
  return "";
});
const activePrototypeLifecycle = computed(() => {
  const fromParam = parsePrototypeLifecycle(
    String(route.params.lifecycle ?? ""),
  );
  if (fromParam) return fromParam;
  const prototypeId = route.params.prototypeId;
  if (typeof prototypeId === "string") {
    const prototype = loadPrototypes().find((item) => item.id === prototypeId);
    if (prototype) return prototype.lifecycle;
  }
  return "all" as const;
});
const prototypeTree = computed(() =>
  sectionId.value === "prototypes"
    ? buildPrototypeTree(activePrototypeLifecycle.value)
    : [],
);
const selectedPrototypeId = computed(() =>
  typeof route.params.prototypeId === "string" ? route.params.prototypeId : "",
);
const selectedScreenSlug = computed(() =>
  typeof route.params.screenSlug === "string" ? route.params.screenSlug : "",
);
const selectedVariantId = computed(() =>
  typeof route.query.variant === "string" ? route.query.variant : "",
);
const lifecycleFilters = computed(() =>
  getSecondaryNavigation("prototypes").filter((item) =>
    item.id.startsWith("lifecycle-"),
  ),
);

const expandedTreeIds = ref<string[]>(loadPrototypeTreeExpanded());

function isTreeExpanded(id: string): boolean {
  return expandedTreeIds.value.includes(id);
}

function persistTreeExpanded() {
  window.localStorage.setItem(
    PROTOTYPE_TREE_EXPAND_KEY,
    JSON.stringify(expandedTreeIds.value),
  );
}

function expandTreeNode(id: string) {
  if (expandedTreeIds.value.includes(id)) return;
  expandedTreeIds.value = [...expandedTreeIds.value, id];
  persistTreeExpanded();
}

function toggleTreeNode(id: string) {
  expandedTreeIds.value = isTreeExpanded(id)
    ? expandedTreeIds.value.filter((item) => item !== id)
    : [...expandedTreeIds.value, id];
  persistTreeExpanded();
}

function screenSlugFromTo(to: string): string {
  return to.split("/").pop()?.split("?")[0] ?? "";
}

watch(
  () =>
    [selectedPrototypeId.value, selectedScreenSlug.value, prototypeTree.value] as const,
  ([prototypeId, screenSlug, tree]) => {
    if (!prototypeId) return;
    expandTreeNode(prototypeId);
    if (!screenSlug) return;
    const prototype = tree.find((item) => item.id === prototypeId);
    const screen = prototype?.children?.find(
      (item) => screenSlugFromTo(item.to) === screenSlug,
    );
    if (screen) expandTreeNode(screen.id);
  },
  { immediate: true },
);

function isPrototypeActive(prototypeId: string): boolean {
  return (
    selectedPrototypeId.value === prototypeId && selectedScreenSlug.value === ""
  );
}

function isScreenActive(screenTo: string): boolean {
  const slug = screenSlugFromTo(screenTo);
  return (
    selectedPrototypeId.value !== "" &&
    selectedScreenSlug.value === slug &&
    selectedVariantId.value === ""
  );
}

function isVariantActive(variantTo: string): boolean {
  try {
    const url = new URL(variantTo, "http://local.invalid");
    const variant = url.searchParams.get("variant") ?? "";
    const path = url.pathname;
    const slug = path.split("/").pop() ?? "";
    return (
      selectedPrototypeId.value !== "" &&
      selectedScreenSlug.value === slug &&
      selectedVariantId.value === variant
    );
  } catch {
    return false;
  }
}
const breadcrumbs = computed(() => [
  { title: section.value.label, disabled: false, to: section.value.to },
  { title: String(route.meta.title ?? ""), disabled: true },
]);
const themeLabel = computed(() =>
  workbench.theme === "pbworkLight"
    ? "切换到深色工作台主题"
    : "切换到浅色工作台主题",
);
/** 元素检查仅在原型画布（Screen）出现。 */
const isScreenCanvas = computed(() => route.meta.resourceKind === "screen");
const showElementInspector = computed(() => isScreenCanvas.value);
const gridStyle = computed(() => ({
  "--resource-expanded-width": `${DEFAULT_RESOURCE_WIDTH}px`,
  "--inspector-expanded-width": `${workbench.inspectorWidth}px`,
}));
const resourcePanelStyle = computed(() => ({
  width: `${workbench.resourcePanelWidth}px`,
}));
const inspectorPanelStyle = computed(() => ({
  width: `${workbench.inspectorPanelWidth}px`,
}));
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  if (!query) return searchableNavigation;
  return searchableNavigation.filter((item) =>
    `${item.label} ${item.group}`.toLocaleLowerCase().includes(query),
  );
});

const primaryIcons = {
  foundations: Palette,
  components: Shapes,
  prototypes: Layers3,
} as const;

function secondaryIconFor(id: string) {
  if (id.startsWith("token-")) return SwatchBook;
  if (id.startsWith("theme-")) return Paintbrush;
  if (id.startsWith("lifecycle-all")) return LayoutGrid;
  if (id.startsWith("lifecycle-active")) return CircleDot;
  if (id.startsWith("lifecycle-review")) return ClipboardCheck;
  if (id.startsWith("lifecycle-final")) return BadgeCheck;
  if (id.startsWith("lifecycle-archived")) return Archive;
  if (id.includes("button") || id.includes("field") || id.includes("chip") || id.includes("card"))
    return Boxes;
  return ComponentIcon;
}

const inspectorStubTabs = [
  { id: "styles", label: "样式", icon: Paintbrush },
  { id: "component", label: "组件", icon: ComponentIcon },
  { id: "overview", label: "结构", icon: Info },
  { id: "conventions", label: "约定", icon: Sparkles },
  { id: "comments", label: "评论", icon: MessageSquareText },
] as const;

watch(
  () => selection.selected,
  (value) => {
    if (
      value &&
      showElementInspector.value &&
      !workbench.inspectorOpen
    ) {
      workbench.toggleInspector();
    }
  },
);

watch(isScreenCanvas, (onCanvas) => {
  if (!onCanvas) {
    selection.clearSelection();
    selection.setInspectMode(false);
  }
});

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clearResourceSlideTimer() {
  if (resourceSlideTimer === undefined) return;
  clearTimeout(resourceSlideTimer);
  resourceSlideTimer = undefined;
}

function clearInspectorSlideTimer() {
  if (inspectorSlideTimer === undefined) return;
  clearTimeout(inspectorSlideTimer);
  inspectorSlideTimer = undefined;
}

function toggleResourcePanel() {
  clearResourceSlideTimer();
  if (prefersReducedMotion()) {
    workbench.toggleResourcePanel();
    resourceContentExpanded.value = workbench.resourcePanelOpen;
    return;
  }

  if (workbench.resourcePanelOpen) {
    workbench.toggleResourcePanel();
    resourceSlideTimer = setTimeout(() => {
      resourceContentExpanded.value = false;
      resourceSlideTimer = undefined;
    }, PANEL_SLIDE_MS);
    return;
  }

  resourceContentExpanded.value = true;
  requestAnimationFrame(() => {
    workbench.toggleResourcePanel();
  });
}

function toggleInspectorPanel() {
  clearInspectorSlideTimer();
  if (prefersReducedMotion()) {
    workbench.toggleInspector();
    inspectorContentExpanded.value = workbench.inspectorOpen;
    return;
  }

  if (workbench.inspectorOpen) {
    workbench.toggleInspector();
    inspectorSlideTimer = setTimeout(() => {
      inspectorContentExpanded.value = false;
      inspectorSlideTimer = undefined;
    }, PANEL_SLIDE_MS);
    return;
  }

  inspectorContentExpanded.value = true;
  requestAnimationFrame(() => {
    workbench.toggleInspector();
  });
}

function onInspectorResizeStart(event: PointerEvent) {
  if (!workbench.inspectorOpen) return;
  event.preventDefault();
  resizingInspector.value = true;
  const startX = event.clientX;
  const startWidth = workbench.inspectorWidth;

  const onMove = (moveEvent: PointerEvent) => {
    const delta = startX - moveEvent.clientX;
    workbench.setInspectorWidth(startWidth + delta);
  };
  const onUp = () => {
    resizingInspector.value = false;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

onBeforeUnmount(() => {
  resizingInspector.value = false;
  clearResourceSlideTimer();
  clearInspectorSlideTimer();
});
</script>

<template>
  <v-app
    :theme="workbench.theme"
    class="pbwork-shell"
    data-testid="workbench-root"
  >
    <v-app-bar height="56" flat border class="workbench-app-bar">
      <v-toolbar-title class="pbwork-title">
        <RouterLink to="/workbench/foundations/tokens/color"
          >PBWork</RouterLink
        >
      </v-toolbar-title>
      <v-breadcrumbs
        :items="breadcrumbs"
        class="workbench-breadcrumbs"
        aria-label="当前位置"
      />
      <v-spacer />

      <v-tooltip text="搜索资源" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="text"
            aria-label="搜索资源"
            @click="searchOpen = true"
          >
            <Search :size="19" />
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip :text="themeLabel" location="bottom">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            variant="text"
            :aria-label="themeLabel"
            :aria-pressed="workbench.theme === 'pbworkDark'"
            @click="workbench.toggleTheme"
          >
            <SunMoon :size="19" />
          </v-btn>
        </template>
      </v-tooltip>
      <v-menu location="bottom end">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="text" aria-label="工作台设置">
            <Settings :size="19" />
          </v-btn>
        </template>
        <v-list min-width="240" density="comfortable">
          <v-list-subheader>工作台偏好</v-list-subheader>
          <v-list-item
            title="外观"
            :subtitle="workbench.theme === 'pbworkDark' ? '深色' : '浅色'"
            @click="workbench.toggleTheme"
          >
            <template #prepend><SunMoon :size="18" /></template>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer
      class="primary-navigation"
      permanent
      rail
      width="72"
      rail-width="72"
      border
    >
      <v-list
        class="primary-nav-list"
        nav
        density="compact"
        aria-label="一级导航"
      >
        <v-list-item
          v-for="item in primaryNavigation"
          :key="item.id"
          class="primary-nav-item"
          :class="{ 'is-active': sectionId === item.id }"
          :to="item.to"
          :active="sectionId === item.id"
          :aria-label="item.label"
          :aria-current="sectionId === item.id ? 'page' : undefined"
          exact
        >
          <div class="primary-nav-content">
            <component :is="primaryIcons[item.id]" :size="20" aria-hidden="true" />
          </div>
          <v-tooltip activator="parent" location="end">{{
            item.label
          }}</v-tooltip>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="workbench-main">
      <div
        class="workbench-grid"
        :class="{
          'is-resizing': resizingInspector,
          'is-no-inspector': !showElementInspector,
        }"
        :style="gridStyle"
      >
        <aside
          class="resource-panel"
          :class="{ 'is-collapsed': !workbench.resourcePanelOpen }"
          :style="resourcePanelStyle"
          aria-label="资源导航"
          data-testid="resource-panel"
        >
          <div class="panel-heading">
            <span v-if="resourceContentExpanded" class="panel-title">{{
              section.label
            }}</span>
            <v-tooltip
              :text="
                workbench.resourcePanelOpen ? '收起资源导航' : '展开资源导航'
              "
              location="bottom"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  variant="text"
                  class="panel-toggle"
                  :aria-label="
                    workbench.resourcePanelOpen
                      ? '收起资源导航'
                      : '展开资源导航'
                  "
                  :aria-expanded="workbench.resourcePanelOpen"
                  @click="toggleResourcePanel"
                >
                  <PanelLeftClose
                    v-if="workbench.resourcePanelOpen"
                    :size="18"
                  />
                  <PanelLeftOpen v-else :size="18" />
                </v-btn>
              </template>
            </v-tooltip>
          </div>

          <div class="panel-body">
            <nav
              v-if="resourceContentExpanded"
              class="secondary-nav panel-expanded"
              aria-label="二级导航"
            >
              <template v-if="sectionId !== 'prototypes'">
                <section
                  v-for="group in secondaryGroups"
                  :key="group.group"
                  class="secondary-group"
                >
                  <h2 class="secondary-group-label">{{ group.group }}</h2>
                  <v-list density="compact" nav class="secondary-list">
                    <v-list-item
                      v-for="item in group.items"
                      :key="item.id"
                      class="secondary-item"
                      :to="item.to"
                      :title="item.label"
                      :aria-label="item.label"
                      :active="selectedSecondaryId === item.id"
                    >
                      <template #prepend>
                        <component
                          :is="secondaryIconFor(item.id)"
                          class="secondary-icon"
                          :size="16"
                          aria-hidden="true"
                        />
                      </template>
                    </v-list-item>
                  </v-list>
                </section>
              </template>

              <template v-else>
                <section class="secondary-group">
                  <h2 class="secondary-group-label">生命周期</h2>
                  <v-list density="compact" nav class="secondary-list">
                    <v-list-item
                      v-for="item in lifecycleFilters"
                      :key="item.id"
                      class="secondary-item"
                      :to="item.to"
                      :title="item.label"
                      :aria-label="item.label"
                      :active="selectedSecondaryId === item.id"
                    >
                      <template #prepend>
                        <component
                          :is="secondaryIconFor(item.id)"
                          class="secondary-icon"
                          :size="16"
                          aria-hidden="true"
                        />
                      </template>
                    </v-list-item>
                  </v-list>
                </section>

                <section class="secondary-group">
                  <h2 class="secondary-group-label">
                    原型树
                    <span class="secondary-group-hint"
                      >原型 → 页面 → 状态</span
                    >
                  </h2>
                  <div
                    v-if="prototypeTree.length === 0"
                    class="tree-empty"
                  >
                    此生命周期下暂无原型
                  </div>
                  <div
                    v-for="prototype in prototypeTree"
                    :key="prototype.id"
                    class="proto-tree"
                  >
                    <div
                      class="tree-row"
                      :class="{
                        'is-active': isPrototypeActive(prototype.id),
                      }"
                    >
                      <button
                        v-if="(prototype.children?.length ?? 0) > 0"
                        type="button"
                        class="tree-toggle"
                        :aria-expanded="isTreeExpanded(prototype.id)"
                        :aria-label="
                          isTreeExpanded(prototype.id)
                            ? `收起 ${prototype.label}`
                            : `展开 ${prototype.label}`
                        "
                        @click="toggleTreeNode(prototype.id)"
                      >
                        <ChevronRight
                          class="tree-chevron"
                          :class="{ 'is-open': isTreeExpanded(prototype.id) }"
                          :size="14"
                          aria-hidden="true"
                        />
                      </button>
                      <span v-else class="tree-toggle-spacer" />
                      <RouterLink
                        class="tree-link tree-prototype"
                        :to="prototype.to"
                      >
                        <span class="tree-label">{{ prototype.label }}</span>
                        <span class="tree-tag">原型</span>
                      </RouterLink>
                    </div>

                    <div
                      v-if="isTreeExpanded(prototype.id)"
                      class="tree-children"
                    >
                      <div
                        v-for="screen in prototype.children ?? []"
                        :key="screen.id"
                        class="tree-screen-block"
                      >
                        <div
                          class="tree-row"
                          :class="{
                            'is-active': isScreenActive(screen.to),
                          }"
                        >
                          <button
                            v-if="(screen.children?.length ?? 0) > 0"
                            type="button"
                            class="tree-toggle"
                            :aria-expanded="isTreeExpanded(screen.id)"
                            :aria-label="
                              isTreeExpanded(screen.id)
                                ? `收起 ${screen.label}`
                                : `展开 ${screen.label}`
                            "
                            @click="toggleTreeNode(screen.id)"
                          >
                            <ChevronRight
                              class="tree-chevron"
                              :class="{ 'is-open': isTreeExpanded(screen.id) }"
                              :size="14"
                              aria-hidden="true"
                            />
                          </button>
                          <span v-else class="tree-toggle-spacer" />
                          <RouterLink
                            class="tree-link tree-screen"
                            :to="screen.to"
                          >
                            <span class="tree-label">{{ screen.label }}</span>
                            <span class="tree-tag">页面</span>
                          </RouterLink>
                        </div>

                        <div
                          v-if="isTreeExpanded(screen.id)"
                          class="tree-children tree-variants"
                        >
                          <RouterLink
                            v-for="variant in screen.children ?? []"
                            :key="variant.id"
                            class="tree-row tree-variant"
                            :class="{
                              'is-active': isVariantActive(variant.to),
                            }"
                            :to="variant.to"
                          >
                            <span class="tree-toggle-spacer" />
                            <span class="tree-label">{{ variant.label }}</span>
                          </RouterLink>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </template>
            </nav>

            <nav v-else class="rail-nav" aria-label="二级导航">
              <v-tooltip
                v-for="item in secondaryItems"
                :key="item.id"
                :text="item.label"
                location="end"
              >
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    class="rail-nav-btn"
                    :class="{ 'is-active': selectedSecondaryId === item.id }"
                    :to="item.to"
                    icon
                    variant="text"
                    size="small"
                    :aria-label="item.label"
                    :aria-current="
                      selectedSecondaryId === item.id ? 'page' : undefined
                    "
                  >
                    <component
                      :is="secondaryIconFor(item.id)"
                      :size="18"
                      aria-hidden="true"
                    />
                  </v-btn>
                </template>
              </v-tooltip>
            </nav>
          </div>
        </aside>

        <main
          class="content-canvas"
          :class="{ 'is-phone-canvas': isScreenCanvas }"
          tabindex="-1"
          data-testid="content-canvas"
        >
          <RouterView />
        </main>

        <aside
          v-if="showElementInspector"
          class="inspector-panel"
          :class="{ 'is-collapsed': !workbench.inspectorOpen }"
          :style="inspectorPanelStyle"
          aria-label="元素检查"
          data-testid="inspector-panel"
        >
          <button
            v-if="workbench.inspectorOpen"
            type="button"
            class="inspector-resize-handle"
            aria-label="调整元素检查宽度"
            @pointerdown="onInspectorResizeStart"
          />
          <div class="panel-heading">
            <span v-if="inspectorContentExpanded" class="panel-title"
              >元素检查</span
            >
            <v-tooltip
              :text="
                workbench.inspectorOpen ? '收起元素检查' : '展开元素检查'
              "
              location="bottom"
            >
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon
                  size="small"
                  variant="text"
                  class="panel-toggle"
                  :aria-label="
                    workbench.inspectorOpen ? '收起元素检查' : '展开元素检查'
                  "
                  :aria-expanded="workbench.inspectorOpen"
                  @click="toggleInspectorPanel"
                >
                  <PanelRightClose v-if="workbench.inspectorOpen" :size="18" />
                  <PanelRightOpen v-else :size="18" />
                </v-btn>
              </template>
            </v-tooltip>
          </div>

          <div class="panel-body">
            <div
              v-if="inspectorContentExpanded"
              class="inspector-body panel-expanded"
            >
              <InspectorPanel />
            </div>

            <nav v-else class="rail-nav" aria-label="元素检查快捷入口">
              <v-tooltip
                v-for="tab in inspectorStubTabs"
                :key="tab.id"
                :text="tab.label"
                location="start"
              >
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    class="rail-nav-btn"
                    icon
                    variant="text"
                    size="small"
                    :aria-label="tab.label"
                    @click="toggleInspectorPanel"
                  >
                    <component :is="tab.icon" :size="18" aria-hidden="true" />
                  </v-btn>
                </template>
              </v-tooltip>
            </nav>
          </div>
        </aside>
      </div>
    </v-main>

    <v-dialog v-model="searchOpen" max-width="560">
      <v-card>
        <v-card-title>搜索资源</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="searchQuery"
            label="名称"
            variant="outlined"
            density="comfortable"
            autofocus
            clearable
            hide-details
          />
          <v-list class="search-results" density="comfortable">
            <v-list-item
              v-for="item in searchResults"
              :key="item.to"
              :to="item.to"
              :title="item.label"
              :subtitle="item.group"
              :aria-label="item.label"
              @click="searchOpen = false"
            />
            <v-list-item
              v-if="searchResults.length === 0"
              title="没有匹配的资源"
            />
          </v-list>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style scoped>
.pbwork-shell {
  background: rgb(var(--v-theme-background));
  --shell-border: color-mix(
    in srgb,
    rgb(var(--v-theme-on-surface)) 10%,
    transparent
  );
  --shell-muted: color-mix(
    in srgb,
    rgb(var(--v-theme-on-surface)) 58%,
    transparent
  );
  --shell-soft: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 10%,
    transparent
  );
  --shell-soft-strong: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 16%,
    transparent
  );
}

.pbwork-title {
  flex: 0 0 auto;
  min-width: 140px;
  margin-left: 8px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}
.pbwork-title a {
  color: inherit;
  text-decoration: none;
}
.workbench-breadcrumbs {
  min-width: 0;
  font-size: 0.75rem;
}
.workbench-app-bar {
  background: rgb(var(--v-theme-surface)) !important;
}
.workbench-main {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}
.workbench-grid {
  display: grid;
  grid-template-columns: auto minmax(480px, 1fr) auto;
  height: calc(100vh - 56px);
  min-height: calc(100vh - 56px);
}
.workbench-grid.is-no-inspector {
  grid-template-columns: auto minmax(480px, 1fr);
}
.workbench-grid.is-resizing {
  user-select: none;
  cursor: col-resize;
}
.workbench-grid.is-resizing .resource-panel,
.workbench-grid.is-resizing .inspector-panel {
  transition: none;
}

.resource-panel,
.inspector-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  padding: 12px 8px;
  background: rgb(var(--v-theme-surface));
  border-color: var(--shell-border);
  border-style: solid;
  transition: width 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
.resource-panel {
  border-width: 0 1px 0 0;
}
.inspector-panel {
  border-width: 0 0 0 1px;
}
.resource-panel.is-collapsed,
.inspector-panel.is-collapsed {
  align-items: center;
}
.panel-body {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}
.resource-panel .panel-expanded {
  min-width: calc(var(--resource-expanded-width) - 16px);
}
.inspector-panel .panel-expanded {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: calc(var(--inspector-expanded-width) - 16px);
  overflow: hidden;
}
.content-canvas {
  min-width: 0;
  min-height: 0;
  padding: 36px 40px;
  overflow: auto;
  background: rgb(var(--v-theme-background));
}

.content-canvas.is-phone-canvas {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.content-canvas.is-phone-canvas > * {
  flex: 1;
  min-height: 0;
}

.panel-heading {
  display: flex;
  width: 100%;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.panel-title {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.is-collapsed .panel-heading {
  justify-content: center;
}
.panel-toggle {
  color: var(--shell-muted);
}

.primary-navigation {
  background: rgb(var(--v-theme-surface)) !important;
}
.primary-nav-list {
  padding: 12px 0;
}
.primary-navigation :deep(.v-list-item-title),
.primary-navigation :deep(.v-list-item__prepend),
.primary-navigation :deep(.v-list-item__append) {
  display: none;
}
.primary-navigation :deep(.primary-nav-item) {
  min-height: 52px;
  margin: 4px 10px;
  padding: 0 !important;
  border-radius: 14px;
  color: var(--shell-muted);
  justify-content: center;
}
.primary-navigation :deep(.primary-nav-item .v-list-item__content) {
  display: flex;
  width: 100%;
  padding: 0;
  justify-content: center;
  align-items: center;
}
.primary-navigation :deep(.primary-nav-item:hover) {
  color: rgb(var(--v-theme-on-surface));
  background: var(--shell-soft);
}
.primary-navigation :deep(.primary-nav-item.is-active),
.primary-navigation :deep(.primary-nav-item.v-list-item--active) {
  color: rgb(var(--v-theme-primary));
  background: var(--shell-soft-strong);
}
.primary-nav-content {
  display: grid;
  place-items: center;
  width: 100%;
  height: 52px;
  color: inherit;
}

.secondary-nav {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 0;
  overflow: auto;
  padding-bottom: 12px;
}
.secondary-group-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin: 0 4px 10px;
  padding: 0 8px 8px;
  border-bottom: 1px solid var(--shell-border);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.secondary-group-hint {
  color: var(--shell-muted);
  font-size: 0.6875rem;
  font-weight: 500;
}
.secondary-list {
  background: transparent;
  padding: 0 4px;
}
.secondary-item {
  margin-bottom: 2px;
  border-radius: 10px;
  min-height: 40px;
}
.proto-tree {
  display: grid;
  gap: 2px;
  padding: 0 4px 8px;
}
.tree-row {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 34px;
  border-radius: 10px;
  color: rgb(var(--v-theme-on-surface));
}
.tree-row.is-active {
  background: var(--shell-soft-strong);
  color: rgb(var(--v-theme-primary));
}
.tree-toggle,
.tree-toggle-spacer {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
}
.tree-toggle {
  display: inline-grid;
  place-items: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--shell-muted);
  cursor: pointer;
}
.tree-toggle:hover {
  background: var(--shell-soft);
  color: rgb(var(--v-theme-on-surface));
}
.tree-chevron {
  transition: transform 140ms ease;
}
.tree-chevron.is-open {
  transform: rotate(90deg);
}
.tree-link {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  min-height: 34px;
  padding: 0 8px 0 2px;
  color: inherit;
  text-decoration: none;
  border-radius: 8px;
}
.tree-link:hover {
  background: var(--shell-soft);
}
.tree-prototype .tree-label {
  font-size: 0.875rem;
  font-weight: 700;
}
.tree-screen .tree-label {
  font-size: 0.8125rem;
  font-weight: 600;
}
.tree-variant {
  min-height: 30px;
  padding-right: 8px;
  color: var(--shell-muted);
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 500;
}
.tree-variant .tree-label {
  flex: 1;
  padding-left: 2px;
}
.tree-variant.is-active {
  color: rgb(var(--v-theme-primary));
}
.tree-children {
  display: grid;
  gap: 2px;
  margin-left: 8px;
  padding-left: 4px;
  border-left: 1px solid var(--shell-border);
}
.tree-variants {
  margin-left: 12px;
}
.tree-tag {
  color: var(--shell-muted);
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.tree-empty {
  padding: 8px 12px;
  color: var(--shell-muted);
  font-size: 0.75rem;
}
.secondary-icon {
  color: inherit;
  opacity: 0.85;
}
.resource-panel :deep(.secondary-item .v-list-item__prepend) {
  margin-inline-end: 10px;
  width: auto;
}
.resource-panel :deep(.secondary-item.v-list-item--active) {
  color: rgb(var(--v-theme-primary));
  background: var(--shell-soft-strong);
}
.resource-panel :deep(.secondary-item:hover) {
  background: var(--shell-soft);
}

.rail-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding-top: 4px;
}
.rail-nav-btn {
  color: var(--shell-muted);
  border-radius: 12px;
}
.rail-nav-btn.is-active {
  color: rgb(var(--v-theme-primary));
  background: var(--shell-soft-strong);
}

.inspector-resize-handle {
  position: absolute;
  top: 0;
  left: -3px;
  z-index: 2;
  width: 6px;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
}
.inspector-resize-handle:hover,
.inspector-resize-handle:focus-visible,
.is-resizing .inspector-resize-handle {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 45%, transparent);
}
.inspector-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.inspector-empty {
  display: grid;
  gap: 8px;
  min-height: 180px;
  place-content: center;
  place-items: center;
  padding: 16px 12px;
  color: var(--shell-muted);
  text-align: center;
  font-size: 0.8125rem;
  border: 1px dashed var(--shell-border);
  border-radius: 14px;
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-background)) 70%,
    transparent
  );
}
.inspector-empty p {
  max-width: 16rem;
  margin: 0;
  line-height: 1.45;
  font-size: 0.75rem;
}
.search-results {
  max-height: 320px;
  margin-top: 12px;
  overflow: auto;
}

@media (prefers-reduced-motion: reduce) {
  .resource-panel,
  .inspector-panel {
    transition: none;
  }
}
</style>
