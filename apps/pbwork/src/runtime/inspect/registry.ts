import type { ElementRef } from "@/runtime/bridge";

export type InspectRegistration = {
  element: HTMLElement;
  pbId: string;
  componentId?: string;
  getProps?: () => Record<string, unknown>;
  getState?: () => Record<string, unknown>;
  getTokens?: () => string[];
  getTokenBindings?: () => Record<string, string>;
};

const byElement = new WeakMap<HTMLElement, InspectRegistration>();
const handles = new WeakMap<HTMLElement, string>();
let handleSeq = 0;

export function registerInspect(reg: InspectRegistration): () => void {
  byElement.set(reg.element, reg);
  return () => {
    byElement.delete(reg.element);
  };
}

export function getInspectRegistration(
  element: HTMLElement,
): InspectRegistration | undefined {
  return byElement.get(element);
}

export function getOrCreateHandle(element: HTMLElement): string {
  const existing = handles.get(element);
  if (existing) return existing;
  const id = `h${++handleSeq}`;
  handles.set(element, id);
  return id;
}

export function findByRef(ref: ElementRef): HTMLElement | null {
  // Prefer runtime handle — shared type-level data-pb-id is not instance-unique.
  if (ref.handle) {
    const all = Array.from(document.body.querySelectorAll("*"));
    for (const node of all) {
      if (!(node instanceof HTMLElement)) continue;
      if (handles.get(node) === ref.handle) return node;
    }
  }
  if (ref.pbId) {
    const matches = document.querySelectorAll(
      `[data-pb-id="${CSS.escape(ref.pbId)}"]`,
    );
    if (matches.length === 1 && matches[0] instanceof HTMLElement) {
      return matches[0];
    }
  }
  if (ref.selector && ref.selector.length <= 512) {
    try {
      const el = document.querySelector(ref.selector);
      if (el instanceof HTMLElement) return el;
    } catch {
      // Invalid persisted selectors are treated as missing anchors.
    }
  }
  return null;
}

export function findRegisteredAncestor(
  element: HTMLElement,
): InspectRegistration | undefined {
  let cur: HTMLElement | null = element;
  while (cur) {
    const reg = byElement.get(cur);
    if (reg) return reg;
    cur = cur.parentElement;
  }
  return undefined;
}
