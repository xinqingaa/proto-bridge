<script setup lang="ts">
import { computed, ref } from "vue";
import {
  Check,
  ChevronDown,
  CircleDot,
  History,
  RotateCcw,
} from "lucide-vue-next";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import WorkbenchButton from "@/workbench/ui/WorkbenchButton.vue";
import WorkbenchBadge from "@/workbench/ui/WorkbenchBadge.vue";
import WorkbenchStatChip from "@/workbench/ui/WorkbenchStatChip.vue";
import LifecycleTransitionDialog from "@/workbench/prototypes/LifecycleTransitionDialog.vue";
import PrototypeFlowRail from "@/workbench/prototypes/PrototypeFlowRail.vue";
import ScreenPreviewCard from "@/workbench/prototypes/ScreenPreviewCard.vue";
import { resolveScreenGroups } from "@/workbench/prototypes/resolveScreenGroups";

const props = defineProps<{
  prototypeId: string;
}>();
const lifecycle = usePrototypeLifecycleStore();
const transitionOpen = ref(false);
const historyExpanded = ref(false);
const lifecycleStages = [
  { id: "active", label: "进行中" },
  { id: "review", label: "待确认" },
  { id: "final", label: "已定稿" },
  { id: "archived", label: "已归档" },
] as const;

const prototype = computed(() =>
  loadPrototypes().find((item) => item.id === props.prototypeId),
);
const screens = computed(() =>
  loadPrototypeScreens().filter(
    (item) => item.prototypeId === props.prototypeId,
  ),
);
const screenGroups = computed(() =>
  resolveScreenGroups(screens.value, prototype.value?.screenGroups ?? []),
);
const variantTotal = computed(() =>
  screens.value.reduce((sum, screen) => sum + screen.variants.length, 0),
);
const effectiveLifecycle = computed(() =>
  prototype.value ? lifecycle.effectiveLifecycle(prototype.value) : "active",
);
const currentStageIndex = computed(() =>
  lifecycleStages.findIndex((stage) => stage.id === effectiveLifecycle.value),
);
const stageProgress = computed(() =>
  currentStageIndex.value < 0
    ? 0
    : (currentStageIndex.value / (lifecycleStages.length - 1)) * 75,
);
const lifecycleHistory = computed(() =>
  lifecycle.historyFor(props.prototypeId),
);
const visibleHistory = computed(() =>
  historyExpanded.value
    ? lifecycleHistory.value
    : lifecycleHistory.value.slice(0, 1),
);
const formatHistoryTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
</script>

<template>
  <ResourcePageShell v-if="prototype" eyebrow="原型" :title="prototype.label">
    <template #stats>
      <div class="meta-cluster">
        <WorkbenchStatChip :value="screens.length" label="页面" />
        <WorkbenchStatChip :value="variantTotal" label="状态" />
        <WorkbenchStatChip
          v-for="owner in prototype.owners ?? []"
          :key="`owner-${owner}`"
          :label="owner"
        />
        <WorkbenchStatChip
          v-for="role in prototype.roles ?? []"
          :key="`role-${role}`"
          :label="role"
        />
      </div>
    </template>

    <section class="lifecycle-hero" :class="`stage-${effectiveLifecycle}`">
      <div class="lifecycle-copy">
        <div class="lifecycle-kicker">
          <CircleDot :size="15" />
          当前生命周期
          <WorkbenchBadge
            v-if="lifecycle.hasOverride(prototype.id)"
            tone="warning"
            >本地状态</WorkbenchBadge
          >
        </div>
        <strong>{{ LIFECYCLE_LABELS[effectiveLifecycle] }}</strong>
        <p>原型当前处于「{{ LIFECYCLE_LABELS[effectiveLifecycle] }}」阶段</p>
      </div>
      <div class="lifecycle-actions">
        <WorkbenchButton tone="primary" @click="transitionOpen = true"
          >流转状态</WorkbenchButton
        >
        <WorkbenchButton
          v-if="lifecycle.hasOverride(prototype.id)"
          tone="ghost"
          @click="lifecycle.reset(prototype)"
          ><RotateCcw :size="13" />恢复注册状态</WorkbenchButton
        >
      </div>

      <div class="stage-track">
        <span class="stage-line" />
        <span class="stage-progress" :style="{ width: `${stageProgress}%` }" />
        <div
          v-for="(stage, index) in lifecycleStages"
          :key="stage.id"
          class="stage-item"
          :class="{
            current: index === currentStageIndex,
            complete: index < currentStageIndex,
          }"
        >
          <span>
            <Check v-if="index < currentStageIndex" :size="13" />
            <i v-else />
          </span>
          <strong>{{ stage.label }}</strong>
        </div>
      </div>

      <div v-if="visibleHistory.length" class="history-summary">
        <History :size="14" />
        <ol>
          <li v-for="entry in visibleHistory" :key="entry.id">
            <span
              >{{ LIFECYCLE_LABELS[entry.from] }} →
              {{ LIFECYCLE_LABELS[entry.to] }}</span
            >
            <time>{{ formatHistoryTime(entry.changedAt) }}</time>
          </li>
        </ol>
        <button
          v-if="lifecycleHistory.length > 1"
          type="button"
          :aria-expanded="historyExpanded"
          @click="historyExpanded = !historyExpanded"
        >
          {{ historyExpanded ? "收起" : "全部记录" }}
          <ChevronDown
            :size="13"
            :class="{ rotated: historyExpanded }"
            aria-hidden="true"
          />
        </button>
      </div>
    </section>

    <section class="flow-panel">
      <div class="section-heading">
        <div>
          <p>页面结构</p>
          <h2>模块分组</h2>
        </div>
        <span
          >{{ screens.length }} 个页面 · {{ screenGroups.length }} 个模块</span
        >
      </div>
      <PrototypeFlowRail
        :prototype-id="prototype.id"
        :screens="screens"
        :groups="prototype.screenGroups ?? []"
      />
    </section>

    <section class="gallery-section">
      <div class="gallery-heading">
        <div>
          <p>页面画廊</p>
          <h2>页面</h2>
        </div>
        <span>{{ screens.length }} 个页面 · {{ variantTotal }} 个状态</span>
      </div>
      <div
        v-for="group in screenGroups"
        :key="group.id"
        class="gallery-group"
      >
        <h3>{{ group.label }} · {{ group.screens.length }}</h3>
        <div class="screen-grid">
          <ScreenPreviewCard
            v-for="screen in group.screens"
            :key="screen.screenId"
            density="compact"
            :prototype-id="prototype.id"
            :screen="screen"
          />
        </div>
      </div>
    </section>
  </ResourcePageShell>
  <v-alert v-else type="error" variant="tonal"
    >未知原型：{{ prototypeId }}</v-alert
  >
  <LifecycleTransitionDialog
    v-if="prototype"
    v-model="transitionOpen"
    :prototype="prototype"
  />
