import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import type { InspectRegistration } from "@/runtime/inspect/registry";
import { registerInspect } from "@/runtime/inspect/registry";

/** Resolve a template ref that may point at a native node or a Vue/Vuetify instance. */
export function resolveInspectElement(
  value: unknown,
): HTMLElement | null {
  if (!value) return null;
  if (value instanceof HTMLElement) return value;
  if (typeof value === "object" && value !== null && "$el" in value) {
    const el = (value as { $el: unknown }).$el;
    if (el instanceof HTMLElement) return el;
  }
  return null;
}

function readMaybeString(
  value: undefined | string | Ref<string | undefined> | (() => string | undefined),
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value || undefined;
  if (typeof value === "function") return value() || undefined;
  return value.value || undefined;
}

/**
 * Register a design-system / custom component for Runtime inspect.
 *
 * - `pbId` is the type key (e.g. `ds.button`) written to `data-pb-component`.
 * - `instanceId` (optional) is the page-unique `data-pb-id` for comments / locate.
 *   When omitted, `data-pb-id` falls back to `pbId` (type-level; prefer passing
 *   instance ids from prototype screens).
 */
export function usePbInspect(options: {
  element: Ref<unknown>;
  /** Type-level key, e.g. `ds.button` → `data-pb-component` */
  pbId: string;
  /**
   * Page-unique instance id for `data-pb-id`. Prefer business-stable values
   * from the screen (e.g. `cold-chain-ops.exception-queue.retry`).
   */
  instanceId?: string | Ref<string | undefined> | (() => string | undefined);
  /** Stable key for repeated template instances (data-pb-key). */
  pbKey?: string | Ref<string | undefined> | (() => string | undefined);
  componentId?: string;
  /** Set false for decorative components that must not enter semantic Evidence. */
  semantic?: boolean;
  getProps?: () => Record<string, unknown>;
  getState?: () => Record<string, unknown>;
  getTokens?: () => string[];
  getTokenBindings?: () => Record<string, string>;
}) {
  let unregister: (() => void) | null = null;

  function sync() {
    unregister?.();
    unregister = null;
    const el = resolveInspectElement(options.element.value);
    if (!el) return;
    const instancePbId = readMaybeString(options.instanceId) ?? options.pbId;
    const pbKey = readMaybeString(options.pbKey);
    const reg: InspectRegistration = {
      element: el,
      pbId: instancePbId,
    };
    if (options.componentId) reg.componentId = options.componentId;
    if (options.getProps) reg.getProps = options.getProps;
    if (options.getState) reg.getState = options.getState;
    if (options.getTokens) reg.getTokens = options.getTokens;
    if (options.getTokenBindings) reg.getTokenBindings = options.getTokenBindings;
    unregister = registerInspect(reg);
    el.setAttribute("data-pb-component", options.pbId);
    if (options.semantic !== false) el.setAttribute("data-pb-id", instancePbId);
    else el.removeAttribute("data-pb-id");
    if (pbKey) el.setAttribute("data-pb-key", pbKey);
    else el.removeAttribute("data-pb-key");
  }

  onMounted(sync);
  if (typeof options.instanceId === "object" && options.instanceId && "value" in options.instanceId) {
    watch(options.instanceId, sync);
  }
  if (typeof options.pbKey === "object" && options.pbKey && "value" in options.pbKey) {
    watch(options.pbKey, sync);
  }
  onBeforeUnmount(() => {
    unregister?.();
    unregister = null;
  });

  return { resync: sync };
}

export function usePbInspectRef() {
  return ref<unknown>(null);
}
