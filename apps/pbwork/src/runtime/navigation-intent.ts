/** Tracks how the runtime router last changed, for workbench history sync. */

export type RouteNavigationIntent = "push" | "replace" | "back";

let lastIntent: RouteNavigationIntent = "push";
let installed = false;

export function getRouteNavigationIntent(): RouteNavigationIntent {
  return lastIntent;
}

export function setRouteNavigationIntent(intent: RouteNavigationIntent) {
  lastIntent = intent;
}

/**
 * Patch History so push/replace/popstate map to bridge `navigation` intents.
 * Safe to call multiple times; only installs once per window.
 */
export function installNavigationIntentTracking() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const { history } = window;
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = ((data, unused, url) => {
    lastIntent = "push";
    return originalPushState(data, unused, url);
  }) as History["pushState"];

  history.replaceState = ((data, unused, url) => {
    lastIntent = "replace";
    return originalReplaceState(data, unused, url);
  }) as History["replaceState"];

  window.addEventListener("popstate", () => {
    lastIntent = "back";
  });
}
