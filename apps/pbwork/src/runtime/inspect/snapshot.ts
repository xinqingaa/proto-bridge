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
  "border-color",
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
  "border-color": "color",
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
  "border-color": "border-radius",
  "border-radius": "border-radius",
  "box-shadow": "shadow-layout",
  display: "shadow-layout",
  position: "shadow-layout",
  overflow: "shadow-layout",
};

const TYPOGRAPHY_LONGHANDS = new Set<(typeof STYLE_KEYS)[number]>([
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
]);

const COLOR_PROPERTIES = new Set<(typeof STYLE_KEYS)[number]>([
  "color",
  "background-color",
  "border-color",
]);

/** Contract slot → CSS properties that slot is allowed to claim as "binding". */
const BINDING_SLOT_PROPERTIES: Record<string, readonly string[]> = {
  background: ["background-color"],
  surface: ["background-color"],
  tonalBackground: ["background-color"],
  activeBackground: ["background-color"],
  color: ["color"],
  onBackground: ["color"],
  inactiveColor: ["color"],
  muted: ["color"],
  indicator: ["color", "background-color"],
  border: ["border-color"],
  radius: ["border-radius"],
  elevation: ["box-shadow"],
  // Root-level typography only. Part slots (title/subtitle/label/input) must not
  // claim the registered root's computed font as "显式绑定".
  typography: [
    "font",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
  ],
};

/** Part-level slots: shown in component bindings, never bind root computed styles. */
const PART_BINDING_SLOTS = new Set(["title", "subtitle", "label", "input"]);

export type StyleMatchOptions = {
  /** Token IDs used only for match ranking (may include ancestor prefs). */
  rankTokenIds?: string[];
  /** Current node's contract bindings; only these can yield source=binding. */
  ownBindings?: Record<string, string>;
};

export function stylePropertyGroup(
  property: (typeof STYLE_KEYS)[number] | string,
): StyleInspectGroup {
  if (property === "font") return "typography";
  return (
    PROPERTY_GROUP[property as (typeof STYLE_KEYS)[number]] ?? "shadow-layout"
  );
}

/** Human-readable role for inspector labels (文字 / 背景 / …). */
export function stylePropertyRole(property: string): string {
  switch (property) {
    case "color":
      return "文字";
    case "background-color":
      return "背景";
    case "border-color":
      return "边框";
    case "font":
    case "font-family":
    case "font-size":
    case "font-weight":
    case "line-height":
      return "字体";
    case "border-radius":
      return "圆角";
    case "box-shadow":
      return "阴影";
    case "padding":
    case "margin":
    case "gap":
      return "间距";
    case "width":
    case "height":
      return "尺寸";
    default:
      return property;
  }
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

function isTransparentColor(value: string): boolean {
  const normalized = normalizeCssValue(value);
  return (
    normalized === "transparent" ||
    normalized === "rgba(0, 0, 0, 0)" ||
    normalized === "rgba(0,0,0,0)" ||
    normalized === "#0000" ||
    normalized === "#00000000"
  );
}

/** Resolve two color strings on independent probes (avoids sticky invalid assignments). */
function colorsEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (normalizeCssValue(a) === normalizeCssValue(b)) return true;
  const probeA = document.createElement("span");
  const probeB = document.createElement("span");
  document.documentElement.appendChild(probeA);
  document.documentElement.appendChild(probeB);
  probeA.style.color = a;
  probeB.style.color = b;
  const acceptedA = Boolean(probeA.style.color);
  const acceptedB = Boolean(probeB.style.color);
  const resolvedA = getComputedStyle(probeA).color;
  const resolvedB = getComputedStyle(probeB).color;
  probeA.remove();
  probeB.remove();
  if (!acceptedA || !acceptedB) return false;
  return Boolean(resolvedA) && resolvedA === resolvedB;
}

/**
 * Composite typography tokens (`600 16px/1.4 Inter, ...`) must be applied as
 * `font` shorthand, then compared via longhand computed values.
 */
