<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Component,
  FileStack,
  GitBranch,
  Layers3,
  MessageSquareText,
  Palette,
  ScanLine,
  SwatchBook,
} from "lucide-vue-next";
import {
  loadPrototypeScreens,
  loadPrototypes,
  loadThemes,
  loadTokens,
} from "@/design-system/loaders";
import { componentRecords } from "@/design-system/components/registry";
import {
  LIFECYCLE_LABELS,
  type PrototypeLifecycle,
  type PrototypeRecord,
  type ScreenRecord,
} from "@/design-system/types";
import { useCommentsStore } from "@/app/stores/comments";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { useCaptureStore } from "@/app/stores/capture";
import { buildCaptureTaskPresentations } from "@/capture/presentation";
import WorkbenchBadge from "@/workbench/ui/WorkbenchBadge.vue";
import WorkbenchTabs from "@/workbench/ui/WorkbenchTabs.vue";

const prototypes = loadPrototypes();
const screens = loadPrototypeScreens();
const comments = useCommentsStore();
const lifecycleStore = usePrototypeLifecycleStore();
const capture = useCaptureStore();

const defaultPrototype =
  prototypes.find(
    (prototype) => lifecycleStore.effectiveLifecycle(prototype) === "active",
  ) ?? prototypes[0];
const selectedPrototypeId = ref(defaultPrototype?.id ?? "");
const previewReady = ref(false);

const prototypeTabs = computed(() =>
  prototypes.slice(0, 4).map((prototype) => ({
    label: prototype.label,
    value: prototype.id,
  })),
);

const selectedPrototype = computed<PrototypeRecord | undefined>(
  () =>
    prototypes.find(
      (prototype) => prototype.id === selectedPrototypeId.value,
    ) ?? prototypes[0],
);

function screensFor(prototypeId: string): ScreenRecord[] {
  return screens.filter((screen) => screen.prototypeId === prototypeId);
}

function preferredScreen(prototype: PrototypeRecord): ScreenRecord | undefined {
  const items = screensFor(prototype.id);
  const preferredSlug =
    prototype.screenGroups?.find((group) => group.id === "root-tabs")
      ?.screenSlugs[0] ?? prototype.screenGroups?.[0]?.screenSlugs[0];
  return (
    items.find((screen) => screen.screenSlug === preferredSlug) ?? items[0]
  );
}

const selectedScreen = computed(() =>
  selectedPrototype.value
    ? preferredScreen(selectedPrototype.value)
    : undefined,
);

const selectedScreenVariant = computed(
  () =>
    selectedScreen.value?.variants.find(
      (variant) => variant.id === selectedScreen.value?.defaultVariantId,
    ) ?? selectedScreen.value?.variants[0],
);

const runtimePreviewPath = computed(() => {
  const prototype = selectedPrototype.value;
  const screen = selectedScreen.value;
  if (!prototype || !screen) return "";
  const query = new URLSearchParams({
    variant: selectedScreenVariant.value?.id ?? screen.defaultVariantId,
    theme: prototype.defaultThemeId,
  });
  return `${screen.path}?${query.toString()}`;
});

const selectedScreenPath = computed(() => {
  const prototype = selectedPrototype.value;
  const screen = selectedScreen.value;
  if (!prototype || !screen) return "";
  return `/workbench/prototypes/${prototype.id}/screens/${screen.screenSlug}`;
});

const openComments = computed(() =>
  comments.comments.filter((comment) => comment.status === "open"),
);
const captureTasks = computed(() =>
  buildCaptureTaskPresentations(capture.consoleState),
);
const attentionTasks = computed(() =>
  captureTasks.value.filter((item) => item.status === "needs-attention"),
);
const runningTasks = computed(() =>
  captureTasks.value.filter((item) => item.status === "running"),
);
const selectedAttentionCount = computed(
  () =>
    attentionTasks.value.filter(
      (item) => item.prototypeId === selectedPrototype.value?.id,
    ).length,
);

