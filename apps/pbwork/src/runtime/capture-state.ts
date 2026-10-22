import { onScopeDispose } from "vue";

type StateReader = {
  read: () => unknown;
  appearancePolicy: "shared" | "independent";
};
const readers = new Map<string, Map<symbol, StateReader>>();

/** Authors must include business state and every local UI ref that affects a checkpoint. */
export function useCaptureState(
  prototypeId: string,
  scope: "business" | string,
  read: () => unknown,
  options: { appearancePolicy?: "shared" | "independent" } = {},
) {
  const key = `${prototypeId}:${scope}`;
  const entries = readers.get(key) ?? new Map<symbol, StateReader>();
  const id = Symbol(key);
  entries.set(id, {
    read,
    appearancePolicy: options.appearancePolicy ?? "shared",
  });
  readers.set(key, entries);
  onScopeDispose(() => {
    entries.delete(id);
    if (!entries.size) readers.delete(key);
  });
}

/** Missing author coverage is unsupported, never inferred from DOM alone. */
export function readCaptureState(
  prototypeId: string,
  screenId: string,
): unknown | undefined {
  if (
    !readers.has(`${prototypeId}:business`) ||
    !readers.has(`${prototypeId}:${screenId}`)
  )
    return undefined;
  const active = [...readers.entries()].filter(([key]) =>
    key.startsWith(`${prototypeId}:`),
  );
  if (
    active.some(([, entries]) =>
      [...entries.values()].some(
        (reader) => reader.appearancePolicy === "independent",
      ),
    )
  )
    return undefined;
  return active
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entries]) => [
      key,
      [...entries.values()].map((reader) => reader.read()),
    ]);
}

export function canonicalCaptureState(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entry]) => [key, normalize(entry)]),
      );
    return item;
  };
  return JSON.stringify(normalize(value));
}