function typographyLonghandMatches(
  property: (typeof STYLE_KEYS)[number],
  value: string,
  tokenValue: string,
): boolean {
  if (!TYPOGRAPHY_LONGHANDS.has(property)) return false;
  const probe = document.createElement("span");
  document.documentElement.appendChild(probe);
  probe.style.font = tokenValue;
  const accepted = Boolean(probe.style.font);
  const expected = accepted
    ? getComputedStyle(probe).getPropertyValue(property).trim()
    : "";
  probe.remove();
  if (!accepted || !expected) return false;
  return normalizeCssValue(expected) === normalizeCssValue(value);
}

function bindingTokenIdsForProperty(
  ownBindings: Record<string, string> | undefined,
  property: string,
): Set<string> {
  const ids = new Set<string>();
  if (!ownBindings) return ids;
  for (const [slot, tokenId] of Object.entries(ownBindings)) {
    if (PART_BINDING_SLOTS.has(slot)) continue;
    const props = BINDING_SLOT_PROPERTIES[slot];
    if (props?.includes(property)) ids.add(tokenId);
  }
  return ids;
}

function matchSourceForToken(
  tokenId: string,
  bindingTokenIds: Set<string>,
): "binding" | "value-match" {
  return bindingTokenIds.has(tokenId) ? "binding" : "value-match";
}

function hasVisibleBorder(cs: CSSStyleDeclaration): boolean {
  const sides = ["top", "right", "bottom", "left"] as const;
  return sides.some((side) => {
    const style = cs.getPropertyValue(`border-${side}-style`).trim();
    if (!style || style === "none") return false;
    const width = parseFloat(cs.getPropertyValue(`border-${side}-width`));
    return Number.isFinite(width) && width > 0;
  });
}

function matchFullTypographyToken(
  cs: CSSStyleDeclaration,
  catalog: TokenVarEntry[],
  rankTokenIds: Set<string>,
  bindingTokenIds: Set<string>,
):
  | {
      cssVar: string;
      tokenId: string;
      source: "binding" | "value-match";
      value: string;
    }
  | undefined {
  const longhands = [
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
  ] as const;
  const actual = Object.fromEntries(
    longhands.map((key) => [key, cs.getPropertyValue(key).trim()]),
  ) as Record<(typeof longhands)[number], string>;

  const typography = catalog.filter((item) => item.category === "typography");
  const preferred = typography.filter((item) => rankTokenIds.has(item.tokenId));
  const pools = [preferred, typography];

  for (const pool of pools) {
    for (const item of pool) {
      if (!item.value) continue;
      const allMatch = longhands.every((key) =>
        typographyLonghandMatches(key, actual[key], item.value),
      );
      if (!allMatch) continue;
      return {
        cssVar: item.cssVar,
        tokenId: item.tokenId,
        source: matchSourceForToken(item.tokenId, bindingTokenIds),
        value: item.value,
      };
    }
  }
  return undefined;
}

function matchTokenForStyle(
  property: (typeof STYLE_KEYS)[number],
  value: string,
  catalog: TokenVarEntry[],
  rankTokenIds: Set<string>,
  bindingTokenIds: Set<string>,
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
  if (COLOR_PROPERTIES.has(property) && isTransparentColor(value)) {
    return undefined;
  }
  // Typography longhands collapse into a single `font` row via matchFullTypographyToken.
  if (TYPOGRAPHY_LONGHANDS.has(property)) {
    return undefined;
  }
  const category = PROPERTY_CATEGORY[property];
  const preferred = catalog.filter(
    (item) =>
      rankTokenIds.has(item.tokenId) &&
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
          source: matchSourceForToken(item.tokenId, bindingTokenIds),
        };
      }
      if (COLOR_PROPERTIES.has(property) && colorsEqual(item.value, value)) {
        return {
          cssVar: item.cssVar,
          tokenId: item.tokenId,
          source: matchSourceForToken(item.tokenId, bindingTokenIds),
        };
      }
    }
  }
  return undefined;
}

