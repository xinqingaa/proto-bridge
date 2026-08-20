<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
import {
  atmosphereStyle,
  prototypeShortLabel,
} from "@/workbench/prototypes/prototypePresentation";

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
const committedPrototypeId = ref(selectedPrototypeId.value);
const shownPreviewPath = ref("");
const incomingPreviewPath = ref("");
const stageEl = ref<HTMLElement | null>(null);
const reveal = ref<{
  prototypeId: string;
  x: string;
  y: string;
  expanding: boolean;
} | null>(null);
let revealFrame = 0;
let revealTimer = 0;

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

const stagedPrototypes = computed(() => {
  const selected = selectedPrototype.value;
  if (prototypes.length <= 3) return prototypes;
  const rest = prototypes
    .filter((prototype) => prototype.id !== selected?.id)
    .slice(0, 2);
  return selected ? [selected, ...rest] : prototypes.slice(0, 3);
});

const committedAtmosphere = computed(() =>
  atmosphereStyle(committedPrototypeId.value),
);
const revealAtmosphere = computed(() => {
  if (!reveal.value) return undefined;
  return {
    ...atmosphereStyle(reveal.value.prototypeId),
    "--reveal-x": reveal.value.x,
    "--reveal-y": reveal.value.y,
  };
});

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function finishReveal() {
  window.clearTimeout(revealTimer);
  if (reveal.value) committedPrototypeId.value = reveal.value.prototypeId;
  reveal.value = null;
}

function selectStagedPrototype(prototypeId: string, event: MouseEvent) {
  if (prototypeId === selectedPrototypeId.value && !reveal.value) return;
  selectedPrototypeId.value = prototypeId;
  if (prefersReducedMotion() || !stageEl.value) {
    committedPrototypeId.value = prototypeId;
    reveal.value = null;
    return;
  }
  if (reveal.value) committedPrototypeId.value = reveal.value.prototypeId;
  const stageBox = stageEl.value.getBoundingClientRect();
  const origin = (event.currentTarget as HTMLElement).getBoundingClientRect();
  reveal.value = {
    prototypeId,
    x: `${origin.left + origin.width / 2 - stageBox.left}px`,
    y: `${origin.top + origin.height / 2 - stageBox.top}px`,
    expanding: false,
  };
  cancelAnimationFrame(revealFrame);
  window.clearTimeout(revealTimer);
  revealFrame = requestAnimationFrame(() => {
    revealFrame = requestAnimationFrame(() => {
      if (reveal.value?.prototypeId === prototypeId) {
        reveal.value = { ...reveal.value, expanding: true };
        revealTimer = window.setTimeout(finishReveal, 720);
      }
    });
  });
}

function onRevealEnd(event: TransitionEvent) {
  if (event.propertyName !== "clip-path") return;
  finishReveal();
}

const prototypeOverviewPath = computed(() =>
  selectedPrototype.value
    ? `/workbench/prototypes/${selectedPrototype.value.id}`
    : "",
);

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

watch(
  runtimePreviewPath,
  (next) => {
    if (!next || next === shownPreviewPath.value) return;
    incomingPreviewPath.value = next;
  },
  { immediate: true },
);

const previewPaths = computed(() => {
  const paths = new Set<string>();
  if (shownPreviewPath.value) paths.add(shownPreviewPath.value);
  if (incomingPreviewPath.value) paths.add(incomingPreviewPath.value);
  return [...paths];
});

function onPreviewLoad(path: string) {
  if (path !== incomingPreviewPath.value) return;
  shownPreviewPath.value = path;
  incomingPreviewPath.value = "";
}

onMounted(() => {
  if (!capture.connected) void capture.connect();
  else void capture.refreshConsole();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(revealFrame);
  window.clearTimeout(revealTimer);
});
</script>