const captureResults = computed(() =>
  (capture.consoleState?.bundles ?? [])
    .filter((item) => item.activeSnapshot)
    .slice(0, 2),
);
const captureResultCount = computed(
  () =>
    (capture.consoleState?.bundles ?? []).filter((item) => item.activeSnapshot)
      .length,
);

const lifecycleOrder: PrototypeLifecycle[] = [
  "active",
  "review",
  "final",
  "archived",
];
const lifecycleStages = computed(() =>
  lifecycleOrder.map((id) => ({
    id,
    label: LIFECYCLE_LABELS[id],
    prototypes: prototypes.filter(
      (prototype) => lifecycleStore.effectiveLifecycle(prototype) === id,
    ),
  })),
);

const selectedStats = computed(() => {
  const prototype = selectedPrototype.value;
  if (!prototype) return { screens: 0, variants: 0, comments: 0 };
  const items = screensFor(prototype.id);
  return {
    screens: items.length,
    variants: items.reduce((sum, screen) => sum + screen.variants.length, 0),
    comments: openComments.value.filter(
      (comment) => comment.prototypeId === prototype.id,
    ).length,
  };
});

const totalVariants = computed(() =>
  screens.reduce((sum, screen) => sum + screen.variants.length, 0),
);
const tokenCategories = computed(
  () => new Set(loadTokens().map((token) => token.category)).size,
);
const componentCategories = computed(
  () => new Set(componentRecords.map((component) => component.category)).size,
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

function resultPrototypeLabel(item: (typeof captureResults.value)[number]) {
  return (
    prototypes.find((prototype) => prototype.id === item.bundle.prototypeId)
      ?.label ?? item.bundle.prototypeId
  );
}

watch(selectedPrototypeId, () => {
  previewReady.value = false;
});

onMounted(() => {
  if (!capture.connected) void capture.connect();
  else void capture.refreshConsole();
});
</script>

<template>
  <section class="overview-page" data-testid="workbench-overview">
    <section v-if="selectedPrototype" class="prototype-stage">
      <div class="stage-orbit" aria-hidden="true" />
      <header class="stage-header">
        <div>
          <p>PBWork 概览</p>
          <h1>继续制作</h1>
        </div>
        <RouterLink to="/workbench/prototypes/all" class="stage-all-link">
          全部原型 <ArrowRight :size="15" />
        </RouterLink>
      </header>

      <WorkbenchTabs
        v-model="selectedPrototypeId"
        class="prototype-switcher"
        :items="prototypeTabs"
        label="切换当前原型"
      />

      <div class="stage-content">
        <div class="stage-copy">
          <WorkbenchBadge
            :tone="lifecycleStore.effectiveLifecycle(selectedPrototype)"
          >
            {{
              LIFECYCLE_LABELS[
                lifecycleStore.effectiveLifecycle(selectedPrototype)
              ]
            }}
          </WorkbenchBadge>
          <h2>{{ selectedPrototype.label }}</h2>
          <p v-if="selectedScreen">
            {{ selectedScreen.label }} ·
            {{
              selectedScreenVariant?.label ?? selectedScreen.defaultVariantId
            }}
          </p>
          <p v-else>这个原型还没有可预览页面。</p>

          <div class="stage-actions">
            <RouterLink
              v-if="selectedScreenPath"
              :to="selectedScreenPath"
              class="stage-primary-action"
            >
              继续工作 <ArrowRight :size="15" />
            </RouterLink>
            <RouterLink
              :to="`/workbench/prototypes/${selectedPrototype.id}`"
              class="stage-secondary-action"
            >
              打开原型
            </RouterLink>
          </div>

          <div class="stage-metrics">
            <span
              ><b>{{ selectedStats.screens }}</b> 页面</span
            >
            <span
              ><b>{{ selectedStats.variants }}</b> 状态</span
            >
            <span v-if="selectedStats.comments">
              <b>{{ selectedStats.comments }}</b> 条评审
            </span>
            <RouterLink
              v-if="selectedAttentionCount"
              to="/workbench/capture"
              class="stage-attention"
            >
              <CircleAlert :size="14" />
              {{ selectedAttentionCount }} 个采集问题
            </RouterLink>
          </div>
        </div>

        <div class="runtime-stage" :class="{ ready: previewReady }">
          <div v-if="runtimePreviewPath" class="runtime-frame">
            <iframe
              :key="runtimePreviewPath"
              :src="runtimePreviewPath"
              :title="`${selectedPrototype.label} · ${selectedScreen?.label ?? '页面预览'}`"
              width="390"
              height="844"
              tabindex="-1"
              loading="eager"
              @load="previewReady = true"
            />
          </div>
          <div v-else class="runtime-empty">
            <Layers3 :size="26" />
            <span>还没有可预览页面</span>
          </div>
        </div>
      </div>
    </section>

    <section class="overview-block lifecycle-block">
      <header class="block-header">
        <div>
          <p>原型</p>
          <h2>原型流转</h2>
          <span>从正在制作到确认与归档，每个原型只出现一次。</span>
        </div>
        <RouterLink to="/workbench/prototypes/all">
          查看全部原型 <ArrowRight :size="14" />
        </RouterLink>
      </header>

      <div class="lifecycle-track">
        <section
          v-for="(stage, index) in lifecycleStages"
          :key="stage.id"
          class="lifecycle-stage"
        >
          <div class="stage-rail" aria-hidden="true">
            <span class="stage-node" :class="`is-${stage.id}`" />
            <span
              v-if="index < lifecycleStages.length - 1"
              class="track-line"
            />
          </div>
          <header class="lifecycle-label">
            <RouterLink :to="`/workbench/prototypes/${stage.id}`">
              {{ stage.label }}
            </RouterLink>
            <small>{{ stage.prototypes.length }} 个原型</small>
          </header>
          <div class="lifecycle-prototypes">
            <RouterLink
              v-for="prototype in stage.prototypes"
              :key="prototype.id"
              :to="`/workbench/prototypes/${prototype.id}`"
            >
              <strong>{{ prototype.label }}</strong>
              <span>
                {{ screensFor(prototype.id).length }} 页面 ·
                {{
                  screensFor(prototype.id).reduce(
                    (sum, screen) => sum + screen.variants.length,
                    0,
                  )
                }}
                状态
              </span>
            </RouterLink>
            <span v-if="!stage.prototypes.length" class="lifecycle-empty">
              暂无原型
            </span>
          </div>
        </section>
      </div>
    </section>

    <section class="overview-block capture-block">
      <header class="block-header">
        <div>
          <p>采集</p>
          <h2>交付信号</h2>
          <span>先处理阻塞，再检查最近形成的 Evidence。</span>
        </div>
        <RouterLink to="/workbench/capture">
          打开采集台 <ArrowRight :size="14" />
        </RouterLink>
      </header>

      <div v-if="capture.connecting" class="capture-connection">
        正在连接采集服务…
      </div>
      <div v-else-if="!capture.connected" class="capture-connection is-offline">
        <CircleAlert :size="17" />
        <span>采集服务未连接，进入采集台可查看连接状态。</span>
        <RouterLink to="/workbench/capture">查看采集台</RouterLink>
      </div>
      <div v-else class="capture-signal">
        <div class="capture-status">
          <span
            class="capture-status-icon"
            :class="{ attention: attentionTasks.length }"
          >
            <CircleAlert v-if="attentionTasks.length" :size="19" />
            <CheckCircle2 v-else :size="19" />
          </span>
          <div>
            <small>{{ attentionTasks.length ? "需要处理" : "当前状态" }}</small>
            <strong v-if="attentionTasks.length">
              {{ attentionTasks.length }} 个采集任务需要处理
            </strong>
            <strong v-else>当前没有采集阻塞</strong>
            <span v-if="runningTasks.length">
              另有 {{ runningTasks.length }} 个任务正在进行
            </span>
            <span v-else>可以继续制作或检查最近结果</span>
          </div>
        </div>

        <div class="capture-results">
          <header>
            <span>最近结果</span>
            <small>{{ captureResultCount }} 个可检查结果</small>
          </header>
          <RouterLink
            v-for="item in captureResults"
            :key="item.bundle.bundleId"
            :to="captureResultPath(item)"
          >
            <span class="result-icon"><ScanLine :size="15" /></span>
            <span>
              <strong>{{ resultPrototypeLabel(item) }}</strong>
              <small>
                {{ captureResultLabel(item) }} · {{ captureResultTime(item) }}
              </small>
            </span>
            <ArrowRight :size="14" />
          </RouterLink>
          <p v-if="!captureResults.length" class="capture-empty">
            完成第一次采集后，结果会显示在这里。
          </p>
        </div>
      </div>
    </section>

    <section class="overview-block resources-block">
      <header class="block-header">
        <div>
          <p>资源</p>
          <h2>制作资源</h2>
          <span>设计基础定义语言，组件库把语言变成可复用能力。</span>
        </div>
      </header>

      <div class="resource-index">
        <RouterLink
          to="/workbench/foundations/tokens/color"
          class="resource-entry"
        >
          <span class="resource-icon"><Palette :size="19" /></span>
          <div>
            <small>设计基础</small>
            <h3>{{ loadTokens().length }} 个设计令牌</h3>
            <p>
              {{ loadThemes().length }} 套主题 ·
              {{ tokenCategories }} 个语义分类
            </p>
          </div>
          <span class="resource-action">
            查看设计基础 <ArrowRight :size="14" />
          </span>
        </RouterLink>

        <RouterLink
          :to="`/workbench/components/${componentRecords[0]?.id ?? 'button'}`"
          class="resource-entry"
        >
          <span class="resource-icon"><Component :size="19" /></span>
          <div>
            <small>组件库</small>
            <h3>{{ componentRecords.length }} 个组件</h3>
            <p>{{ componentCategories }} 个能力分类 · Contract 与场景可检查</p>
          </div>
          <span class="resource-action">
            查看组件库 <ArrowRight :size="14" />
          </span>
        </RouterLink>
      </div>

      <footer class="resource-footnotes">
        <RouterLink to="/workbench/prototypes/all">
          <FileStack :size="15" />
          <span
            ><b>{{ screens.length }}</b> 页面</span
          >
        </RouterLink>
        <RouterLink to="/workbench/prototypes/all">
          <GitBranch :size="15" />
          <span
            ><b>{{ totalVariants }}</b> 状态</span
          >
        </RouterLink>
        <RouterLink to="/workbench/foundations/themes/light">
          <SwatchBook :size="15" />
          <span
            ><b>{{ loadThemes().length }}</b> 主题</span
          >
        </RouterLink>
        <RouterLink v-if="openComments.length" to="/workbench/prototypes/all">
          <MessageSquareText :size="15" />
          <span
            ><b>{{ openComments.length }}</b> 条开放评审</span
          >
        </RouterLink>
      </footer>
    </section>
  </section>
</template>

<style scoped>
.overview-page {
  width: min(1240px, 100%);
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin: 0 auto;
}

.prototype-stage {
  position: relative;
  min-height: 520px;
  overflow: hidden;
  padding: 28px 32px 0;
  border: 1px solid rgba(119, 148, 213, 0.2);
  border-radius: 24px;
  background:
    radial-gradient(
      circle at 82% 18%,
      rgba(112, 143, 222, 0.3),
      transparent 29%
    ),
    radial-gradient(
      circle at 96% 88%,
      rgba(111, 91, 201, 0.18),
      transparent 33%
    ),
    linear-gradient(132deg, #161b24 0%, #202735 58%, #172132 100%);
  color: #f7f9fd;
  box-shadow: 0 20px 54px rgba(8, 12, 20, 0.18);
}

.stage-orbit {
  position: absolute;
  right: -105px;
  bottom: -285px;
  width: 660px;
  height: 660px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 50%;
  box-shadow:
    0 0 0 70px rgba(255, 255, 255, 0.018),
    0 0 0 140px rgba(255, 255, 255, 0.012);
}

.stage-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.stage-header p,
.block-header p {
  margin: 0 0 5px;
  color: #8ba9ee;
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stage-header h1 {
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: -0.025em;
}

.stage-all-link,
.block-header > a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
}

.stage-all-link {
  color: rgba(247, 249, 253, 0.68);
}

.prototype-switcher {
  position: relative;
  z-index: 2;
  margin-top: 18px;
}

.prototype-switcher :deep(.wb-tabs) {
  max-width: 100%;
  overflow-x: auto;
  background: rgba(255, 255, 255, 0.06);
}

.prototype-switcher :deep(button) {
  color: rgba(247, 249, 253, 0.55);
  white-space: nowrap;
}

.prototype-switcher :deep(button:hover) {
  color: rgba(247, 249, 253, 0.88);
}

.prototype-switcher :deep(button.is-active) {
  background: rgba(255, 255, 255, 0.13);
  color: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.stage-content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 415px;
  align-items: center;
  justify-content: space-between;
  gap: 42px;
}

.stage-copy {
  position: relative;
  z-index: 2;
  width: min(53%, 560px);
  padding: 38px 0 54px 52px;
}

.stage-copy h2 {
  max-width: 540px;
  margin: 16px 0 0;
  font-size: clamp(2.5rem, 5vw, 4.65rem);
  font-weight: 650;
  letter-spacing: -0.065em;
  line-height: 0.99;
}

.stage-copy > p {
  margin: 17px 0 0;
  color: rgba(247, 249, 253, 0.54);
  font-size: 0.8rem;
}

.stage-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 27px;
}

.stage-primary-action,
.stage-secondary-action {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 15px;
  border-radius: 10px;
  font-size: 0.76rem;
  font-weight: 750;
  text-decoration: none;
}

.stage-primary-action {
  background: #f7f9fd;
  color: #171c26;
}

.stage-secondary-action {
  border: 1px solid rgba(255, 255, 255, 0.13);
  color: rgba(247, 249, 253, 0.78);
  background: rgba(255, 255, 255, 0.04);
}

.stage-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 19px;
  margin-top: 35px;
}

