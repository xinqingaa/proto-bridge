<script setup lang="ts">
import { computed, ref } from "vue";
import {
  ChevronLeft,
  ChevronRight,
  Layers3,
  Palette,
  Search,
  Settings,
  Shapes,
  SunMoon,
} from "lucide-vue-next";
import { RouterView, useRoute } from "vue-router";
import { useWorkbenchStore } from "@/app/stores/workbench";
import {
  isWorkbenchSectionId,
  primaryNavigation,
  searchableNavigation,
  secondaryNavigation,
} from "@/workbench/navigation";

const route = useRoute();
const workbench = useWorkbenchStore();
const searchOpen = ref(false);
const searchQuery = ref("");

const sectionId = computed(() =>
  isWorkbenchSectionId(route.meta.sectionId)
    ? route.meta.sectionId
    : "foundations",
);
const section = computed(() =>
  primaryNavigation.find((item) => item.id === sectionId.value)!,
);
const secondaryItems = computed(() => secondaryNavigation[sectionId.value]);
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
  "--resource-panel-width": workbench.resourcePanelOpen ? "264px" : "48px",
  "--inspector-panel-width": workbench.inspectorOpen ? "360px" : "48px",
}));
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase();
  if (!query) return searchableNavigation;
  return searchableNavigation.filter((item) =>
    `${item.label} ${item.subtitle ?? ""}`.toLocaleLowerCase().includes(query),
  );
});

const primaryIcons = {
  foundations: Palette,
  components: Shapes,
  prototypes: Layers3,
};
</script>

<template>
  <v-app :theme="workbench.theme" data-testid="workbench-root">
    <v-app-bar height="56" flat border>
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
      <v-list nav density="compact" aria-label="一级导航">
        <v-list-item
          v-for="item in primaryNavigation"
          :key="item.id"
          :to="item.to"
          :active="sectionId === item.id"
          :aria-label="item.label"
          exact
        >
          <template #prepend>
            <component :is="primaryIcons[item.id]" :size="20" />
          </template>
          <v-tooltip activator="parent" location="end">{{
            item.label
          }}</v-tooltip>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="workbench-main">
      <div class="workbench-grid" :style="gridStyle">
        <aside
          class="resource-panel"
          :class="{ 'is-collapsed': !workbench.resourcePanelOpen }"
          aria-label="资源导航"
          data-testid="resource-panel"
        >
          <div class="panel-heading">
            <span v-if="workbench.resourcePanelOpen">{{ section.label }}</span>
            <v-btn
              icon
              size="small"
              variant="text"
              :aria-label="
                workbench.resourcePanelOpen ? '收起资源导航' : '展开资源导航'
              "
              :aria-expanded="workbench.resourcePanelOpen"
              @click="workbench.toggleResourcePanel"
            >
              <ChevronLeft v-if="workbench.resourcePanelOpen" :size="18" />
              <ChevronRight v-else :size="18" />
            </v-btn>
          </div>
          <v-list
            v-if="workbench.resourcePanelOpen"
            density="comfortable"
            nav
            aria-label="二级导航"
          >
            <v-list-item
              v-for="item in secondaryItems"
              :key="item.id"
              :to="item.to"
              :title="item.label"
              :aria-label="item.label"
              v-bind="item.subtitle ? { subtitle: item.subtitle } : {}"
              :active="selectedResourceId === item.id"
              exact
            />
          </v-list>
        </aside>

        <main class="content-canvas" tabindex="-1" data-testid="content-canvas">
          <RouterView />
        </main>

        <aside
          class="inspector-panel"
          :class="{ 'is-collapsed': !workbench.inspectorOpen }"
          aria-label="上下文检查"
          data-testid="inspector-panel"
        >
          <div class="panel-heading">
            <span v-if="workbench.inspectorOpen">上下文检查</span>
            <v-btn
              icon
              size="small"
              variant="text"
              :aria-label="
                workbench.inspectorOpen ? '收起上下文检查' : '展开上下文检查'
              "
              :aria-expanded="workbench.inspectorOpen"
              @click="workbench.toggleInspector"
            >
              <ChevronRight v-if="workbench.inspectorOpen" :size="18" />
              <ChevronLeft v-else :size="18" />
            </v-btn>
          </div>
          <div v-if="workbench.inspectorOpen" class="inspector-empty">
            <span>未选择元素</span>
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
              :aria-label="item.label"
              v-bind="item.subtitle ? { subtitle: item.subtitle } : {}"
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
.pbwork-title {
  flex: 0 0 auto;
  min-width: 140px;
  margin-left: 8px;
  font-size: 1rem;
  font-weight: 700;
}
.pbwork-title a {
  color: inherit;
  text-decoration: none;
}
.workbench-breadcrumbs {
  min-width: 0;
  font-size: 0.75rem;
}
.workbench-main {
  min-height: 100vh;
}
.workbench-grid {
  display: grid;
  grid-template-columns: var(--resource-panel-width) minmax(480px, 1fr) var(
      --inspector-panel-width
    );
  min-height: calc(100vh - 56px);
  transition: grid-template-columns 160ms ease;
}
.resource-panel,
.inspector-panel {
  min-width: 0;
  overflow: hidden;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
  border-style: solid;
}
.resource-panel {
  padding: 12px;
  border-width: 0 1px 0 0;
}
.inspector-panel {
  padding: 12px;
  border-width: 0 0 0 1px;
}
.resource-panel.is-collapsed,
.inspector-panel.is-collapsed {
  padding: 8px 4px;
}
.content-canvas {
  min-width: 0;
  padding: 36px 40px;
  overflow: auto;
}
.panel-heading {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 700;
}
.is-collapsed .panel-heading {
  justify-content: center;
}
.primary-navigation :deep(.v-list-item-title) {
  display: none;
}
.primary-navigation :deep(.v-list-item) {
  min-height: 48px;
}
.inspector-empty {
  display: grid;
  min-height: 160px;
  place-items: center;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.8125rem;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.search-results {
  max-height: 320px;
  margin-top: 12px;
  overflow: auto;
}
@media (prefers-reduced-motion: reduce) {
  .workbench-grid {
    transition: none;
  }
}
</style>