<template>
  <section class="overview-page" data-testid="workbench-overview">
    <section
      v-if="selectedPrototype"
      ref="stageEl"
      class="prototype-stage"
      :style="committedAtmosphere"
    >
      <div class="stage-room" aria-hidden="true">
        <i class="stage-ground" />
        <i class="stage-glow" />
        <i class="stage-mist" />
        <i class="stage-orbit" />
      </div>
      <div
        v-if="reveal && revealAtmosphere"
        :key="`${reveal.prototypeId}-${reveal.x}-${reveal.y}`"
        class="stage-room is-reveal"
        :class="{ 'is-expanding': reveal.expanding }"
        :style="revealAtmosphere"
        aria-hidden="true"
        @transitionend="onRevealEnd"
      >
        <i class="stage-ground" />
        <i class="stage-glow" />
        <i class="stage-mist" />
        <i class="stage-orbit" />
      </div>

      <div class="stage-content">
        <div class="stage-copy">
          <nav class="work-switcher" aria-label="台上作品">
            <button
              v-for="prototype in stagedPrototypes"
              :key="prototype.id"
              type="button"
              :class="{ 'is-current': prototype.id === selectedPrototypeId }"
              :aria-pressed="prototype.id === selectedPrototypeId"
              @click="selectStagedPrototype(prototype.id, $event)"
            >
              {{ prototypeShortLabel(prototype) }}
            </button>
          </nav>

          <WorkbenchBadge
            :tone="lifecycleStore.effectiveLifecycle(selectedPrototype)"
          >
            {{
              LIFECYCLE_LABELS[
                lifecycleStore.effectiveLifecycle(selectedPrototype)
              ]
            }}
          </WorkbenchBadge>

          <RouterLink
            v-if="prototypeOverviewPath"
            class="stage-title"
            :to="prototypeOverviewPath"
          >
            <h1 :title="selectedPrototype.label">{{ selectedPrototype.label }}</h1>
          </RouterLink>
          <h1 v-else :title="selectedPrototype.label">{{ selectedPrototype.label }}</h1>
          <p v-if="selectedScreen">
            {{ selectedScreen.label }} ·
            {{
              selectedScreenVariant?.label ?? selectedScreen.defaultVariantId
            }}
          </p>
          <p v-else>这个原型还没有可预览页面。</p>

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

        <div class="runtime-stage">
          <RouterLink
            v-if="selectedScreenPath"
            class="runtime-frame"
            :to="selectedScreenPath"
            :aria-label="`打开画布：${selectedScreen?.label ?? selectedPrototype.label}`"
            data-testid="overview-phone"
          >
            <iframe
              v-for="path in previewPaths"
              :key="path"
              :class="{
                'is-shown':
                  path === shownPreviewPath ||
                  (!shownPreviewPath && path === incomingPreviewPath),
              }"
              :src="path"
              :title="`${selectedPrototype.label} · ${selectedScreen?.label ?? '页面预览'}`"
              width="390"
              height="844"
              tabindex="-1"
              @load="onPreviewLoad(path)"
            />
            <span class="runtime-hint">打开画布</span>
          </RouterLink>
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
  --stage-ground: #16181c;
  --stage-glow: rgba(160, 170, 186, 0.22);
  --stage-mist: rgba(200, 208, 220, 0.08);
  --stage-ink: #f4f6f8;
  --stage-muted: rgba(244, 246, 248, 0.54);
  --stage-orbit: rgba(244, 246, 248, 0.08);
  box-sizing: border-box;
  position: relative;
  display: flex;
  width: 100%;
  aspect-ratio: 1.618 / 1;
  overflow: hidden;
  flex-direction: column;
  padding: 22px 32px 0;
  border: 1px solid color-mix(in srgb, var(--stage-ink) 12%, transparent);
  border-radius: 24px;
  background: var(--stage-ground);
  color: var(--stage-ink);
  box-shadow: 0 20px 54px rgba(8, 12, 20, 0.18);
}

.stage-room {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.stage-ground,
.stage-glow,
.stage-mist,
.stage-orbit {
  position: absolute;
  display: block;
}

.stage-ground {
  inset: 0;
  background: var(--stage-ground);
}

.stage-glow {
  top: -80px;
  right: -20px;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: var(--stage-glow);
  filter: blur(8px);
}

.stage-mist {
  right: 20px;
  bottom: -80px;
  width: 460px;
  height: 460px;
  border-radius: 50%;
  background: var(--stage-mist);
  filter: blur(14px);
}

.stage-orbit {
  right: -120px;
  bottom: -300px;
  width: 680px;
  height: 680px;
  border: 1px solid var(--stage-orbit);
  border-radius: 50%;
  box-shadow:
    0 0 0 70px color-mix(in srgb, var(--stage-ink) 2%, transparent),
    0 0 0 140px color-mix(in srgb, var(--stage-ink) 1.2%, transparent);
}

.stage-room.is-reveal {
  z-index: 1;
  clip-path: circle(0 at var(--reveal-x) var(--reveal-y));
}

.stage-room.is-reveal.is-expanding {
  clip-path: circle(160% at var(--reveal-x) var(--reveal-y));
  transition: clip-path 1640ms cubic-bezier(0.22, 1, 0.36, 1);
}

.work-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 28px;
}

.work-switcher button {
  min-height: 30px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--stage-muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}

.work-switcher button:hover {
  color: var(--stage-ink);
}