.stage-metrics > span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: rgba(247, 249, 253, 0.42);
  font-size: 0.62rem;
}

.stage-metrics b {
  color: rgba(247, 249, 253, 0.88);
  font-size: 0.88rem;
}

.stage-attention {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #f0a39b;
  font-size: 0.68rem;
  font-weight: 700;
  text-decoration: none;
}

.runtime-stage {
  position: relative;
  align-self: stretch;
  flex: 1;
  min-width: 360px;
  overflow: hidden;
  opacity: 0.45;
  transition:
    opacity 220ms ease,
    transform 220ms ease;
  transform: translateY(7px);
}

.runtime-stage.ready {
  opacity: 1;
  transform: translateY(0);
}

.runtime-frame {
  position: absolute;
  top: 32px;
  right: 68px;
  width: 230px;
  height: 498px;
  overflow: hidden;
  border-radius: 24px 24px 0 0;
  background: #ffffff;
  box-shadow:
    0 0 0 7px #111419,
    0 0 0 8px rgba(255, 255, 255, 0.1),
    0 28px 64px rgba(3, 6, 12, 0.42);
  transform: rotate(1.5deg);
}

.runtime-frame iframe {
  display: block;
  width: 390px;
  height: 844px;
  border: 0;
  background: #ffffff;
  pointer-events: none;
  transform: scale(0.59);
  transform-origin: top left;
}