function findPaintedBackground(el: HTMLElement): {
  value: string;
  from: NonNullable<StyleInspectRow["inheritedFrom"]>;
} | null {
  let cur = el.parentElement;
  while (cur && cur !== document.documentElement && cur !== document.body) {
    const value = getComputedStyle(cur).backgroundColor.trim();
    if (value && !isTransparentColor(value)) {
      const pbId = cur.getAttribute("data-pb-id") ?? undefined;
      return {
        value,
        from: {
          ...(pbId ? { pbId } : {}),
          handle: getOrCreateHandle(cur),
          tag: cur.tagName.toLowerCase(),
        },
      };
    }
    cur = cur.parentElement;
  }
  return null;
}

function isInspectableNode(el: HTMLElement): boolean {
  return el.hasAttribute("data-pb-id") || Boolean(getInspectRegistration(el));
}

/** Deepest inspectable node from leaf upward (`data-pb-id` or registered). */
export function findDeepestInspectable(leaf: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = leaf;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    if (!isInspectChrome(cur) && isInspectableNode(cur)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

/** Climb one real DOM level; hierarchy navigation must never silently skip. */
export function climbInspectTarget(el: HTMLElement): HTMLElement | null {
  let cur = el.parentElement;
  while (cur) {
    if (cur === document.body || cur === document.documentElement) {
      return null;
    }
    if (isInspectChrome(cur)) {
      cur = cur.parentElement;
      continue;
    }
    return cur;
  }
  return null;
}

export function resolveInspectTarget(
  el: HTMLElement,
  preferParent: boolean,
): HTMLElement {
  if (!preferParent) return el;
  return climbInspectTarget(el) ?? el;
}

/**
 * Hover/click preserve the actual event target. Alt explicitly selects the
 * nearest registered component or stable semantic anchor.
 */
export function resolvePickTarget(
  leaf: HTMLElement,
  preferParent = false,
): HTMLElement {
  if (!preferParent) return leaf;
  const semantic = findDeepestInspectable(leaf);
  if (semantic && semantic !== leaf) return semantic;
  let cur = leaf.parentElement;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    if (!isInspectChrome(cur) && isInspectableNode(cur)) return cur;
    cur = cur.parentElement;
  }
  return leaf;
}

/** Client (viewport) box — matches `position: fixed` inspect overlay. */
export function readBbox(el: HTMLElement): ElementBox {
  const r = el.getBoundingClientRect();
  return {
    x: r.left,
    y: r.top,
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
    const pbMatches = pb
      ? Array.from(document.querySelectorAll("[data-pb-id]")).filter(
          (node) => node.getAttribute("data-pb-id") === pb,
        ).length
      : 0;
    if (pb && pbMatches === 1) {
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
      const pbKey = cur.getAttribute("data-pb-key") ?? undefined;
      return {
        pbId,
        ...(pbKey ? { pbKey } : {}),
        handle: getOrCreateHandle(cur),
      };
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
  const pbKey = el.getAttribute("data-pb-key") ?? undefined;
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
  const selector = domPath(el);
  const summary: ElementSummary = {
    ref: {
      ...(pbId ? { pbId } : {}),
      ...(pbKey ? { pbKey } : {}),
      handle: getOrCreateHandle(el),
      ...(selector ? { selector } : {}),
    },
    tag: el.tagName.toLowerCase(),
    classes: Array.from(el.classList),
    bbox: readBbox(el),
    domPath: selector,
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
  options: StyleMatchOptions | string[] = {},
): StyleInspectRow[] {
  const opts: StyleMatchOptions = Array.isArray(options)
    ? { rankTokenIds: options }
    : options;
  const cs = window.getComputedStyle(el);
  const scope =
    el.closest(".runtime-app") ??
    document.querySelector(".runtime-app") ??
    document.documentElement;
  const catalog = tokenVarCatalog(scope);
  const rankTokenIds = new Set(opts.rankTokenIds ?? []);
  const rows: StyleInspectRow[] = [];
  const visibleBorder = hasVisibleBorder(cs);

  for (const key of STYLE_KEYS) {
    // Skip typography longhands here — collapsed into a single `font` row below.
    if (TYPOGRAPHY_LONGHANDS.has(key)) continue;

    const value = cs.getPropertyValue(key).trim();
    const row: StyleInspectRow = {
      property: key,
      value,
      group: stylePropertyGroup(key),
      source: "raw",
    };

    if (key === "border-color" && !visibleBorder) {
      rows.push(row);
      continue;
    }

    const bindingTokenIds = bindingTokenIdsForProperty(opts.ownBindings, key);
    const match = matchTokenForStyle(
      key,
      value,
      catalog,
      rankTokenIds,
      bindingTokenIds,
    );
    if (match) {
      row.cssVar = match.cssVar;
      row.tokenId = match.tokenId;
      row.source = match.source;
    }

    if (key === "background-color" && isTransparentColor(value)) {
      const painted = findPaintedBackground(el);
      if (painted) {
        const paintedMatch = matchTokenForStyle(
          "background-color",
          painted.value,
          catalog,
          rankTokenIds,
          new Set(),
        );
        row.effectiveValue = painted.value;
        row.inheritedFrom = painted.from;
        row.source = "inherited";
        if (paintedMatch) {
          row.cssVar = paintedMatch.cssVar;
          row.tokenId = paintedMatch.tokenId;
        } else {
          delete row.cssVar;
          delete row.tokenId;
        }
      }
    }

    rows.push(row);
  }

  const fontBindingIds = bindingTokenIdsForProperty(opts.ownBindings, "font");
  const typographyMatch = matchFullTypographyToken(
    cs,
    catalog,
    rankTokenIds,
    fontBindingIds,
  );
  if (typographyMatch) {
    rows.push({
      property: "font",
      value: typographyMatch.value,
      group: "typography",
      cssVar: typographyMatch.cssVar,
      tokenId: typographyMatch.tokenId,
      source: typographyMatch.source,
    });
  } else {
    // "全部" mode: keep raw longhands without token attribution.
    for (const key of TYPOGRAPHY_LONGHANDS) {
      rows.push({
        property: key,
        value: cs.getPropertyValue(key).trim(),
        group: "typography",
        source: "raw",
      });
    }
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

function collectRankTokenIds(
  ownReg: ReturnType<typeof getInspectRegistration>,
  ancestorReg: ReturnType<typeof findRegisteredAncestor>,
): string[] {
  const ids: string[] = [];
  const pushFrom = (reg: NonNullable<typeof ownReg>) => {
    const tokens = reg.getTokens?.() ?? [];
    ids.push(...tokens);
    const bindings = reg.getTokenBindings?.();
    if (bindings) ids.push(...Object.values(bindings));
  };
  if (ownReg) pushFrom(ownReg);
  else if (ancestorReg) pushFrom(ancestorReg);
  return [...new Set(ids)];
}

export function buildSelectPayload(
  el: HTMLElement,
): BridgePayloads["select"] | { error: "PAYLOAD_TOO_LARGE" } {
  const meta: SnapshotMeta = {};
  const element = buildElementSummary(el);
  const ownReg = getInspectRegistration(el);
  const ancestorReg = ownReg ? undefined : findRegisteredAncestor(el);
  const componentReg = ownReg ?? ancestorReg;

  const ownBindings = ownReg?.getTokenBindings?.();
  const styles = readWhitelistedStyles(el, {
    rankTokenIds: collectRankTokenIds(ownReg, ancestorReg),
    ...(ownBindings ? { ownBindings } : {}),
  });

  const payload: BridgePayloads["select"] = {
    element,
    styles,
  };

  // Component context belongs to the owner, while styles and bbox stay on the
  // exact node the user selected.
  if (componentReg) {
    if (componentReg.element !== el) {
      payload.componentOwner = buildElementSummary(componentReg.element);
    }
    if (componentReg.componentId)
      payload.componentId = componentReg.componentId;
    const props = sanitizeRecord(componentReg.getProps?.(), meta);
    const state = sanitizeRecord(componentReg.getState?.(), meta);
    if (props) payload.props = props;
    if (state) payload.state = state;
    const componentBindings = componentReg.getTokenBindings?.();
    const tokenBindings = buildTokenBindings(componentBindings);
    const tokenIds =
      componentReg.getTokens?.() ??
      tokenBindings?.map((row) => row.tokenId) ??
      [];
    if (tokenIds.length) payload.tokens = [...new Set(tokenIds)].slice(0, 100);
    if (tokenBindings) payload.tokenBindings = tokenBindings;
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
