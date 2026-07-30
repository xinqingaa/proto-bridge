<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  FileStack,
  GitBranch,
  MessageSquareText,
  RotateCcw,
  ScanLine,
  Users,
} from "lucide-vue-next";
import type {
  PrototypeLifecycle,
  PrototypeRecord,
} from "@/design-system/types";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import { loadPrototypes, loadPrototypeScreens } from "@/design-system/loaders";
import { useCommentsStore } from "@/app/stores/comments";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import ResourcePageShell from "@/workbench/views/ResourcePageShell.vue";
import WorkbenchIconButton from "@/workbench/ui/WorkbenchIconButton.vue";
import WorkbenchBadge from "@/workbench/ui/WorkbenchBadge.vue";
import WorkbenchStatChip from "@/workbench/ui/WorkbenchStatChip.vue";
import LifecycleTransitionDialog from "@/workbench/prototypes/LifecycleTransitionDialog.vue";
import { useCaptureStore } from "@/app/stores/capture";

const props = defineProps<{
  lifecycle?: "all" | PrototypeLifecycle | undefined;
}>();
const router = useRouter();
const route = useRoute();
const capture = useCaptureStore();
const state = usePrototypeLifecycleStore();
const comments = useCommentsStore();
const editing = ref<PrototypeRecord | null>(null);
const all = loadPrototypes();
const items = computed(() =>
  all.filter(
    (item) =>
      !props.lifecycle ||
      props.lifecycle === "all" ||
      state.effectiveLifecycle(item) === props.lifecycle,
  ),
);
const title = computed(() =>
  props.lifecycle && props.lifecycle !== "all"
    ? LIFECYCLE_LABELS[props.lifecycle]
    : "全部原型",
);
const stats = (id: string) => {
  const screens = loadPrototypeScreens().filter(
    (screen) => screen.prototypeId === id,
  );
  return {
    screens: screens.length,
    variants: screens.reduce((sum, screen) => sum + screen.variants.length, 0),
    comments: comments.comments.filter(
      (comment) => comment.prototypeId === id && comment.status === "open",
    ).length,
  };
};

function openPrototype(item: PrototypeRecord) {
  void router.push(`/workbench/prototypes/${item.id}`);
}

function onCardKeydown(event: KeyboardEvent, item: PrototypeRecord) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openPrototype(item);
  }
}

function capturePrototype(item: PrototypeRecord) {
  capture.beginPrototype(item.id, route.fullPath);
  capture.openComposer();
}
</script>

<template>
  <ResourcePageShell
    eyebrow="原型资产"
    :title="title"
    description="以独立产品资产管理原型、页面、状态与评审进度；工作台状态可直接流转，不依赖源码写回。"
  >
    <template #stats>
      <WorkbenchStatChip :value="items.length" label="个原型" />
    </template>
    <div v-if="items.length" class="prototype-grid">
      <article
        v-for="item in items"
        :key="item.id"
        class="prototype-card"
        role="link"
        tabindex="0"
        :aria-label="`查看原型 ${item.label}`"
        @click="openPrototype(item)"
        @keydown="onCardKeydown($event, item)"
      >
        <div class="card-visual" aria-hidden="true">
          <span /><span /><span /><i />
        </div>
        <div class="card-heading">
          <div>
            <p>{{ item.id }}</p>
            <h2>{{ item.label }}</h2>
          </div>
          <WorkbenchBadge :tone="state.effectiveLifecycle(item)">
            {{ LIFECYCLE_LABELS[state.effectiveLifecycle(item)] }}
          </WorkbenchBadge>
        </div>
        <div class="card-metrics">
          <span><FileStack :size="14" />{{ stats(item.id).screens }} 页面</span>
          <span
            ><GitBranch :size="14" />{{ stats(item.id).variants }} 状态</span
          >
          <span
            ><MessageSquareText :size="14" />{{
              stats(item.id).comments
            }}
            评论</span
          >
        </div>
        <p class="card-people">
          <Users :size="14" />{{
            [...(item.owners ?? []), ...(item.roles ?? [])].join(" · ") ||
            "未设置参与者"
          }}
        </p>
        <div v-if="state.hasOverride(item.id)" class="local-state" @click.stop>
          <span>本地工作台状态</span>
          <button type="button" @click="state.reset(item)">
            <RotateCcw :size="12" />恢复注册状态
          </button>
        </div>
        <footer @click.stop>

            <WorkbenchIconButton
              label="采集整个原型"
              title="采集整个原型"
              tone="action"
              size="large"
              @click="capturePrototype(item)"
            >
              <ScanLine :size="18" />
            </WorkbenchIconButton>
            <WorkbenchIconButton
              label="流转原型状态"
              title="流转原型状态"
              tone="strong"
              size="large"
              @click="editing = item"
            >
              <GitBranch :size="18" />
            </WorkbenchIconButton>
    
        </footer>
      </article>
    </div>
    <div v-else class="gallery-empty">
      <GitBranch :size="30" />
      <h2>此阶段还没有原型</h2>
      <p>可从其他生命周期流转到「{{ title }}」，列表和原型树会立即同步。</p>
    </div>
  </ResourcePageShell>
  <LifecycleTransitionDialog
    v-if="editing"
    :model-value="true"
    :prototype="editing"
    @update:model-value="!$event && (editing = null)"
  />
