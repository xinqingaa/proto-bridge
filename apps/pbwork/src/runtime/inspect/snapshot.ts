import type {
  ElementBox,
  ElementSummary,
  JsonRecord,
  SnapshotMeta,
  StyleInspectGroup,
  StyleInspectRow,
  TokenBindingRow,
  BridgePayloads,
} from "@/runtime/bridge";
import { BRIDGE_MAX_BYTES, measurePayloadBytes } from "@/runtime/bridge";
import {
  findRegisteredAncestor,
  getInspectRegistration,
  getOrCreateHandle,
} from "@/runtime/inspect/registry";
import { loadTokens } from "@/design-system/loaders";
import { normalizeTokenCssVarName } from "@/design-system/resolveThemeTokens";
import type { TokenRecord } from "@/design-system/types";

const STYLE_KEYS = [
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "color",
  "background-color",
  "padding",
  "margin",
  "gap",
  "border",
  "border-radius",
  "box-shadow",
  "display",
  "position",
  "width",
  "height",
  "overflow",
] as const;

const PROPERTY_CATEGORY: Partial<
  Record<(typeof STYLE_KEYS)[number], TokenRecord["category"]>
> = {
  color: "color",
  "background-color": "color",
  border: "color",
  "border-radius": "radius",
  "box-shadow": "elevation",
  "font-family": "typography",
  "font-size": "typography",
  "font-weight": "typography",
  "line-height": "typography",
  padding: "spacing",
  margin: "spacing",
  gap: "spacing",
};

const PROPERTY_GROUP: Record<(typeof STYLE_KEYS)[number], StyleInspectGroup> = {
  color: "color",
  "background-color": "color",
  "font-family": "typography",
  "font-size": "typography",
  "font-weight": "typography",
  "line-height": "typography",
  padding: "spacing-size",
  margin: "spacing-size",
  gap: "spacing-size",
  width: "spacing-size",
  height: "spacing-size",
  border: "border-radius",
  "border-radius": "border-radius",
  "box-shadow": "shadow-layout",
  display: "shadow-layout",
  position: "shadow-layout",
  overflow: "shadow-layout",
};

export function stylePropertyGroup(
  property: (typeof STYLE_KEYS)[number] | string,
): StyleInspectGroup {
  return PROPERTY_GROUP[property as (typeof STYLE_KEYS)[number]] ?? "shadow-layout";
}

const SENSITIVE = /password|secret|token|authorization|cookie/i;

type TokenVarEntry = {
  tokenId: string;
  cssVar: string;
  value: string;
  category: TokenRecord["category"];
};

let cachedTokenMeta: Omit<TokenVarEntry, "value">[] | null = null;

function tokenVarCatalog(scope: Element): TokenVarEntry[] {
  if (!cachedTokenMeta) {
    cachedTokenMeta = loadTokens().map((token) => ({
      tokenId: token.id,
      cssVar: normalizeTokenCssVarName(token.id),
      category: token.category,
    }));
  }
  const cs = getComputedStyle(scope);
  return cachedTokenMeta.map((entry) => ({
    ...entry,
    value: cs.getPropertyValue(entry.cssVar).trim(),
  }));
}

function normalizeCssValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function colorsEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (normalizeCssValue(a) === normalizeCssValue(b)) return true;
  const probe = document.createElement("span");
  probe.style.color = a;
  document.documentElement.appendChild(probe);
  const resolvedA = getComputedStyle(probe).color;
  probe.style.color = b;
  const resolvedB = getComputedStyle(probe).color;
  probe.remove();
  return Boolean(resolvedA) && resolvedA === resolvedB;
}

