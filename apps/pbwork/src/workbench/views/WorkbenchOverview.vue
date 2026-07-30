<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import {
  ArrowRight,
  CheckCircle2,
  Component,
  FileStack,
  GitBranch,
  Layers3,
  MessageSquareText,
  Palette,
  ScanLine,
  Sparkles,
} from "lucide-vue-next";
import {
  loadPrototypeScreens,
  loadPrototypes,
  loadTokens,
} from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";
import {
  LIFECYCLE_LABELS,
  type PrototypeLifecycle,
} from "@/design-system/types";
import { useCommentsStore } from "@/app/stores/comments";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { useCaptureStore } from "@/app/stores/capture";
import { buildCaptureTaskPresentations } from "@/capture/presentation";

const prototypes = loadPrototypes();
const screens = loadPrototypeScreens();
const comments = useCommentsStore();
const lifecycleStore = usePrototypeLifecycleStore();
const capture = useCaptureStore();

const lifecycleOrder: Array<"all" | PrototypeLifecycle> = [
  "all",
  "active",
  "review",
  "final",
  "archived",
];

const lifecycleCards = computed(() =>
  lifecycleOrder.map((id) => ({
    id,
    label: id === "all" ? "全部原型" : LIFECYCLE_LABELS[id],
    count:
      id === "all"
        ? prototypes.length
        : prototypes.filter(
            (prototype) => lifecycleStore.effectiveLifecycle(prototype) === id,
          ).length,
    to: `/workbench/prototypes/${id}`,
  })),
);

const focusPrototypes = computed(() => {
  const active = prototypes.filter(
    (prototype) => lifecycleStore.effectiveLifecycle(prototype) === "active",
  );
  return (active.length ? active : prototypes).slice(0, 4);
});

const openComments = computed(() =>
  comments.comments.filter((comment) => comment.status === "open"),
);
const captureTasks = computed(() =>
  buildCaptureTaskPresentations(capture.consoleState),
);
const unresolvedCaptureTasks = computed(
  () =>
    captureTasks.value.filter((item) => item.status === "needs-attention")
      .length,
);
const runningCaptureTasks = computed(
  () => captureTasks.value.filter((item) => item.status === "running").length,
);
const captureResults = computed(() =>
  (capture.consoleState?.bundles ?? [])
    .filter((item) => item.activeSnapshot)
    .slice(0, 4),
);
const captureResultCount = computed(
  () =>
    (capture.consoleState?.bundles ?? []).filter((item) => item.activeSnapshot)
      .length,
);

function captureResultPath(
  item: (typeof captureResults.value)[number],
): string {
  return `/workbench/evidence/${item.bundle.bundleId}/${item.activeSnapshot!.snapshotId}`;
}

function captureResultLabel(item: (typeof captureResults.value)[number]) {
  const counts = item.activeSnapshot!.coverage.counts;
  return `${counts.captured + counts.reused}/${counts.selected} 成功`;
}

function captureResultTime(item: (typeof captureResults.value)[number]) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(item.activeSnapshot!.committedAt));
}

onMounted(() => {
  if (!capture.connected) void capture.connect();
  else void capture.refreshConsole();
});

function prototypeStats(prototypeId: string) {
  const prototypeScreens = screens.filter(
    (screen) => screen.prototypeId === prototypeId,
  );
  return {
    screens: prototypeScreens.length,
    variants: prototypeScreens.reduce(
      (sum, screen) => sum + screen.variants.length,
      0,
    ),
    comments: openComments.value.filter(
      (comment) => comment.prototypeId === prototypeId,
    ).length,
  };
}

const assetStats = computed(() => [
  {
    label: "设计令牌",
    value: loadTokens().length,
    icon: Palette,
    to: "/workbench/foundations/tokens/color",
  },
  {
    label: "组件",
    value: componentRecords.length,
    icon: Component,
    to: `/workbench/components/${componentRecords[0]?.id ?? "button"}`,
  },
  {
    label: "页面",
    value: screens.length,
    icon: FileStack,
    to: "/workbench/prototypes/all",
  },
  {
    label: "状态",
    value: screens.reduce((sum, screen) => sum + screen.variants.length, 0),
    icon: GitBranch,
    to: "/workbench/prototypes/all",
  },
]);
</script>

