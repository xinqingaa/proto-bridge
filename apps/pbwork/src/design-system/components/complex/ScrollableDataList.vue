<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
} from "vue";
import { RefreshCw } from "lucide-vue-next";
import Spinner from "@/design-system/components/basic/Spinner.vue";
import { usePbInspect } from "@/runtime/inspect/usePbInspect";

export type PullRefreshOptions = {
  enabled: boolean;
  threshold?: number;
  maxDistance?: number;
  mouse?: boolean;
};

export type LoadMoreOptions = {
  enabled: boolean;
  rootMargin?: string;
  manualFallback?: boolean;
};

const props = withDefaults(
  defineProps<{
    pullRefresh?: boolean | PullRefreshOptions;
    loadMore?: boolean | LoadMoreOptions;
    refreshing?: boolean;
    loadingMore?: boolean;
    hasMore?: boolean;
    disabled?: boolean;
    inspectId?: string;
  }>(),
  {
    pullRefresh: false,
    loadMore: false,
    refreshing: false,
    loadingMore: false,
    hasMore: true,
    disabled: false,
  },
);

const emit = defineEmits<{
  refresh: [];
  "load-more": [];
}>();

const rootRef = ref<HTMLElement | null>(null);
const sentinelRef = ref<HTMLElement | null>(null);
const pullDistance = ref(0);
const rawPullDistance = ref(0);
const pointerId = ref<number | null>(null);
const startX = ref(0);
const startY = ref(0);
const axis = ref<"pending" | "horizontal" | "vertical">("pending");
let observer: IntersectionObserver | null = null;
let loadRequested = false;

const pullConfig = computed<Required<PullRefreshOptions>>(() => {
  const value = props.pullRefresh;
  if (typeof value === "object") {
    return {
      enabled: value.enabled,
      threshold: value.threshold ?? 64,
      maxDistance: value.maxDistance ?? 112,
      mouse: value.mouse ?? false,
    };
  }
  return {
    enabled: value,
    threshold: 64,
    maxDistance: 112,
    mouse: false,
  };
});

const loadConfig = computed<Required<LoadMoreOptions>>(() => {
  const value = props.loadMore;
  if (typeof value === "object") {
    return {
      enabled: value.enabled,
      rootMargin: value.rootMargin ?? "0px 0px 120px 0px",
      manualFallback: value.manualFallback ?? true,
    };
  }
  return {
    enabled: value,
    rootMargin: "0px 0px 120px 0px",
    manualFallback: true,
  };
});

const pulling = computed(
  () => pointerId.value !== null && pullDistance.value > 0,
);
const pullReady = computed(
  () => rawPullDistance.value >= pullConfig.value.threshold,
);
const pullProgress = computed(() =>
  Math.min(1, rawPullDistance.value / pullConfig.value.threshold),
);
const contentStyle = computed<CSSProperties>(() => ({
  transform: `translate3d(0, ${props.refreshing ? 48 : pullDistance.value}px, 0)`,
}));

function canRefresh(event?: PointerEvent) {
  if (
    props.disabled ||
    props.refreshing ||
    props.loadingMore ||
    !pullConfig.value.enabled ||
    (rootRef.value?.scrollTop ?? 0) > 0
  ) {
    return false;
  }
  if (event?.pointerType === "mouse" && !pullConfig.value.mouse) return false;
  return true;
}

function onPointerDown(event: PointerEvent) {
  if (
    !canRefresh(event) ||
    (event.pointerType === "mouse" && event.button !== 0)
  )
    return;
  pointerId.value = event.pointerId;
  startX.value = event.clientX;
  startY.value = event.clientY;
  axis.value = "pending";
}

function onPointerMove(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  const dx = event.clientX - startX.value;
  const dy = event.clientY - startY.value;
  if (axis.value === "pending" && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
    axis.value = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
  }
  if (axis.value === "horizontal") {
    cancelPull();
    return;
  }
  if (axis.value !== "vertical" || dy <= 0 || !canRefresh(event)) return;
  event.preventDefault();
  rawPullDistance.value = dy;
  const resisted = Math.min(
    pullConfig.value.maxDistance,
    dy <= pullConfig.value.threshold
      ? dy * 0.72
      : pullConfig.value.threshold * 0.72 +
          (dy - pullConfig.value.threshold) * 0.28,
  );
  pullDistance.value = resisted;
  rootRef.value?.setPointerCapture?.(event.pointerId);
}

function finishPull(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  const shouldRefresh = pullReady.value && !props.refreshing;
  cancelPull();
  if (shouldRefresh) emit("refresh");
}

function cancelPull() {
  pointerId.value = null;
  pullDistance.value = 0;
  rawPullDistance.value = 0;
  axis.value = "pending";
}

function requestMore() {
  if (
    loadRequested ||
    props.disabled ||
    props.refreshing ||
    props.loadingMore ||
    !props.hasMore ||
    !loadConfig.value.enabled
  ) {
    return;
  }
  loadRequested = true;
  emit("load-more");
}

