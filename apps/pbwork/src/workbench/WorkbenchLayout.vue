<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import {
  Archive,
  BadgeCheck,
  Boxes,
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
  ScanSearch,
  Search,
  Settings,
  Shapes,
  Sparkles,
  SunMoon,
  SwatchBook,
} from "lucide-vue-next";
import { RouterView, useRoute } from "vue-router";
import {
  DEFAULT_RESOURCE_WIDTH,
  useWorkbenchStore,
} from "@/app/stores/workbench";
import {
  groupSecondaryNavigation,
  isWorkbenchSectionId,
  primaryNavigation,
  searchableNavigation,
  secondaryNavigation,
} from "@/workbench/navigation";

/** Keep in sync with `.resource-panel` / `.inspector-panel` width transition. */
const PANEL_SLIDE_MS = 320;

const route = useRoute();
const workbench = useWorkbenchStore();
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
const secondaryItems = computed(() => secondaryNavigation[sectionId.value]);
const secondaryGroups = computed(() =>
  groupSecondaryNavigation(secondaryItems.value),
);
const selectedResourceId = computed(() => String(route.meta.resourceId ?? ""));
const breadcrumbs = computed(() => [
  { title: section.value.label, disabled: false, to: section.value.to },
  { title: String(route.meta.title ?? ""), disabled: true },
]);
const themeLabel = computed(() =>
  workbench.theme === "pbworkLight"
    ? "切换到深色工作台主题"
    : "切换到浅色工作台主题",
);
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

const secondaryIcons = {
  tokens: SwatchBook,
  themes: Paintbrush,
  "basic-components": Boxes,
  "complex-components": ComponentIcon,
  "all-prototypes": LayoutGrid,
  "active-prototypes": CircleDot,
  "review-prototypes": ClipboardCheck,
  "final-prototypes": BadgeCheck,
  "archived-prototypes": Archive,
} as const;

const inspectorStubTabs = [
  { id: "overview", label: "概览", icon: Info },
  { id: "component", label: "组件", icon: ComponentIcon },
  { id: "conventions", label: "约定", icon: Sparkles },
  { id: "styles", label: "样式", icon: Paintbrush },
  { id: "comments", label: "评论", icon: MessageSquareText },
] as const;

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
        <RouterLink to="/workbench/foundations/tokens/colors"
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
        :class="{ 'is-resizing': resizingInspector }"
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
                    :active="selectedResourceId === item.id"
                    exact
                  >
                    <template #prepend>
                      <component
                        :is="
                          secondaryIcons[item.id as keyof typeof secondaryIcons]
                        "
                        class="secondary-icon"
                        :size="16"
                        aria-hidden="true"
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </section>
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
                    :class="{ 'is-active': selectedResourceId === item.id }"
                    :to="item.to"
                    icon
                    variant="text"
                    size="small"
                    :aria-label="item.label"
                    :aria-current="
                      selectedResourceId === item.id ? 'page' : undefined
                    "
                  >
                    <component
                      :is="
                        secondaryIcons[item.id as keyof typeof secondaryIcons]
                      "
                      :size="18"
                      aria-hidden="true"
                    />
                  </v-btn>
                </template>
              </v-tooltip>
            </nav>
          </div>
        </aside>

        <main class="content-canvas" tabindex="-1" data-testid="content-canvas">
          <RouterView />
        </main>

        <aside
          class="inspector-panel"
          :class="{ 'is-collapsed': !workbench.inspectorOpen }"
          :style="inspectorPanelStyle"
          aria-label="上下文检查"
          data-testid="inspector-panel"
        >
          <button
            v-if="workbench.inspectorOpen"
            type="button"
            class="inspector-resize-handle"
            aria-label="调整上下文检查宽度"
            @pointerdown="onInspectorResizeStart"
          />
          <div class="panel-heading">
            <span v-if="inspectorContentExpanded" class="panel-title"
              >上下文检查</span
            >
            <v-tooltip
              :text="
                workbench.inspectorOpen ? '收起上下文检查' : '展开上下文检查'
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
                    workbench.inspectorOpen ? '收起上下文检查' : '展开上下文检查'
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
              <div class="inspector-empty">
                <ScanSearch :size="22" aria-hidden="true" />
                <span>未选择元素</span>
                <p>在原型画布中开启选择模式后，可在此查看结构与约定。</p>
              </div>
            </div>

            <nav v-else class="rail-nav" aria-label="检查面板快捷入口">
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
                    disabled
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
  min-height: calc(100vh - 56px);
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
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}
.resource-panel .panel-expanded {
  min-width: calc(var(--resource-expanded-width) - 16px);
}
.inspector-panel .panel-expanded {
  min-width: calc(var(--inspector-expanded-width) - 16px);
}
.content-canvas {
  min-width: 0;
  padding: 36px 40px;
  overflow: auto;
  background: rgb(var(--v-theme-background));
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
  gap: 14px;
  min-height: 0;
  overflow: auto;
}
.secondary-group-label {
  margin: 0 10px 6px;
  color: var(--shell-muted);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.secondary-list {
  background: transparent;
  padding: 0;
}
.secondary-item {
  margin-bottom: 2px;
  border-radius: 10px;
  min-height: 40px;
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
  background: var(--shell-soft);
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-primary));
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
  min-height: 0;
  flex: 1;
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