<template>
  <section class="overview-page" data-testid="workbench-overview">
    <header class="overview-hero">
      <div>
        <p><Sparkles :size="15" /> PBWork 工作台</p>
        <h1>从原型继续工作</h1>
        <span>查看正在推进的原型、评审进度与设计系统资源。</span>
      </div>
      <RouterLink to="/workbench/prototypes/all" class="all-prototypes">
        全部原型 <ArrowRight :size="15" />
      </RouterLink>
    </header>

    <section class="overview-section">
      <div class="section-heading">
        <div>
          <p>进行中的工作</p>
          <h2>继续你的原型</h2>
        </div>
        <span>{{ focusPrototypes.length }} 个原型</span>
      </div>
      <div class="focus-grid">
        <RouterLink
          v-for="prototype in focusPrototypes"
          :key="prototype.id"
          :to="`/workbench/prototypes/${prototype.id}`"
          class="focus-card"
        >
          <div class="prototype-visual" aria-hidden="true">
            <span class="visual-nav" />
            <span class="visual-bar" />
            <span class="visual-card" />
            <i />
          </div>
          <div class="focus-card-body">
            <div class="focus-title">
              <span class="prototype-icon"><Layers3 :size="17" /></span>
              <div>
                <small>{{ prototype.id }}</small>
                <h3>{{ prototype.label }}</h3>
              </div>
              <em>{{
                LIFECYCLE_LABELS[lifecycleStore.effectiveLifecycle(prototype)]
              }}</em>
            </div>
            <div class="focus-metrics">
              <span
                ><FileStack :size="14" />{{
                  prototypeStats(prototype.id).screens
                }}
                页面</span
              >
              <span
                ><GitBranch :size="14" />{{
                  prototypeStats(prototype.id).variants
                }}
                状态</span
              >
              <span
                ><MessageSquareText :size="14" />{{
                  prototypeStats(prototype.id).comments
                }}
                评论</span
              >
            </div>
            <footer>打开原型 <ArrowRight :size="14" /></footer>
          </div>
        </RouterLink>
      </div>
    </section>

    <section class="overview-section capture-section">
      <div class="section-heading compact">
        <div>
          <p>采集与验收</p>
          <h2>最近采集</h2>
        </div>
        <RouterLink to="/workbench/capture" class="section-link">
          任务中心 <ArrowRight :size="14" />
        </RouterLink>
      </div>
      <div class="capture-overview">
        <div class="capture-stats">
          <article>
            <span>进行中</span>
            <strong>{{ runningCaptureTasks }}</strong>
          </article>
          <article :class="{ attention: unresolvedCaptureTasks }">
            <span>需处理</span>
            <strong>{{ unresolvedCaptureTasks }}</strong>
          </article>
          <article>
            <span>可检查结果</span>
            <strong>{{ captureResultCount }}</strong>
          </article>
        </div>
        <div v-if="captureResults.length" class="capture-result-list">
          <RouterLink
            v-for="item in captureResults"
            :key="item.bundle.bundleId"
            :to="captureResultPath(item)"
          >
            <span class="capture-result-icon"><ScanLine :size="16" /></span>
            <span>
              <strong>{{
                prototypes.find(
                  (prototype) => prototype.id === item.bundle.prototypeId,
                )?.label ?? item.bundle.prototypeId
              }}</strong>
              <small
                >{{ captureResultLabel(item) }} ·
                {{ captureResultTime(item) }}</small
              >
            </span>
            <ArrowRight :size="14" />
          </RouterLink>
        </div>
        <div v-else class="capture-empty">
          <ScanLine :size="22" />
          <span>完成采集后，结果会显示在这里。</span>
        </div>
      </div>
    </section>

    <div class="overview-columns">
      <section class="overview-section lifecycle-section">
        <div class="section-heading compact">
          <div>
            <p>生命周期</p>
            <h2>原型进度</h2>
          </div>
        </div>
        <div class="lifecycle-list">
          <RouterLink
            v-for="item in lifecycleCards"
            :key="item.id"
            :to="item.to"
            :class="`lifecycle-${item.id}`"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.count }}</strong>
          </RouterLink>
        </div>
      </section>

      <section class="overview-section attention-section">
        <div class="section-heading compact">
          <div>
            <p>待处理</p>
            <h2>评审动态</h2>
          </div>
        </div>
        <div v-if="openComments.length" class="attention-list">
          <RouterLink
            v-for="comment in openComments.slice(0, 4)"
            :key="comment.id"
            :to="`/workbench/prototypes/${comment.prototypeId}/screens/${comment.screenSlug ?? comment.screenId.split('.').pop()}?variant=${comment.variantId ?? 'default'}`"
          >
            <MessageSquareText :size="16" />
            <span>
              <strong>{{ comment.elementLabel || "页面评论" }}</strong>
              <small>{{ comment.content }}</small>
            </span>
            <ArrowRight :size="14" />
          </RouterLink>
        </div>
        <div v-else class="all-clear">
          <span><CheckCircle2 :size="21" /></span>
          <div>
            <strong>当前没有待处理评论</strong>
            <small>新的原型评论会集中显示在这里。</small>
          </div>
        </div>
      </section>
    </div>

    <section class="overview-section assets-section">
      <div class="section-heading compact">
        <div>
          <p>资源概况</p>
          <h2>设计系统资产</h2>
        </div>
      </div>
      <div class="asset-grid">
        <RouterLink v-for="item in assetStats" :key="item.label" :to="item.to">
          <span><component :is="item.icon" :size="17" /></span>
          <div>
            <strong>{{ item.value }}</strong
            ><small>{{ item.label }}</small>
          </div>
          <ArrowRight :size="14" />
        </RouterLink>
      </div>
    </section>
  </section>
