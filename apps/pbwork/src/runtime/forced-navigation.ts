/**
 * Workbench tree / Capture protocol navigation is an authoring jump, not an
 * in-app leave. Product `onBeforeRouteLeave` guards must let it through.
 */

let forcedDepth = 0;

export function isForcedRuntimeNavigation() {
  return forcedDepth > 0;
}

export async function runForcedRuntimeNavigation<T>(
  task: () => Promise<T> | T,
): Promise<T> {
  forcedDepth += 1;
  try {
    return await task();
  } finally {
    forcedDepth -= 1;
  }
}
