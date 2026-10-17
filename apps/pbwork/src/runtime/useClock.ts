import { onScopeDispose, readonly, ref } from "vue";

/**
 * Interactive sessions follow the real clock. Capture installs the manifest
 * clock through Playwright, so `Date` is already the declared instant there.
 */
export function useClock() {
  const now = ref(new Date());
  const timer =
    typeof window === "undefined"
      ? undefined
      : window.setInterval(() => {
          now.value = new Date();
        }, 1000);
  onScopeDispose(() => {
    if (timer !== undefined) window.clearInterval(timer);
  });
  return readonly(now);
}
