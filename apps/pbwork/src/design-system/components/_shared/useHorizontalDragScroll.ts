import { ref, type Ref } from "vue";

const IGNORE_SELECTOR =
  "input, textarea, select, [contenteditable=true], [data-gesture-ignore]";

/**
 * Makes an overflow-x container draggable with mouse and touch.
 *
 * When the container overflows, it owns every horizontal gesture that starts
 * inside it, including outward drags at an edge. The parent pager only handles
 * the gesture when this container has no horizontal overflow.
 */
export function useHorizontalDragScroll(root: Ref<HTMLElement | null>) {
  const pointerId = ref<number | null>(null);
  const dragging = ref(false);
  const startX = ref(0);
  const startY = ref(0);
  const startScrollLeft = ref(0);
  const axis = ref<"pending" | "horizontal" | "vertical">("pending");
  let ownsGesture = false;
  let suppressClickUntil = 0;

  function canScroll() {
    const element = root.value;
    return Boolean(element && element.scrollWidth - element.clientWidth > 1);
  }

  function reset() {
    const element = root.value;
    if (
      element &&
      pointerId.value !== null &&
      element.hasPointerCapture?.(pointerId.value)
    ) {
      element.releasePointerCapture(pointerId.value);
    }
    pointerId.value = null;
    dragging.value = false;
    axis.value = "pending";
    ownsGesture = false;
  }

  function onPointerDown(event: PointerEvent) {
    if ((event.pointerType === "mouse" && event.button !== 0) || !canScroll()) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest(IGNORE_SELECTOR)) return;
    const element = root.value;
    if (!element) return;
    pointerId.value = event.pointerId;
    startX.value = event.clientX;
    startY.value = event.clientY;
    startScrollLeft.value = element.scrollLeft;
    axis.value = "pending";
    ownsGesture = false;
  }

  function onPointerMove(event: PointerEvent) {
    if (pointerId.value !== event.pointerId) return;
    const element = root.value;
    if (!element) return;
    const dx = event.clientX - startX.value;
    const dy = event.clientY - startY.value;
    if (axis.value === "pending" && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
      axis.value = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (axis.value === "vertical") {
      reset();
      return;
    }
    if (axis.value !== "horizontal") return;

    const maxScrollLeft = Math.max(
      0,
      element.scrollWidth - element.clientWidth,
    );
    const desired = startScrollLeft.value - dx;
    const next = Math.max(0, Math.min(maxScrollLeft, desired));

    ownsGesture = true;
    dragging.value = true;
    event.preventDefault();
    event.stopPropagation();
    element.setPointerCapture?.(event.pointerId);
    element.scrollLeft = next;
  }

  function onPointerUp(event: PointerEvent) {
    if (pointerId.value !== event.pointerId) return;
    if (ownsGesture && Math.abs(event.clientX - startX.value) >= 8) {
      suppressClickUntil = Date.now() + 450;
    }
    reset();
  }

  function onClickCapture(event: MouseEvent) {
    if (Date.now() >= suppressClickUntil) return;
    suppressClickUntil = 0;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  return {
    dragging,
    canScroll,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: reset,
    onClickCapture,
  };
}
