import { ref, watch, type Ref } from "vue";

export interface PrototypeStorageOptions<T> {
  prototypeId: string;
  name: string;
  schemaVersion: number;
  defaults: () => T;
  validate: (value: unknown) => value is T;
  migrate?: (value: unknown, fromVersion: number) => T | undefined;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
}
function browserStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
/** Persistence failures leave the current business model usable. */
export function usePrototypeStorage<T>(
  options: PrototypeStorageOptions<T>,
): Ref<T> {
  const target =
    options.storage === undefined ? browserStorage() : options.storage;
  const key = `pbwork.prototype.${options.prototypeId}.${options.name}`;
  let value = options.defaults();
  try {
    const saved = JSON.parse(target?.getItem(key) ?? "null");
    const candidate =
      saved?.schemaVersion === options.schemaVersion
        ? saved.value
        : saved && options.migrate?.(saved.value, saved.schemaVersion);
    if (options.validate(candidate)) value = candidate;
  } catch {
    /* Invalid JSON/schema starts a fresh model. */
  }
  const model = ref(value) as Ref<T>;
  watch(
    model,
    (value) => {
      try {
        target?.setItem(
          key,
          JSON.stringify({ schemaVersion: options.schemaVersion, value }),
        );
      } catch {
        /* quota/private browsing */
      }
    },
    { deep: true, flush: "sync" },
  );
  return model;
}