.runtime-empty {
  position: absolute;
  inset: 60px 68px 60px auto;
  display: flex;
  width: 230px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  color: rgba(247, 249, 253, 0.45);
  font-size: 0.72rem;
}

.overview-block {
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 4px 2px 28px;

}

.block-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.block-header p {
  color: rgb(var(--v-theme-primary));
}

.block-header h2 {
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: -0.025em;
}

.block-header div > span {
  display: block;
  margin-top: 5px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.72rem;
}

.block-header > a {
  color: rgb(var(--v-theme-primary));
}

.lifecycle-block {
  gap: 25px;
  padding: 24px;
  /* border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 18px;
  background: linear-gradient(
    145deg,
    color-mix(
      in srgb,
      rgb(var(--v-theme-primary)) 4%,
      rgb(var(--v-theme-surface))
    ),
    rgb(var(--v-theme-surface)) 58%
  ); */
}

.lifecycle-block .block-header h2 {
  font-size: 1.5rem;
}

.lifecycle-track {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  padding: 24px 22px 22px;
}

.lifecycle-stage {
  position: relative;
  min-width: 0;
  padding-right: 20px;
}

.lifecycle-stage:last-child {
  padding-right: 0;
}

.stage-rail {
  position: relative;
  display: flex;
  height: 18px;
  align-items: center;
}

