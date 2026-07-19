import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import type { InspectRegistration } from "@/runtime/inspect/registry";
import { registerInspect } from "@/runtime/inspect/registry";

export function usePbInspect(options: {
  element: Ref<HTMLElement | null>;
  pbId: string;
  componentId?: string;
  getProps?: () => Record<string, unknown>;
  getState?: () => Record<string, unknown>;
  getTokens?: () => string[];
  getTokenBindings?: () => Record<string, string>;
}) {
  let unregister: (() => void) | null = null;

  function sync() {
    unregister?.();
    unregister = null;
    const el = options.element.value;
    if (!el) return;
    const reg: InspectRegistration = {
      element: el,
      pbId: options.pbId,
    };
    if (options.componentId) reg.componentId = options.componentId;
    if (options.getProps) reg.getProps = options.getProps;
    if (options.getState) reg.getState = options.getState;
    if (options.getTokens) reg.getTokens = options.getTokens;
    if (options.getTokenBindings) reg.getTokenBindings = options.getTokenBindings;
    unregister = registerInspect(reg);
    if (!el.getAttribute("data-pb-id")) {
      el.setAttribute("data-pb-id", options.pbId);
    }
  }

  onMounted(sync);
  onBeforeUnmount(() => {
    unregister?.();
    unregister = null;
  });

  return { resync: sync };
}

export function usePbInspectRef() {
  return ref<HTMLElement | null>(null);
}
