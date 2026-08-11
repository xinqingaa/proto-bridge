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

export type DragScrollOptions = {
  enabled: boolean;
  mouse?: boolean;
  momentum?: boolean;
};

const props = withDefaults(
  defineProps<{
    pullRefresh?: boolean | PullRefreshOptions;
    loadMore?: boolean | LoadMoreOptions;
    dragScroll?: boolean | DragScrollOptions;
    refreshing?: boolean;
    loadingMore?: boolean;
    hasMore?: boolean;
    disabled?: boolean;
    inspectId?: string;
  }>(),
  {
    pullRefresh: false,
    loadMore: false,
    dragScroll: false,
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
const touchIdentifier = ref<number | null>(null);
const startX = ref(0);
const startY = ref(0);
const startScrollTop = ref(0);
const axis = ref<"pending" | "horizontal" | "vertical">("pending");
const gestureMode = ref<"pending" | "pull" | "scroll">("pending");
const dragScrolling = ref(false);
let touchStartX = 0;
let touchStartY = 0;
let touchAxis: "pending" | "horizontal" | "vertical" = "pending";
let observer: IntersectionObserver | null = null;
let loadRequested = false;
let lastMoveTime = 0;
let scrollVelocity = 0;
let momentumFrame: number | null = null;
let suppressClickUntil = 0;

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

const dragConfig = computed<Required<DragScrollOptions>>(() => {
  const value = props.dragScroll;
  if (typeof value === "object") {
    return {
      enabled: value.enabled,
      mouse: value.mouse ?? true,
      momentum: value.momentum ?? true,
    };
  }
  return {
    enabled: value,
    mouse: true,
    momentum: true,
  };
});

const pulling = computed(
  () =>
    (pointerId.value !== null || touchIdentifier.value !== null) &&
    pullDistance.value > 0,
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

function canRefresh(event?: PointerEvent, atTop = true) {
  if (
    props.disabled ||
    props.refreshing ||
    props.loadingMore ||
    !pullConfig.value.enabled ||
    !atTop
  ) {
    return false;
  }
  if (event?.pointerType === "mouse" && !pullConfig.value.mouse) return false;
  return true;
}

function mouseDragEnabled(event: PointerEvent) {
  return (
    event.pointerType === "mouse" &&
    !props.disabled &&
    dragConfig.value.enabled &&
    dragConfig.value.mouse
  );
}

function cancelMomentum() {
  if (momentumFrame !== null) cancelAnimationFrame(momentumFrame);
  momentumFrame = null;
}

function onPointerDown(event: PointerEvent) {
  // Chrome device emulation and real touch screens may cancel vertical pointer
  // events once native panning starts. Touch pull-to-refresh is handled by the
  // explicit non-passive touch boundary below.
  if (event.pointerType === "touch") return;
  const root = rootRef.value;
  if (!root) return;
  cancelMomentum();
  const atTop = root.scrollTop <= 0;
  if (
    (!canRefresh(event, atTop) && !mouseDragEnabled(event)) ||
    (event.pointerType === "mouse" && event.button !== 0)
  )
    return;
  pointerId.value = event.pointerId;
  startX.value = event.clientX;
  startY.value = event.clientY;
  startScrollTop.value = root.scrollTop;
  axis.value = "pending";
  gestureMode.value = "pending";
  dragScrolling.value = false;
  lastMoveTime = event.timeStamp;
  scrollVelocity = 0;
}

function updatePullDistance(distance: number) {
  rawPullDistance.value = distance;
  pullDistance.value = Math.min(
    pullConfig.value.maxDistance,
    distance <= pullConfig.value.threshold
      ? distance * 0.72
      : pullConfig.value.threshold * 0.72 +
          (distance - pullConfig.value.threshold) * 0.28,
  );
}

function onPointerMove(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  const dx = event.clientX - startX.value;
  const dy = event.clientY - startY.value;
  if (axis.value === "pending" && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
    axis.value = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
  }
  if (axis.value === "horizontal") {
    cancelGesture();
    return;
  }
  if (axis.value !== "vertical") return;

  const root = rootRef.value;
  if (!root) return;
  const canPullFromStart =
    startScrollTop.value <= 0 && dy > 0 && canRefresh(event, true);

  if (canPullFromStart) {
    gestureMode.value = "pull";
    event.preventDefault();
    updatePullDistance(dy);
    root.setPointerCapture?.(event.pointerId);
    return;
  }

  if (!mouseDragEnabled(event)) {
    cancelGesture();
    return;
  }

  gestureMode.value = "scroll";
  dragScrolling.value = true;
  event.preventDefault();
  root.setPointerCapture?.(event.pointerId);
  const previousScrollTop = root.scrollTop;
  root.scrollTop = Math.max(0, startScrollTop.value - dy);
  const elapsed = Math.max(1, event.timeStamp - lastMoveTime);
  scrollVelocity = (root.scrollTop - previousScrollTop) / elapsed;
  lastMoveTime = event.timeStamp;
}

function finishPull(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  const moved = Math.hypot(
    event.clientX - startX.value,
    event.clientY - startY.value,
  );
  const shouldRefresh =
    gestureMode.value === "pull" && pullReady.value && !props.refreshing;
  const shouldGlide =
    gestureMode.value === "scroll" &&
    dragConfig.value.momentum &&
    Math.abs(scrollVelocity) >= 0.04;
  if (moved >= 8) suppressClickUntil = Date.now() + 450;
  cancelGesture();
  if (shouldRefresh) emit("refresh");
  if (shouldGlide) startMomentum();
}

function cancelGesture() {
  const root = rootRef.value;
  if (
    root &&
    pointerId.value !== null &&
    root.hasPointerCapture?.(pointerId.value)
  ) {
    root.releasePointerCapture(pointerId.value);
  }
  pointerId.value = null;
  pullDistance.value = 0;
  rawPullDistance.value = 0;
  axis.value = "pending";
  gestureMode.value = "pending";
  dragScrolling.value = false;
}

function startMomentum() {
  const root = rootRef.value;
  if (!root) return;
  cancelMomentum();
  let velocity = scrollVelocity * 16;
  const step = () => {
    const before = root.scrollTop;
    root.scrollTop = Math.max(0, before + velocity);
    velocity *= 0.92;
    if (Math.abs(velocity) < 0.5 || root.scrollTop === before) {
      momentumFrame = null;
      return;
    }
    momentumFrame = requestAnimationFrame(step);
  };
  momentumFrame = requestAnimationFrame(step);
}

function onClickCapture(event: MouseEvent) {
  if (Date.now() >= suppressClickUntil) return;
  suppressClickUntil = 0;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function touchByIdentifier(list: TouchList) {
  if (touchIdentifier.value === null) return null;
  for (let index = 0; index < list.length; index += 1) {
    const touch = list.item(index);
    if (touch?.identifier === touchIdentifier.value) return touch;
  }
  return null;
}

function onTouchStart(event: TouchEvent) {
  const root = rootRef.value;
  if (
    !root ||
    event.touches.length !== 1 ||
    !canRefresh(undefined, root.scrollTop <= 0)
  ) {
    return;
  }
  const touch = event.touches.item(0);
  if (!touch) return;
  touchIdentifier.value = touch.identifier;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchAxis = "pending";
}

function onTouchMove(event: TouchEvent) {
  const touch = touchByIdentifier(event.touches);
  if (!touch) return;
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if (touchAxis === "pending" && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
    touchAxis = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
  }
  if (touchAxis === "horizontal" || (touchAxis === "vertical" && dy <= 0)) {
    cancelTouchPull();
    return;
  }
  if (
    touchAxis !== "vertical" ||
    !canRefresh(undefined, (rootRef.value?.scrollTop ?? 0) <= 0)
  ) {
    return;
  }
  // Prevent only a confirmed downward pull at the top. Upward/native scrolling
  // and horizontal Tab gestures remain owned by the browser/parent component.
  event.preventDefault();
  updatePullDistance(dy);
}

function finishTouchPull(event: TouchEvent) {
  if (!touchByIdentifier(event.changedTouches)) return;
  const shouldRefresh = pullReady.value && !props.refreshing;
  if (rawPullDistance.value >= 8) suppressClickUntil = Date.now() + 450;
  cancelTouchPull();
  if (shouldRefresh) emit("refresh");
}

function cancelTouchPull() {
  touchIdentifier.value = null;
  touchStartX = 0;
  touchStartY = 0;
  touchAxis = "pending";
  pullDistance.value = 0;
  rawPullDistance.value = 0;
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
    dragScroll: dragConfig.value.enabled,
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
    disabledOpacity: "opacity.disabled",
  }),
  getTokens: () => [
    "color.background",
    "color.primary",
    "color.on-surface-muted",
    "typography.caption",
    "motion.duration-normal",
    "opacity.disabled",
  ],
});

onMounted(setupObserver);
onBeforeUnmount(() => {
  observer?.disconnect();
  cancelMomentum();
});
</script>

<template>
  <section
    ref="rootRef"
    class="pb-scrollable-data-list"
    :class="{
      'allows-mouse-drag': dragConfig.enabled && dragConfig.mouse,
      'is-drag-scrolling': dragScrolling,
      'is-disabled': disabled,
    }"
    data-pb-id="ds.scrollable-data-list"
    data-pb-role="scroll-list"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="finishPull"
    @pointercancel="cancelGesture"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="finishTouchPull"
    @touchcancel="cancelTouchPull"
    @click.capture="onClickCapture"
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
      <footer
        v-if="loadConfig.enabled"
        class="pb-scrollable-data-list-footer"
        aria-live="polite"
      >
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
.pb-scrollable-data-list.allows-mouse-drag {
  cursor: grab;
}
.pb-scrollable-data-list.is-drag-scrolling {
  cursor: grabbing;
  user-select: none;
}
.pb-scrollable-data-list.is-disabled {
  opacity: var(--pb-opacity-disabled, 0.38);
}
.pb-scrollable-data-list::-webkit-scrollbar {
  display: none;
}
.pb-scrollable-data-list-refresh {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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
  display: flex;
  flex-direction: column;
  min-height: 100%;
  transition: transform var(--pb-motion-duration-normal, 200ms) ease;
  will-change: transform;
}
.pb-scrollable-data-list-sentinel {
  height: 1px;
}
.pb-scrollable-data-list-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
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
