import type { CSSProperties, ObjectDirective, VNode } from "vue";
import type { SemanticRole } from "@proto-bridge/core/v2";
import { PB_STYLE_SLOTS } from "@/design-system/theme/slots";
import {
  bindableKeys,
  type BindableKey,
  type PbStyleInput,
} from "@/design-system/theme/generated/keys";
export type { PbStyleInput } from "@/design-system/theme/generated/keys";

const bindable = new Set<string>(bindableKeys);
const cssVar = (key: string) => `var(--pb-${key.replaceAll(".", "-")})`;
const kebab = (slot: string) =>
  slot.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
const evidencePrefix = "--pb-evidence-";

/** One typed declaration produces CSS and transport metadata for v-pb. */
export function pbStyle(input: PbStyleInput): CSSProperties {
  const output: Record<string, string> = {};
  for (const [slot, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const spec = PB_STYLE_SLOTS[slot as keyof PbStyleInput];
    if (!spec) throw new Error(`UNKNOWN_PB_STYLE_SLOT:${slot}`);
    const values = Array.isArray(value) ? value : [value];
    const css = values
      .map((key) =>
        key === "transparent" || key === "none" ? key : cssVar(key),
      )
      .join(" ");
    output[spec.properties[0]!] = css;
    if (
      values.length === 1 &&
      (bindable.has(values[0]) ||
        values[0] === "transparent" ||
        values[0] === "none")
    )
      output[evidencePrefix + kebab(slot)] = values[0];
    // Two-axis spacing has separate facts; a tuple is never a fabricated token id.
    if (values.length === 2) {
      for (const [index, sides] of [
        [0, ["top", "bottom"]],
        [1, ["left", "right"]],
      ] as const) {
        const key = values[index];
        if (bindable.has(key))
          for (const side of sides)
            output[`${evidencePrefix}${slot}-${side}`] = key;
      }
    }
  }
  return output as CSSProperties;
}

export interface PbDeclaration {
  id: string;
  role: SemanticRole;
  key?: string;
  style?: PbStyleInput;
  /** Evidence-only slots for structural/part bindings; never infer them from CSS. */
  tokens?: Record<string, BindableKey>;
}
const applied = new WeakMap<
  HTMLElement,
  { attributes: string[]; styles: string[] }
>();
function apply(el: HTMLElement, input: PbDeclaration, vnode: VNode) {
  const previous = applied.get(el);
  previous?.attributes.forEach((name) => el.removeAttribute(name));
  const externalStyle = vnode.props?.style;
  previous?.styles.forEach((name) => {
    // Vue has already patched :style; do not erase a new external declaration.
    if (
      !externalStyle ||
      typeof externalStyle !== "object" ||
      !(name in externalStyle)
    )
      el.style.removeProperty(name);
  });
  const attributes: Record<string, string> = {
    "data-pb-id": input.id,
    "data-pb-role": input.role,
  };
  if (input.key !== undefined) attributes["data-pb-key"] = input.key;
  const styles = input.style ? pbStyle(input.style) : {};
  for (const [name, value] of Object.entries(styles))
    el.style.setProperty(name, String(value));
  const collect = (style: unknown): void => {
    if (Array.isArray(style)) {
      style.forEach(collect);
      return;
    }
    if (!style || typeof style !== "object") return;
    for (const [name, value] of Object.entries(style)) {
      if (name.startsWith(evidencePrefix))
        attributes["data-pb-token-" + name.slice(evidencePrefix.length)] =
          String(value);
    }
  };
  collect(vnode.props?.style);
  collect(styles);
  for (const [slot, key] of Object.entries(input.tokens ?? {}))
    attributes["data-pb-token-" + kebab(slot)] = key;
  for (const [name, value] of Object.entries(attributes))
    el.setAttribute(name, value);
  applied.set(el, {
    attributes: Object.keys(attributes),
    styles: Object.keys(styles),
  });
}
/** Local import `vPb` in script setup, or globally registered `v-pb`. */
export const vPb: ObjectDirective<HTMLElement, PbDeclaration> = {
  mounted: (el, binding, vnode) => apply(el, binding.value, vnode),
  updated: (el, binding, vnode) => apply(el, binding.value, vnode),
  unmounted: (el) => {
    applied.delete(el);
  },
};