function matchTokenForStyle(
  property: (typeof STYLE_KEYS)[number],
  value: string,
  catalog: TokenVarEntry[],
  preferredTokenIds: Set<string>,
):
  | {
      cssVar: string;
      tokenId: string;
      source: "binding" | "value-match";
    }
  | undefined {
  if (!value || value === "none" || value === "normal" || value === "auto") {
    return undefined;
  }
  const category = PROPERTY_CATEGORY[property];
  const preferred = catalog.filter(
    (item) =>
      preferredTokenIds.has(item.tokenId) &&
      (!category || item.category === category),
  );
  const categorized = category
    ? catalog.filter((item) => item.category === category)
    : [];
  const pools = category ? [preferred, categorized] : [];

  for (const pool of pools) {
    for (const item of pool) {
      if (!item.value) continue;
      if (normalizeCssValue(item.value) === normalizeCssValue(value)) {
        return {
          cssVar: item.cssVar,
          tokenId: item.tokenId,
          source: preferredTokenIds.has(item.tokenId)
            ? "binding"
            : "value-match",
        };
      }
      if (
        (property === "color" ||
          property === "background-color" ||
          property === "border") &&
        colorsEqual(item.value, value)
      ) {
        return {
          cssVar: item.cssVar,
          tokenId: item.tokenId,
          source: preferredTokenIds.has(item.tokenId)
            ? "binding"
            : "value-match",
        };
      }
    }
  }
  return undefined;
}

export function readBbox(el: HTMLElement): ElementBox {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + window.scrollX,
    y: r.top + window.scrollY,
    width: Math.round(r.width),
    height: Math.round(r.height),
  };
}

function truncateText(text: string, meta: SnapshotMeta): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 500) return cleaned;
  meta.truncated = true;
  meta.warnings = [...(meta.warnings ?? []), "TEXT_TRUNCATED"];
  return cleaned.slice(0, 500);
}

function sanitizeValue(
  value: unknown,
  depth: number,
  meta: SnapshotMeta,
): unknown {
  if (depth > 5) {
    meta.truncated = true;
    meta.warnings = [...(meta.warnings ?? []), "DEPTH_TRUNCATED"];
    return "[truncated]";
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (typeof value === "string") {
    return value.length > 500 ? truncateText(value, meta) : value;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) {
      meta.truncated = true;
      meta.warnings = [...(meta.warnings ?? []), "COLLECTION_TRUNCATED"];
    }
    return value
      .slice(0, 100)
      .map((item) => sanitizeValue(item, depth + 1, meta));
  }
  if (typeof value === "object") {
    const out: JsonRecord = {};
    const entries = Object.entries(value as JsonRecord).slice(0, 100);
    if (Object.keys(value as object).length > 100) {
      meta.truncated = true;
      meta.warnings = [...(meta.warnings ?? []), "COLLECTION_TRUNCATED"];
    }
    for (const [key, raw] of entries) {
      if (SENSITIVE.test(key)) {
        out[key] = "[redacted]";
        meta.warnings = [...(meta.warnings ?? []), "VALUE_REDACTED"];
        continue;
      }
      out[key] = sanitizeValue(raw, depth + 1, meta);
    }
    return out;
  }
  return String(value);
}

function sanitizeRecord(
  input: Record<string, unknown> | undefined,
  meta: SnapshotMeta,
): JsonRecord | undefined {
  if (!input) return undefined;
  return sanitizeValue(input, 0, meta) as JsonRecord;
}

function domPath(el: HTMLElement): string {
  const parts: string[] = [];
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.documentElement && parts.length < 12) {
    const name = cur.tagName.toLowerCase();
    const pb = cur.getAttribute("data-pb-id");
    if (pb) {
      parts.unshift(`${name}[data-pb-id="${pb}"]`);
      break;
    }
    const parentEl: HTMLElement | null = cur.parentElement;
    if (!parentEl) {
      parts.unshift(name);
      break;
    }
    const siblings = Array.from(parentEl.children).filter(
      (n) => (n as HTMLElement).tagName === cur!.tagName,
    );
    const idx = siblings.indexOf(cur) + 1;
    parts.unshift(siblings.length > 1 ? `${name}:nth-of-type(${idx})` : name);
    cur = parentEl;
  }
  return parts.join(" > ");
}

function semanticParentRef(el: HTMLElement): ElementSummary["semanticParent"] {
  let cur = el.parentElement;
  while (cur) {
    const pbId = cur.getAttribute("data-pb-id");
    if (pbId) {
      return { pbId, handle: getOrCreateHandle(cur) };
    }
    const reg = getInspectRegistration(cur);
    if (reg) {
      return {
        ...(reg.pbId ? { pbId: reg.pbId } : {}),
        handle: getOrCreateHandle(cur),
      };
    }
    cur = cur.parentElement;
  }
  return undefined;
}