.work-switcher button.is-current {
  background: color-mix(in srgb, var(--stage-ink) 12%, transparent);
  color: var(--stage-ink);
}

.stage-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  min-height: 0;
  justify-content: space-between;
  gap: 36px;
}

.stage-copy {
  position: relative;
  z-index: 2;
  min-width: 0;
  width: min(54%, 560px);
  padding: 16px 0 24px 20px;
}

.stage-title {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
}

.stage-copy h1 {
  overflow: hidden;
  margin: 14px 0 0;
  font-size: clamp(1.7rem, 3vw, 2.6rem);
  font-weight: 650;
  letter-spacing: -0.04em;
  line-height: 1.15;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.stage-title:hover h1,
.stage-title:focus-visible h1 {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 8px;
}

.stage-copy > p {
  margin: 16px 0 0;
  color: var(--stage-muted);
  font-size: 0.8rem;
}

.stage-metrics {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 19px;
  margin-top: 32px;
}

.stage-metrics > span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: color-mix(in srgb, var(--stage-ink) 42%, transparent);
  font-size: 0.62rem;
}

.stage-metrics b {
  color: color-mix(in srgb, var(--stage-ink) 88%, transparent);
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
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.runtime-frame {
  position: absolute;
  right: 52px;
  bottom: -80px;
  width: 304px;
  height: 658px;
  overflow: hidden;
  pointer-events: auto;
  border-radius: 24px;
  background: #ffffff;
  box-shadow:
    0 0 0 7px #111419,
    0 0 0 8px color-mix(in srgb, var(--stage-ink) 12%, transparent),
    0 28px 64px rgba(3, 6, 12, 0.42);
  transform: rotate(6.5deg);
  transition:
    transform 220ms ease,
    box-shadow 220ms ease;
}

.runtime-frame:hover,
.runtime-frame:focus-visible {
  transform: rotate(6.5deg) translateY(-8px);
  box-shadow:
    0 0 0 7px #111419,
    0 0 0 8px color-mix(in srgb, var(--stage-ink) 18%, transparent),
    0 34px 70px rgba(3, 6, 12, 0.48);
  outline: none;
}

.runtime-frame iframe {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 390px;
  height: 844px;
  border: 0;
  background: #ffffff;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.78);
  transform-origin: top left;
  transition: opacity 280ms ease;
}

.runtime-frame iframe.is-shown {
  opacity: 1;
}

.runtime-hint {
  position: absolute;
  right: 16px;
  bottom: 96px;
  z-index: 2;
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(17, 20, 25, 0.72);
  color: #f7f9fd;
  font-size: 0.68rem;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease;
}

.runtime-frame:hover .runtime-hint,
.runtime-frame:focus-visible .runtime-hint {
  opacity: 1;
}

.runtime-empty {
  position: absolute;
  top: 50%;
  right: 72px;
  display: flex;
  width: 304px;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  border: 1px dashed color-mix(in srgb, var(--stage-ink) 18%, transparent);
  border-radius: 24px;
  color: var(--stage-muted);
  font-size: 0.72rem;
  transform: translateY(-50%);
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
  margin: 0 0 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 700;
  text-decoration: none;
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
    aspect-ratio: auto;
    padding: 20px 20px 0;
  }

  .stage-content {
    flex: none;
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    gap: 0;
  }

  .stage-copy {
    width: 100%;
    padding: 8px 0 16px;
  }

  .runtime-stage {
    position: relative;
    inset: auto;
    width: 100%;
    height: 360px;
    overflow: hidden;
    pointer-events: auto;
  }

  .runtime-frame {
    right: 50%;
    bottom: -120px;
    transform: translateX(50%) rotate(6.5deg);
  }

  .runtime-frame:hover,
  .runtime-frame:focus-visible {
    transform: translateX(50%) rotate(6.5deg) translateY(-8px);
  }

  .runtime-empty {
    position: relative;
    top: auto;
    right: auto;
    min-height: 220px;
    margin: 24px auto;
    transform: none;
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
  .stage-ground,
  .stage-glow,
  .stage-mist,
  .stage-orbit,
  .stage-room.is-reveal.is-expanding,
  .runtime-frame,
  .runtime-frame iframe,
  .runtime-hint {
    transition: none;
  }

  .runtime-frame:hover,
  .runtime-frame:focus-visible {
    transform: rotate(6.5deg);
  }
}

@media (max-width: 760px) and (prefers-reduced-motion: reduce) {
  .runtime-frame:hover,
  .runtime-frame:focus-visible {
    transform: translateX(50%) rotate(6.5deg);
  }
}
</style>
