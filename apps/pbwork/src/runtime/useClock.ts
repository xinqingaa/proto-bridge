import { onScopeDispose, readonly, ref } from "vue";

const now = ref(new Date());
let timer: number | undefined;
let subscribers = 0;

function acquire() {
  subscribers += 1;
  if (subscribers > 1 || typeof window === "undefined") return;
  now.value = new Date();
  timer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
}

function release() {
  subscribers = Math.max(0, subscribers - 1);
  if (subscribers > 0 || timer === undefined) return;
  window.clearInterval(timer);
  timer = undefined;
}

/**
 * Interactive sessions follow the real clock. Capture installs the manifest
 * clock through Playwright, so `Date` is already the declared instant there.
 * One shared second tick feeds every view; pages never each own an interval.
 */
export function useClock() {
  acquire();
  onScopeDispose(release);
  return readonly(now);
}
