import { onBeforeUnmount, onMounted, ref } from "vue";

/** Live platform preference for finite, authored content transitions. */
export function useReducedMotion() {
  const reduced = ref(false);
  let media: MediaQueryList | undefined;
  const sync = () => {
    reduced.value = Boolean(media?.matches);
  };
  onMounted(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    media = window.matchMedia("(prefers-reduced-motion: reduce)");
    sync();
    media.addEventListener("change", sync);
  });
  onBeforeUnmount(() => media?.removeEventListener("change", sync));
  return reduced;
}