export function buildElementSummary(el: HTMLElement): ElementSummary {
  const meta: SnapshotMeta = {};
  const pbId = el.getAttribute("data-pb-id") ?? undefined;
  const pbRole = el.getAttribute("data-pb-role") ?? undefined;
  const pbShellRaw = el.getAttribute("data-pb-shell");
  const pbShell =
    pbShellRaw === "sheet" ||
    pbShellRaw === "dialog" ||
    pbShellRaw === "modal" ||
    pbShellRaw === "drawer"
      ? pbShellRaw
      : undefined;

  const text = truncateText(el.innerText || el.textContent || "", meta);
  const summary: ElementSummary = {
    ref: {
      ...(pbId ? { pbId } : {}),
      handle: getOrCreateHandle(el),
    },
    tag: el.tagName.toLowerCase(),
    classes: Array.from(el.classList),
    bbox: readBbox(el),
    domPath: domPath(el),
  };
  if (text) summary.text = text;
  if (pbRole) summary.pbRole = pbRole;
  if (pbShell) summary.pbShell = pbShell;
  const parent = semanticParentRef(el);
  if (parent) summary.semanticParent = parent;
  if (meta.truncated || meta.warnings?.length) summary.meta = meta;
  return summary;
}

export function readWhitelistedStyles(
  el: HTMLElement,
  preferredTokenIds: string[] = [],
): StyleInspectRow[] {
  const cs = window.getComputedStyle(el);
  const scope =
    el.closest(".runtime-app") ??
    document.querySelector(".runtime-app") ??
    document.documentElement;
  const catalog = tokenVarCatalog(scope);
  const preferred = new Set(preferredTokenIds);
  const rows: StyleInspectRow[] = [];

  for (const key of STYLE_KEYS) {
    const value = cs.getPropertyValue(key).trim();
    const row: StyleInspectRow = {
      property: key,
      value,
      group: stylePropertyGroup(key),
      source: "raw",
    };
    const match = matchTokenForStyle(key, value, catalog, preferred);
    if (match) {
      row.cssVar = match.cssVar;
      row.tokenId = match.tokenId;
      row.source = match.source;
    }
    rows.push(row);
  }
  return rows;
}

function buildTokenBindings(
  bindings: Record<string, string> | undefined,
): TokenBindingRow[] | undefined {
  if (!bindings) return undefined;
  const rows: TokenBindingRow[] = Object.entries(bindings).map(
    ([slot, tokenId]) => ({
      slot,
      tokenId,
      cssVar: normalizeTokenCssVarName(tokenId),
    }),
  );
  return rows.length ? rows.slice(0, 100) : undefined;
}

export function buildSelectPayload(
  el: HTMLElement,
): BridgePayloads["select"] | { error: "PAYLOAD_TOO_LARGE" } {
  const meta: SnapshotMeta = {};
  const element = buildElementSummary(el);
  const reg = getInspectRegistration(el) ?? findRegisteredAncestor(el);

  const tokenBindings = buildTokenBindings(reg?.getTokenBindings?.());
  const tokenIds =
    reg?.getTokens?.() ?? tokenBindings?.map((row) => row.tokenId) ?? [];
  const styles = readWhitelistedStyles(el, tokenIds);

  const payload: BridgePayloads["select"] = {
    element,
    styles,
  };

  if (reg) {
    if (reg.componentId) payload.componentId = reg.componentId;
    const props = sanitizeRecord(reg.getProps?.(), meta);
    const state = sanitizeRecord(reg.getState?.(), meta);
    if (props) payload.props = props;
    if (state) payload.state = state;
    if (tokenIds.length) payload.tokens = [...new Set(tokenIds)].slice(0, 100);
    if (tokenBindings) payload.tokenBindings = tokenBindings;
    if (reg.pbId && !payload.element.ref.pbId) {
      payload.element.ref.pbId = reg.pbId;
    }
  }

  if (meta.truncated || meta.warnings?.length) {
    payload.meta = { ...element.meta, ...meta };
  }

  if (measurePayloadBytes(payload) > BRIDGE_MAX_BYTES) {
    return { error: "PAYLOAD_TOO_LARGE" };
  }
  return payload;
}

export function isInspectChrome(el: Element | null): boolean {
  if (!(el instanceof Element)) return false;
  return Boolean(
    el.closest("[data-pb-inspect-chrome]") || el.closest(".pb-inspect-overlay"),
  );
}