.stage-node {
  position: relative;
  z-index: 2;
  width: 14px;
  height: 14px;
  flex: none;
  border: 4px solid rgb(var(--v-theme-surface));
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  box-shadow:
    0 0 0 1px rgb(var(--v-theme-primary)),
    0 2px 7px color-mix(in srgb, rgb(var(--v-theme-primary)) 24%, transparent);
}

.stage-node.is-review {
  background: rgb(var(--v-theme-warning));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-warning));
}

.stage-node.is-final {
  background: rgb(var(--v-theme-success));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-success));
}

.stage-node.is-archived {
  background: rgba(var(--v-theme-on-surface), 0.35);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-on-surface), 0.35);
}

.lifecycle-label {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-top: 8px;
}

.lifecycle-label a {
  color: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  text-decoration: none;
}

.lifecycle-label small {
  color: rgba(var(--v-theme-on-surface), 0.38);
  font-size: 0.62rem;
}

.track-line {
  position: absolute;
  z-index: 1;
  top: 8px;
  left: 14px;
  width: calc(100% + 6px);
  height: 2px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, rgb(var(--v-theme-primary)) 42%, transparent),
    rgba(var(--v-theme-on-surface), 0.16)
  );
}

.lifecycle-prototypes {
  display: flex;
  min-height: 96px;
  flex-direction: column;
  gap: 7px;
  margin: 14px 0 0;
}

