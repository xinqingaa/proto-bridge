/**
 * Test/runtime helper for the "history objects never change" rule
 * (pb-v2-spec.md "一致性验收"). Persisted V2 objects should be frozen right
 * after validation so accidental in-place mutation throws instead of
 * silently drifting historical Runs, Snapshots or Handoffs.
 */
export function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && (typeof value === 'object' || typeof value === 'function') && !Object.isFrozen(value)) {
    Object.getOwnPropertyNames(value).forEach((key) => {
      deepFreeze((value as Record<string, unknown>)[key]);
    });
    Object.freeze(value);
  }
  return value;
}

export function deepClone<T>(value: T): T {
  return structuredClone(value);
}