</template>

<style scoped>
.overview-page {
  width: min(1240px, 100%);
  display: grid;
  gap: 28px;
  margin: 0 auto;
}
.overview-hero {
  position: relative;
  display: flex;
  min-height: 150px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  overflow: hidden;
  padding: 28px 30px;
  border: 1px solid
    color-mix(in srgb, rgb(var(--v-theme-primary)) 18%, transparent);
  border-radius: 22px;
  background:
    radial-gradient(
      circle at 88% 20%,
      color-mix(in srgb, rgb(var(--v-theme-primary)) 22%, transparent),
      transparent 30%
    ),
    linear-gradient(
      135deg,
      color-mix(
        in srgb,
        rgb(var(--v-theme-primary)) 11%,
        rgb(var(--v-theme-surface))
      ),
      rgb(var(--v-theme-surface)) 65%
    );
}
.overview-hero::after {
  content: "";
  position: absolute;
  right: 8%;
  top: -55px;
  width: 190px;
  height: 190px;
  border: 26px solid
    color-mix(in srgb, rgb(var(--v-theme-primary)) 7%, transparent);
  border-radius: 48px;
  transform: rotate(28deg);
}
.overview-hero > * {
  position: relative;
  z-index: 1;
}
.overview-hero p,
.section-heading p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 7px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.03em;
}
.overview-hero h1 {
  margin: 0 0 8px;
  font-size: clamp(1.8rem, 3vw, 2.45rem);
  letter-spacing: -0.035em;
}
.overview-hero div > span {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.88rem;
}
.all-prototypes {
  display: inline-flex;
  height: 38px;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  border-radius: 10px;
  color: rgb(var(--v-theme-on-action));
  background: rgb(var(--v-theme-action));
  text-decoration: none;
  font-size: 0.78rem;
  font-weight: 700;
}
.overview-section {
  display: grid;
  gap: 14px;
}
.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}
.section-heading h2 {
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: -0.015em;
}
.section-heading > span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.72rem;
}
.section-heading.compact h2 {
  font-size: 1rem;
}
.focus-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.focus-card {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 17px;
  color: inherit;
  background: rgb(var(--v-theme-surface));
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}
.focus-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 35%,
    transparent
  );
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
}
.prototype-visual {
  position: relative;
  display: grid;
  grid-template-columns: 32px 1fr;
  grid-template-rows: 18px 1fr;
  gap: 6px;
  min-height: 168px;
  padding: 22px 15px;
  background: linear-gradient(
    145deg,
    color-mix(
      in srgb,
      rgb(var(--v-theme-primary)) 16%,
      rgb(var(--v-theme-background))
    ),
    rgb(var(--v-theme-background))
  );
}
.prototype-visual span {
  border-radius: 5px;
  background: rgba(var(--v-theme-on-surface), 0.1);
}
.prototype-visual .visual-nav {
  grid-row: 1 / 3;
}
.prototype-visual .visual-card {
  width: 72%;
}
.prototype-visual i {
  position: absolute;
  right: 14px;
  bottom: 18px;
  width: 36px;
  height: 13px;
  border-radius: 5px;
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 55%, transparent);
}
.focus-card-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 17px;
}
.focus-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.prototype-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  color: rgb(var(--v-theme-primary));
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 11%, transparent);
}
.focus-title div {
  min-width: 0;
  flex: 1;
}
.focus-title small {
  display: block;
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font:
    600 0.6rem ui-monospace,
    monospace;
  text-overflow: ellipsis;
}
.focus-title h3 {
  margin: 2px 0 0;
  font-size: 0.98rem;
}
.focus-title em {
  padding: 4px 7px;
  border-radius: 999px;
  color: rgb(var(--v-theme-primary));
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
  font-size: 0.62rem;
  font-style: normal;
  font-weight: 700;
}
.focus-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 18px;
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.68rem;
}
.focus-metrics span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.focus-card footer {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: auto;
  padding-top: 15px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 700;
}
.section-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 700;
  text-decoration: none;
}
.capture-section {
  padding: 19px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 17px;
  background: rgb(var(--v-theme-surface));
}
.capture-overview {
  display: grid;
  grid-template-columns: minmax(260px, 0.72fr) minmax(0, 1.28fr);
  gap: 14px;
}
.capture-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}
.capture-stats article {
  display: grid;
  align-content: center;
  gap: 3px;
  min-height: 76px;
  padding: 11px;
  border-radius: 11px;
  background: rgba(var(--v-theme-on-surface), 0.035);
}
.capture-stats article.attention {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 7%, transparent);
}
.capture-stats span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.66rem;
}
.capture-stats strong {
  font-size: 1.25rem;
}
.capture-result-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}
.capture-result-list a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  min-height: 50px;
  padding: 8px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
}
.capture-result-list a:hover {
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 38%,
    transparent
  );
}
.capture-result-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 10%, transparent);
  color: rgb(var(--v-theme-success));
}
.capture-result-list a > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.capture-result-list small {
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.64rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.capture-empty {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 11px;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.72rem;
}
.overview-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 22px;
}
.lifecycle-section,
.attention-section,
.assets-section {
  padding: 19px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 17px;
  background: rgb(var(--v-theme-surface));
}
.lifecycle-list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 7px;
}
.lifecycle-list a {
  display: grid;
  gap: 10px;
  padding: 12px 10px;
  border-radius: 11px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  background: rgba(var(--v-theme-on-surface), 0.035);
  text-decoration: none;
  font-size: 0.68rem;
}
.lifecycle-list a:hover {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 9%, transparent);
}
.lifecycle-list strong {
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.25rem;
}
.attention-list {
  display: grid;
  gap: 6px;
}
.attention-list a {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 8px;
  border-radius: 9px;
  color: inherit;
  text-decoration: none;
}
.attention-list a:hover {
  background: rgba(var(--v-theme-on-surface), 0.045);
}
.attention-list span {
  display: grid;
  min-width: 0;
  flex: 1;
}
.attention-list strong,
.attention-list small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attention-list strong {
  font-size: 0.74rem;
}
.attention-list small {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.66rem;
}
.all-clear {
  display: flex;
  min-height: 92px;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border-radius: 12px;
  color: rgb(var(--v-theme-success));
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 8%, transparent);
}
.all-clear > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 12%, transparent);
}
.all-clear div {
  display: grid;
  gap: 3px;
}
.all-clear strong {
  font-size: 0.76rem;
}
.all-clear small {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.68rem;
}
.asset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;
}
.asset-grid a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  color: inherit;
  text-decoration: none;
}
.asset-grid a:hover {
  border-color: color-mix(
    in srgb,
    rgb(var(--v-theme-primary)) 35%,
    transparent
  );
  background: var(--shell-soft);
}
.asset-grid a > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  color: rgb(var(--v-theme-primary));
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
}
.asset-grid a > div {
  display: grid;
  flex: 1;
}
.asset-grid strong {
  font-size: 1rem;
}
.asset-grid small {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.66rem;
}
@media (max-width: 1050px) {
  .focus-grid,
  .overview-columns,
  .capture-overview {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 760px) {
  .overview-hero {
    align-items: flex-start;
    flex-direction: column;
  }
  .focus-card {
    grid-template-columns: 105px minmax(0, 1fr);
  }
  .asset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .capture-result-list {
    grid-template-columns: 1fr;
  }
  .lifecycle-list {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
