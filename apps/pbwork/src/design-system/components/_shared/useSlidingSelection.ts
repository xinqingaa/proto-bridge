import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Ref,
  type WatchSource,
} from "vue";

/** Coordinates stay in the track's layout space, including inside zoomed previews. */
export function useSlidingSelection(
  track: Ref<HTMLElement | null>,
  selected: Ref<string>,
  dependencies: WatchSource[],
  select: (value: string) => void,
) {
  const geometry = ref({ left: Number.NaN, width: Number.NaN });
  const ready = ref(false);
  const animated = ref(false);
  let observer: ResizeObserver | undefined;
  let frame: number | undefined;
  const buttons = () =>
    Array.from(
      track.value?.querySelectorAll<HTMLElement>("[data-selection-key]") ?? [],
    );
  function measure() {
    const active = buttons().find(
      (node) => node.dataset.selectionKey === selected.value,
    );
    ready.value = Boolean(active);
    if (active)
      geometry.value = { left: active.offsetLeft, width: active.offsetWidth };
  }
  function observe() {
    observer?.disconnect();
    if (!track.value || typeof ResizeObserver === "undefined") return;
    observer ??= new ResizeObserver(measure);
    observer.observe(track.value);
    buttons().forEach((node) => observer!.observe(node));
  }
  onMounted(() => {
    observe();
    measure();
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        animated.value = true;
        frame = undefined;
      });
    });
  });
  watch(
    [selected, ...dependencies],
    async () => {
      await nextTick();
      observe();
      measure();
    },
    { flush: "post", deep: true },
  );
  onBeforeUnmount(() => {
    observer?.disconnect();
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  function onKeydown(event: KeyboardEvent) {
    const nodes = buttons().filter((node) => !node.matches(":disabled"));
    const current = nodes.indexOf(event.target as HTMLElement);
    if (
      current < 0 ||
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    )
      return;
    event.preventDefault();
    const rtl = getComputedStyle(track.value!).direction === "rtl";
    const delta = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? nodes.length - 1
          : (current + delta + nodes.length) % nodes.length;
    const next = nodes[index]!;
    select(next.dataset.selectionKey!);
    next.focus();
    next.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  return {
    ready,
    animated,
    onKeydown,
    style: computed(() => ({
      "--pb-selection-left": `${geometry.value.left}px`,
      "--pb-selection-width": `${geometry.value.width}px`,
    })),
  };
}