.lifecycle-prototypes > a {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 10px;
  color: inherit;
  background: rgb(var(--v-theme-surface));
  text-decoration: none;
}

.lifecycle-prototypes > a:hover {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 8%, transparent);
}

.lifecycle-prototypes strong {
  overflow: hidden;
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lifecycle-prototypes span,
.lifecycle-empty {
  color: rgba(var(--v-theme-on-surface), 0.42);
  font-size: 0.61rem;
}

.lifecycle-empty {
  padding: 10px 0;
}

.capture-signal {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(420px, 1.18fr);
  gap: 0;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}

.capture-status {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 126px;
  padding: 22px 24px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.capture-status-icon {
  display: flex;
  width: 42px;
  height: 42px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: rgb(var(--v-theme-success));
  background: color-mix(in srgb, rgb(var(--v-theme-success)) 11%, transparent);
}

.capture-status-icon.attention {
  color: rgb(var(--v-theme-error));
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 10%, transparent);
}

.capture-status div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.capture-status small,
.capture-results header span,
.resource-entry small {
  color: rgba(var(--v-theme-on-surface), 0.44);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.capture-status strong {
  font-size: 0.88rem;
}

.capture-status div > span {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.66rem;
}

.capture-results {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 18px;
}

.capture-results > header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.capture-results header small {
  color: rgba(var(--v-theme-on-surface), 0.38);
  font-size: 0.6rem;
}

.capture-results > a {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 9px;
  border-radius: 9px;
  color: inherit;
  background: rgba(var(--v-theme-on-surface), 0.035);
  text-decoration: none;
}

.result-icon {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: rgb(var(--v-theme-primary));
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 9%, transparent);
}

.capture-results a > span:nth-child(2) {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.capture-results strong,
.capture-results small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capture-results strong {
  font-size: 0.69rem;
}

.capture-results small {
  color: rgba(var(--v-theme-on-surface), 0.44);
  font-size: 0.59rem;
}

.capture-connection {
  display: flex;
  min-height: 92px;
  align-items: center;
  gap: 9px;
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 14px;
  color: rgba(var(--v-theme-on-surface), 0.52);
  background: rgb(var(--v-theme-surface));
  font-size: 0.72rem;
}

.capture-connection.is-offline svg {
  color: rgb(var(--v-theme-warning));
}

.capture-connection a {
  margin-left: auto;
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  text-decoration: none;
}

.capture-empty {
  grid-column: 1 / -1;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.44);
  font-size: 0.66rem;
}

.resources-block {
  border-bottom: 0;
}

.resource-index {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}

.resource-entry {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 24px;
  color: inherit;
  text-decoration: none;
}

.resource-entry:first-child {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.resource-icon {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
}

.resource-entry h3 {
  margin: 4px 0 0;
  font-size: 1.02rem;
  letter-spacing: -0.02em;
}

.resource-entry p {
  margin: 5px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.46);
  font-size: 0.64rem;
}

.resource-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.65rem;
  font-weight: 700;
}

