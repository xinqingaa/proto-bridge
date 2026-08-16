/** Tracks how the runtime router last changed, for workbench history sync. */

export type RouteNavigationIntent = "push" | "replace" | "back";

let lastIntent: RouteNavigationIntent = "push";
let installed = false;
let preserveIntentThroughReplace = false;

export function getRouteNavigationIntent(): RouteNavigationIntent {
  return lastIntent;
}

export function setRouteNavigationIntent(intent: RouteNavigationIntent) {
  lastIntent = intent;
}

/**
 * Keep a back intent across the following `history.replaceState`.
 * Embedded Runtime returns with `replace(parent)` instead of `history.back()`.
 */
export function announceBackNavigation() {
  lastIntent = "back";
  preserveIntentThroughReplace = true;
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
    preserveIntentThroughReplace = false;
    lastIntent = "push";
    return originalPushState(data, unused, url);
  }) as History["pushState"];

  history.replaceState = ((data, unused, url) => {
    if (preserveIntentThroughReplace) {
      preserveIntentThroughReplace = false;
    } else {
      lastIntent = "replace";
    }
    return originalReplaceState(data, unused, url);
  }) as History["replaceState"];

  window.addEventListener("popstate", () => {
    preserveIntentThroughReplace = false;
    lastIntent = "back";
  });
}
