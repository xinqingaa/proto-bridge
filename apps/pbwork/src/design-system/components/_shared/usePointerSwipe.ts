import { computed, ref, type Ref } from "vue";
import { tokenDefaultNumber } from "@/design-system/tokenDefaults";

const AXIS_LOCK_DISTANCE = tokenDefaultNumber("layout.gesture-axis-lock");
const DRAG_PREVIEW_LIMIT = tokenDefaultNumber("layout.gesture-drag-limit");
const SWIPE_THRESHOLD = tokenDefaultNumber("layout.gesture-swipe-threshold");
const CLICK_SUPPRESSION_DURATION = tokenDefaultNumber(
  "motion.duration-click-suppression",
);

const GESTURE_IGNORE_SELECTOR =
  "input, textarea, select, [contenteditable=true], [data-no-swipe], [data-gesture-ignore], .pb-filter-bar, .period-segment";
const HORIZONTAL_SCROLL_SELECTOR = "[data-horizontal-scroll]";

export type PointerSwipeOptions = {
  swipe: Ref<boolean>;
  mouseSwipe: Ref<boolean>;
};

/**
 * Direction-locked swipe gesture shared by Tabs and TabViewport.
 *
 * Pointer capture is intentionally delayed until the gesture is known to be
 * horizontal. This lets a nested vertical scroller win vertical gestures.
 */