</template>

<style scoped>
.prototype-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.prototype-card {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 15px;
  background: rgb(var(--v-theme-surface));
  cursor: pointer;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease;
}
.prototype-card:hover,
.prototype-card:focus-visible {
  transform: translateY(-2px);
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 40%,
    transparent
  );
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  outline: none;
}
.prototype-card:focus-visible {
  box-shadow:
    0 0 0 2px color-mix(in srgb, rgb(var(--v-theme-primary)) 35%, transparent),
    0 14px 30px rgba(15, 23, 42, 0.08);
}
.card-visual {
  position: relative;
  display: grid;
  grid-template-columns: 56px 1fr;
  grid-template-rows: 22px 52px;
  gap: 7px;
  height: 108px;
  padding: 16px;
  background: linear-gradient(
    135deg,
    color-mix(
      in srgb,
      rgb(var(--v-theme-primary)) 13%,
      rgb(var(--v-theme-surface))
    ),
    rgba(var(--v-theme-on-surface), 0.025)
  );
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.card-visual span {
  border-radius: 5px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}
.card-visual span:first-child {
  grid-row: 1 / 3;
}
.card-visual span:nth-child(3) {
  width: 70%;
}
.card-visual i {
  position: absolute;
  right: 17px;
  bottom: 14px;
  width: 46px;
  height: 18px;
  border-radius: 6px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 55%, transparent);
}
.card-heading,
.card-metrics,
.card-people,
.local-state,
.prototype-card footer {
  margin-inline: 16px;
}
.card-heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 12px;
  margin-top: 15px;
}
.card-heading p {
  margin: 0 0 3px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font:
    600 0.66rem ui-monospace,
    monospace;
}
.card-heading h2 {
  margin: 0;
  font-size: 1.05rem;
}
.card-metrics {
  display: flex;
  gap: 13px;
  margin-top: 15px;
}
.card-metrics span,
.card-people {
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.72rem;
}
.card-people {
  margin-top: 10px;
  margin-bottom: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.local-state {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 7px 9px;
  border-radius: 8px;
  background: color-mix(in srgb, rgb(var(--v-theme-warning)) 9%, transparent);
  font-size: 0.68rem;
}
.local-state button {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}
.prototype-card footer {
  display: flex;
  align-items: center;
  justify-content:  space-between;
  gap: 8px;
  margin-top: 15px;
  padding: 13px 0 15px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.gallery-empty {
  display: grid;
  justify-items: center;
  padding: 64px 20px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 15px;
  color: rgba(var(--v-theme-on-surface), 0.52);
  text-align: center;
}
.gallery-empty h2 {
  margin: 12px 0 4px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem;
}
.gallery-empty p {
  margin: 0;
  font-size: 0.78rem;
}
.footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
@media (max-width: 860px) {
  .prototype-grid {
    grid-template-columns: 1fr;
  }
}
</style>
