import { computed, ref, type Ref } from "vue";

const INTERACTIVE_SELECTOR =
  "button, a, input, textarea, select, [contenteditable=true], [data-no-swipe], [data-gesture-ignore], [data-horizontal-scroll], .v-chip, .pb-filter-bar, .period-segment";

export function usePointerSwipe(
  values: Ref<string[]>,
  current: Ref<string>,
  update: (value: string) => void,
  enabled: Ref<boolean>,
) {
  const startX = ref<number | null>(null);
  const startY = ref<number | null>(null);
  const axis = ref<"pending" | "horizontal" | "vertical">("pending");
  const dragOffset = ref(0);
  const dragging = computed(() => startX.value !== null);

  function onPointerDown(event: PointerEvent) {
    if (!enabled.value || (event.pointerType === "mouse" && event.button !== 0))
      return;
    const target = event.target;
    if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR))
      return;
    startX.value = event.clientX;
    startY.value = event.clientY;
    axis.value = "pending";
    dragOffset.value = 0;
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(
      event.pointerId,
    );
  }

  function onPointerMove(event: PointerEvent) {
    if (startX.value === null || startY.value === null) return;
    const dx = event.clientX - startX.value;
    const dy = event.clientY - startY.value;
    if (axis.value === "pending" && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
      axis.value = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
    }
    if (axis.value === "vertical") {
      cancel();
      return;
    }
    if (axis.value !== "horizontal") return;
    event.preventDefault();
    dragOffset.value = Math.max(-72, Math.min(72, dx));
  }

  function finish(event: PointerEvent) {
    if (startX.value === null) return;
    const delta = event.clientX - startX.value;
    const currentIndex = values.value.indexOf(current.value);
    if (
      axis.value === "horizontal" &&
      Math.abs(delta) >= 44 &&
      currentIndex >= 0
    ) {
      const nextIndex = delta < 0 ? currentIndex + 1 : currentIndex - 1;
      const next = values.value[nextIndex];
      if (next) update(next);
    }
    startX.value = null;
    startY.value = null;
    axis.value = "pending";
    dragOffset.value = 0;
  }

  function cancel() {
    startX.value = null;
    startY.value = null;
    axis.value = "pending";
    dragOffset.value = 0;
  }

  const dragStyle = computed(() => ({
    "--pb-swipe-offset": `${dragOffset.value}px`,
  }));

  return {
    dragging,
    dragStyle,
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: cancel,
  };
}