export function usePointerSwipe(
  values: Ref<string[]>,
  current: Ref<string>,
  update: (value: string) => void,
  options: PointerSwipeOptions,
) {
  const pointerId = ref<number | null>(null);
  const touchIdentifier = ref<number | null>(null);
  const startX = ref(0);
  const startY = ref(0);
  const axis = ref<"pending" | "horizontal" | "vertical">("pending");
  const touchAxis = ref<"pending" | "horizontal" | "vertical">("pending");
  let touchStartX = 0;
  let touchStartY = 0;
  const dragOffset = ref(0);
  const dragging = computed(
    () =>
      (pointerId.value !== null && axis.value === "horizontal") ||
      (touchIdentifier.value !== null && touchAxis.value === "horizontal"),
  );
  let surface: HTMLElement | null = null;
  let suppressClickUntil = 0;

  function pointerEnabled(event: PointerEvent) {
    if (event.pointerType === "mouse") return options.mouseSwipe.value;
    return options.swipe.value;
  }

  function startsInScrollableHorizontalRegion(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    const region = target.closest<HTMLElement>(HORIZONTAL_SCROLL_SELECTOR);
    return Boolean(region && region.scrollWidth - region.clientWidth > 1);
  }

  function shouldIgnoreTarget(target: EventTarget | null) {
    return Boolean(
      target instanceof Element &&
      (target.closest(GESTURE_IGNORE_SELECTOR) ||
        startsInScrollableHorizontalRegion(target)),
    );
  }

  function releaseCapture() {
    if (
      surface &&
      pointerId.value !== null &&
      surface.hasPointerCapture?.(pointerId.value)
    ) {
      surface.releasePointerCapture(pointerId.value);
    }
  }

  function reset() {
    releaseCapture();
    pointerId.value = null;
    startX.value = 0;
    startY.value = 0;
    axis.value = "pending";
    dragOffset.value = 0;
    surface = null;
  }

  function onPointerDown(event: PointerEvent) {
    if (
      !pointerEnabled(event) ||
      event.pointerType === "touch" ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    const target = event.target;
    if (shouldIgnoreTarget(target)) return;
    pointerId.value = event.pointerId;
    startX.value = event.clientX;
    startY.value = event.clientY;
    axis.value = "pending";
    dragOffset.value = 0;
    surface = event.currentTarget as HTMLElement | null;
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId.value !== event.pointerId) return;
    const dx = event.clientX - startX.value;
    const dy = event.clientY - startY.value;
    if (
      axis.value === "pending" &&
      Math.max(Math.abs(dx), Math.abs(dy)) >= AXIS_LOCK_DISTANCE
    ) {
      axis.value = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      if (axis.value === "horizontal") {
        surface?.setPointerCapture?.(event.pointerId);
      }
    }
    if (axis.value === "vertical") {
      reset();
      return;
    }
    if (axis.value !== "horizontal") return;
    event.preventDefault();
    dragOffset.value = Math.max(
      -DRAG_PREVIEW_LIMIT,
      Math.min(DRAG_PREVIEW_LIMIT, dx),
    );
  }

  function finish(event: PointerEvent) {
    if (pointerId.value !== event.pointerId) return;
    const delta = event.clientX - startX.value;
    const currentIndex = values.value.indexOf(current.value);
    const wasHorizontal = axis.value === "horizontal";

    if (
      wasHorizontal &&
      Math.abs(delta) >= SWIPE_THRESHOLD &&
      currentIndex >= 0
    ) {
      const nextIndex = delta < 0 ? currentIndex + 1 : currentIndex - 1;
      const next = values.value[nextIndex];
      if (next) update(next);
    }
    if (wasHorizontal && Math.abs(delta) >= AXIS_LOCK_DISTANCE) {
      suppressClickUntil = Date.now() + CLICK_SUPPRESSION_DURATION;
    }
    reset();
  }

  function cancel() {
    reset();
  }

  function touchByIdentifier(list: TouchList) {
    if (touchIdentifier.value === null) return null;
    for (let index = 0; index < list.length; index += 1) {
      const touch = list.item(index);
      if (touch?.identifier === touchIdentifier.value) return touch;
    }
    return null;
  }

  function resetTouch() {
    touchIdentifier.value = null;
    touchStartX = 0;
    touchStartY = 0;
    touchAxis.value = "pending";
    dragOffset.value = 0;
  }

  function onTouchStart(event: TouchEvent) {
    if (
      !options.swipe.value ||
      event.touches.length !== 1 ||
      shouldIgnoreTarget(event.target)
    ) {
      return;
    }
    const touch = event.touches.item(0);
    if (!touch) return;
    touchIdentifier.value = touch.identifier;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchAxis.value = "pending";
    dragOffset.value = 0;
  }

  function onTouchMove(event: TouchEvent) {
    const touch = touchByIdentifier(event.touches);
    if (!touch) return;
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (
      touchAxis.value === "pending" &&
      Math.max(Math.abs(dx), Math.abs(dy)) >= AXIS_LOCK_DISTANCE
    ) {
      touchAxis.value = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (touchAxis.value === "vertical") {
      resetTouch();
      return;
    }
    if (touchAxis.value !== "horizontal") return;
    event.preventDefault();
    dragOffset.value = Math.max(
      -DRAG_PREVIEW_LIMIT,
      Math.min(DRAG_PREVIEW_LIMIT, dx),
    );
  }

  function finishTouch(event: TouchEvent) {
    const touch = touchByIdentifier(event.changedTouches);
    if (!touch) return;
    const delta = touch.clientX - touchStartX;
    const currentIndex = values.value.indexOf(current.value);
    const wasHorizontal = touchAxis.value === "horizontal";
    if (
      wasHorizontal &&
      Math.abs(delta) >= SWIPE_THRESHOLD &&
      currentIndex >= 0
    ) {
      const nextIndex = delta < 0 ? currentIndex + 1 : currentIndex - 1;
      const next = values.value[nextIndex];
      if (next) update(next);
    }
    if (wasHorizontal && Math.abs(delta) >= AXIS_LOCK_DISTANCE) {
      suppressClickUntil = Date.now() + CLICK_SUPPRESSION_DURATION;
    }
    resetTouch();
  }

  function onClickCapture(event: MouseEvent) {
    if (Date.now() >= suppressClickUntil) return;
    suppressClickUntil = 0;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  return {
    dragging,
    dragOffset,
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: cancel,
    onTouchStart,
    onTouchMove,
    onTouchEnd: finishTouch,
    onTouchCancel: resetTouch,
    onClickCapture,
  };
}