function setupObserver() {
  observer?.disconnect();
  observer = null;
  if (
    typeof IntersectionObserver === "undefined" ||
    !rootRef.value ||
    !sentinelRef.value ||
    !loadConfig.value.enabled
  ) {
    return;
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) requestMore();
    },
    { root: rootRef.value, rootMargin: loadConfig.value.rootMargin },
  );
  observer.observe(sentinelRef.value);
}

watch(
  () => props.loadingMore,
  (value, previous) => {
    if (previous && !value) loadRequested = false;
  },
);

watch(
  () => [loadConfig.value.enabled, loadConfig.value.rootMargin, props.hasMore],
  async () => {
    loadRequested = false;
    await nextTick();
    setupObserver();
  },
);

usePbInspect({
  element: rootRef,
  pbId: "ds.scrollable-data-list",
  instanceId: computed(() => props.inspectId),
  componentId: "scrollable-data-list",
  getProps: () => ({
    pullRefresh: pullConfig.value.enabled,
    loadMore: loadConfig.value.enabled,
    refreshing: props.refreshing,
    loadingMore: props.loadingMore,
    hasMore: props.hasMore,
    disabled: props.disabled,
    inspectId: props.inspectId,
  }),
  getTokenBindings: () => ({
    background: "color.background",
    primary: "color.primary",
    muted: "color.on-surface-muted",
    footer: "typography.caption",
    duration: "motion.duration-normal",
  }),
  getTokens: () => [
    "color.background",
    "color.primary",
    "color.on-surface-muted",
    "typography.caption",
    "motion.duration-normal",
  ],
});

onMounted(setupObserver);
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section
    ref="rootRef"
    class="pb-scrollable-data-list"
    data-pb-id="ds.scrollable-data-list"
    data-pb-role="scroll-list"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="finishPull"
    @pointercancel="cancelPull"
  >
    <div
      class="pb-scrollable-data-list-refresh"
      :class="{ 'is-ready': pullReady, 'is-visible': pulling || refreshing }"
      :style="{ '--pb-pull-progress': pullProgress }"
      aria-live="polite"
    >
      <slot
        name="refresh-indicator"
        :distance="pullDistance"
        :progress="pullProgress"
        :ready="pullReady"
        :refreshing="refreshing"
      >
        <Spinner v-if="refreshing" label="正在刷新" size="sm" />
        <span v-else>
          <RefreshCw :size="16" aria-hidden="true" />
          {{ pullReady ? "松开刷新" : "下拉刷新" }}
        </span>
      </slot>
    </div>

    <div class="pb-scrollable-data-list-content" :style="contentStyle">
      <slot />
      <div
        v-if="loadConfig.enabled"
        ref="sentinelRef"
        class="pb-scrollable-data-list-sentinel"
        aria-hidden="true"
      />
      <footer class="pb-scrollable-data-list-footer" aria-live="polite">
        <slot
          name="load-footer"
          :loading="loadingMore"
          :has-more="hasMore"
          :load="requestMore"
        >
          <Spinner v-if="loadingMore" label="正在加载更多" size="sm" />
          <slot v-else-if="!hasMore" name="no-more">
            <span>没有更多了</span>
          </slot>
          <button
            v-else-if="loadConfig.enabled && loadConfig.manualFallback"
            type="button"
            class="pb-scrollable-data-list-more"
            @click="requestMore"
          >
            加载更多
          </button>
        </slot>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.pb-scrollable-data-list {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: auto;
  overscroll-behavior-y: contain;
  background: var(--pb-color-background);
  scrollbar-width: none;
  touch-action: pan-y;
}
.pb-scrollable-data-list::-webkit-scrollbar {
  display: none;
}
.pb-scrollable-data-list-refresh {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: grid;
  place-items: center;
  min-height: 44px;
  opacity: 0;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
  transform: translateY(-100%);
  transition: opacity var(--pb-motion-duration-normal, 200ms) ease;
}
.pb-scrollable-data-list-refresh.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.pb-scrollable-data-list-refresh.is-ready {
  color: var(--pb-color-primary);
}
.pb-scrollable-data-list-refresh span {
  display: inline-flex;
  align-items: center;
  gap: var(--pb-spacing-xs, 4px);
}
.pb-scrollable-data-list-content {
  min-height: 100%;
  transition: transform var(--pb-motion-duration-normal, 200ms) ease;
  will-change: transform;
}
.pb-scrollable-data-list-sentinel {
  height: 1px;
}
.pb-scrollable-data-list-footer {
  display: grid;
  min-height: 48px;
  place-items: center;
  color: var(--pb-color-on-surface-muted);
  font: var(--pb-typography-caption);
}
.pb-scrollable-data-list-more {
  min-width: 96px;
  min-height: 36px;
  border: 0;
  border-radius: var(--pb-radius-full);
  background: var(--pb-color-primary-soft);
  color: var(--pb-color-primary);
  font: var(--pb-typography-label);
  cursor: pointer;
}
</style>