</template>

<style scoped>
.meta-cluster {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}
.lifecycle-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px 24px;
  overflow: hidden;
  padding: 22px 24px 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 18px;
  background:
    radial-gradient(
      circle at 88% 12%,
      color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, transparent),
      transparent 32%
    ),
    color-mix(
      in srgb,
      rgb(var(--v-theme-primary)) 7%,
      rgb(var(--v-theme-surface))
    );
}
.lifecycle-hero::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: rgb(var(--v-theme-primary));
  content: "";
}
.lifecycle-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 750;
}
.lifecycle-copy > strong {
  display: block;
  margin-top: 8px;
  font-size: 1.75rem;
  line-height: 1.1;
}
.lifecycle-copy > p {
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.75rem;
}
.lifecycle-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 7px;
}
.stage-track {
  position: relative;
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 2px;
}
.stage-line,
.stage-progress {
  position: absolute;
  top: 14px;
  left: 12.5%;
  height: 2px;
}
.stage-line {
  right: 12.5%;
  background: rgba(var(--v-theme-on-surface), 0.13);
}
.stage-progress {
  max-width: 75%;
  background: rgb(var(--v-theme-primary));
}
.stage-item {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  gap: 7px;
  color: rgba(var(--v-theme-on-surface), 0.42);
}
.stage-item > span {
  display: grid;
  width: 29px;
  height: 29px;
  place-items: center;
  border: 2px solid
    color-mix(
      in srgb,
      rgb(var(--v-theme-surface)) 80%,
      rgba(var(--v-theme-on-surface), 0.14)
    );
  border-radius: 50%;
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-on-surface)) 8%,
    rgb(var(--v-theme-surface))
  );
}
.stage-item i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.stage-item strong {
  font-size: 0.68rem;
  font-weight: 650;
}
.stage-item.complete,
.stage-item.current {
  color: rgb(var(--v-theme-primary));
}
.stage-item.complete > span,
.stage-item.current > span {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.stage-item.current > span {
  box-shadow: 0 0 0 5px
    color-mix(in srgb, rgb(var(--v-theme-primary)) 13%, transparent);
}
.stage-item.current strong {
  font-weight: 800;
}
.history-summary {
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.68rem;
}
.history-summary ol {
  flex: 1;
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.history-summary li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.history-summary button {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.history-summary button svg {
  transition: transform 160ms ease;
}
.history-summary button svg.rotated {
  transform: rotate(180deg);
}
.flow-panel {
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}
.section-heading,
.gallery-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
}
.section-heading {
  margin-bottom: 8px;
}
.section-heading h2,
.gallery-heading h2 {
  margin: 0;
  font-size: 1.05rem;
}
.section-heading p,
.gallery-heading p {
  margin: 0 0 3px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.68rem;
  font-weight: 750;
}
.section-heading > span,
.gallery-heading > span {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.7rem;
}
.gallery-section {
  display: grid;
  gap: 18px;
  margin-top: 2px;
}
.gallery-heading h2 {
  font-size: 1.12rem;
}
.gallery-group {
  display: grid;
  gap: 10px;
}
.gallery-group h3 {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.72rem;
  font-weight: 750;
}
.screen-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
@media (max-width: 1279px) {
  .meta-cluster {
    justify-content: flex-start;
  }
  .screen-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 960px) {
  .screen-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .lifecycle-hero {
    grid-template-columns: 1fr;
  }
  .lifecycle-actions {
    justify-content: flex-start;
  }
  .screen-grid {
    grid-template-columns: 1fr;
  }
  .gallery-heading {
    align-items: start;
    flex-direction: column;
    gap: 4px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .history-summary button svg {
    transition: none;
  }
}
</style>
