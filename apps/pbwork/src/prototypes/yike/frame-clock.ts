import {
  computed,
  onScopeDispose,
  readonly,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from "vue";

/** ~30 fps is enough for the slow dial motion and halves the render cost. */
const FRAME_MS = 1000 / 30;
const shared = ref(new Date());
let frame = 0;
let lastPaint = 0;
let subscribers = 0;

function paint(time: number) {
  frame = requestAnimationFrame(paint);
  if (typeof document !== "undefined" && document.hidden) return;
  if (time - lastPaint < FRAME_MS) return;
  lastPaint = time;
  shared.value = new Date();
}

function acquire() {
  subscribers += 1;
  if (subscribers > 1 || typeof window === "undefined") return;
  lastPaint = 0;
  frame = requestAnimationFrame(paint);
}

function release() {
  subscribers = Math.max(0, subscribers - 1);
  if (subscribers > 0) return;
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

/**
 * One shared requestAnimationFrame clock for continuous dial motion. It only
 * runs while something asks for it and pauses with the document, so a paused
 * timer costs nothing. Values are read from the wall clock every frame, never
 * accumulated, so hidden time and dropped frames cannot drift.
 */
export function useFrameClock(active: MaybeRefOrGetter<boolean>) {
  const on = computed(() => Boolean(toValue(active)));
  let acquired = false;
  const sync = (value: boolean) => {
    if (value === acquired) return;
    acquired = value;
    if (value) acquire();
    else release();
  };
  watch(on, sync, { immediate: true });
  onScopeDispose(() => {
    if (!acquired) return;
    acquired = false;
    release();
  });
  return readonly(shared);
}