.resource-footnotes {
  display: flex;
  flex-wrap: wrap;
  gap: 22px;
  padding: 0 4px;
}

.resource-footnotes a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.65rem;
  text-decoration: none;
}

.resource-footnotes b {
  color: rgb(var(--v-theme-on-surface));
}

@media (max-width: 1050px) {
  .stage-copy {
    width: 58%;
    padding-left: 12px;
  }

  .runtime-frame {
    right: 34px;
  }

  .capture-signal {
    grid-template-columns: 1fr;
  }

  .capture-status {
    border-right: 0;
    border-bottom: 1px solid
      rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .resource-entry {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .resource-action {
    grid-column: 2;
  }
}

@media (max-width: 760px) {
  .overview-page {
    gap: 24px;
  }

  .prototype-stage {
    min-height: 760px;
    padding: 24px 22px 0;
  }

  .stage-content {
    min-height: 650px;
    align-items: flex-start;
    flex-direction: column;
    gap: 0;
  }

  .stage-copy {
    width: 100%;
    padding: 34px 0 20px;
  }

  .stage-copy h2 {
    font-size: 2.65rem;
  }

  .runtime-stage {
    width: 100%;
    min-width: 0;
    min-height: 360px;
  }

  .runtime-frame {
    top: 20px;
    right: calc(50% - 115px);
  }

  .lifecycle-track,
  .resource-index {
    grid-template-columns: 1fr;
  }

  .lifecycle-block {
    padding: 20px;
  }

  .lifecycle-track {
    padding: 22px 20px 4px;
  }

  .lifecycle-stage {
    display: grid;
    grid-template-columns: 27px minmax(0, 1fr);
    grid-template-rows: auto auto;
    padding: 0 0 20px;
  }

  .stage-rail {
    grid-row: 1 / 3;
    width: 18px;
    height: 100%;
    align-items: flex-start;
    padding-top: 2px;
  }

  .lifecycle-label,
  .lifecycle-prototypes {
    grid-column: 2;
  }

  .lifecycle-label {
    margin-top: 0;
  }

  .track-line {
    top: 15px;
    left: 6px;
    width: 2px;
    height: calc(100% - 3px);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, rgb(var(--v-theme-primary)) 42%, transparent),
      rgba(var(--v-theme-on-surface), 0.16)
    );
  }

  .lifecycle-prototypes {
    min-height: 0;
    margin-top: 10px;
  }

  .capture-results {
    grid-template-columns: 1fr;
  }

  .resource-entry:first-child {
    border-right: 0;
    border-bottom: 1px solid
      rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .block-header {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  .runtime-stage {
    transition: none;
  }
}
</style>
