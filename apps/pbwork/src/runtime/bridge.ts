/** PBWork ↔ Runtime Bridge protocol (design §11). */

export const BRIDGE_PROTOCOL_VERSION = 1 as const;
export const BRIDGE_MAX_BYTES = 64 * 1024;
export const HANDSHAKE_TIMEOUT_MS = 5000;

export type BridgeSource = "pbwork" | "pbwork-runtime";

export type BridgeErrorCode =
  | "PROTOCOL_MISMATCH"
  | "INVALID_ORIGIN"
  | "STALE_RUNTIME"
  | "INVALID_CONTEXT"
  | "INVALID_RUNTIME_ROUTE"
  | "PAYLOAD_TOO_LARGE"
  | "ELEMENT_NOT_FOUND"
  | "RUNTIME_NOT_READY"
  | "COMMAND_FAILED";

export type RuntimeCapability =
  "inspect" | "comment-target" | "highlight" | "route-sync" | "state-summary";

export type JsonRecord = Record<string, unknown>;

export type SnapshotMeta = {
  truncated?: boolean;
  warnings?: Array<
    | "TEXT_TRUNCATED"
    | "DEPTH_TRUNCATED"
    | "COLLECTION_TRUNCATED"
    | "VALUE_REDACTED"
  >;
};

export type ElementRef = { pbId?: string; handle?: string; selector?: string };

export type ElementBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StyleInspectGroup =
  | "color"
  | "typography"
  | "spacing-size"
  | "border-radius"
  | "shadow-layout";

export type StyleInspectRow = {
  property: string;
  value: string;
  /** Painted/effective value when `source` is `inherited` (e.g. ancestor background). */
  effectiveValue?: string;
  cssVar?: string;
  tokenId?: string;
  /** Semantic grouping for inspector display; kept small for Bridge payload. */
  group: StyleInspectGroup;
  /**
   * - binding: current node's contract slot covers this property and value matches
   * - value-match: computed value equals a token (ranking may use ancestor prefs)
   * - inherited: value comes from an ancestor (effective background)
   * - raw: unmatched computed style
   */
  source: "binding" | "value-match" | "inherited" | "raw";
  inheritedFrom?: {
    pbId?: string;
    handle: string;
    tag: string;
  };
};

export type TokenBindingRow = {
  slot: string;
  tokenId: string;
  cssVar: string;
};

export type PagePoint = { x: number; y: number };

export type ElementSummary = {
  ref: ElementRef;
  tag: string;
  classes: string[];
  text?: string;
  bbox?: ElementBox;
  domPath?: string;
  pbRole?: string;
  pbShell?: "sheet" | "dialog" | "modal" | "drawer";
  semanticParent?: ElementRef;
  meta?: SnapshotMeta;
};

export type BridgeEnvelope<TType extends string, TPayload> = {
  source: BridgeSource;
  protocolVersion: typeof BRIDGE_PROTOCOL_VERSION;
  runtimeId: string;
  type: TType;
  requestId?: string;
  prototypeId: string;
  screenId: string;
  variantId?: string;
  themeId: string;
  payload: TPayload;
};

export type BridgePayloads = {
  init: { canonicalRuntimeUrl: string };
  ready: {
    canonicalRuntimeUrl: string;
    route: string;
    capabilities: RuntimeCapability[];
  };
  hover: { element?: ElementSummary };
  select: {
    element: ElementSummary;
    /** Nearest registered design-system component; may differ from `element`. */
    componentOwner?: ElementSummary;
    props?: JsonRecord;
    state?: JsonRecord;
    /** Token IDs used by the registered component (cross-platform keys). */
    tokens?: string[];
    /** Semantic slot → Token ID bindings from the component contract. */
    tokenBindings?: TokenBindingRow[];
    styles: StyleInspectRow[];
    componentId?: string;
    meta?: SnapshotMeta;
  };
  "comment-target": {
    point: PagePoint;
    element?: ElementSummary;
    selector?: string;
    bbox?: ElementBox;
  };
  "clear-select": {
    reason: "escape" | "blank" | "mode-change" | "unmounted";
  };
  route: {
    fromRuntimeUrl: string;
    canonicalRuntimeUrl: string;
    /**
     * How the runtime navigated. Workbench must mirror this on its own history
     * (`push` / `replace` / `back`) instead of always pushing.
     */
    navigation: "push" | "replace" | "back";
  };
  state: { summary: JsonRecord; meta?: SnapshotMeta };
  "inspect-mode": { enabled: boolean };
  "comment-mode": { enabled: boolean };
  highlight: { element?: ElementRef };
  reload: { canonicalRuntimeUrl: string };
  error: { code: BridgeErrorCode; message: string; requestId?: string };
};

export type WorkbenchBridgeMessage =
  | BridgeEnvelope<"init", BridgePayloads["init"]>
  | BridgeEnvelope<"inspect-mode", BridgePayloads["inspect-mode"]>
  | BridgeEnvelope<"comment-mode", BridgePayloads["comment-mode"]>
  | BridgeEnvelope<"highlight", BridgePayloads["highlight"]>
  | BridgeEnvelope<"reload", BridgePayloads["reload"]>;

export type RuntimeBridgeMessage =
  | BridgeEnvelope<"ready", BridgePayloads["ready"]>
  | BridgeEnvelope<"hover", BridgePayloads["hover"]>
  | BridgeEnvelope<"select", BridgePayloads["select"]>
  | BridgeEnvelope<"comment-target", BridgePayloads["comment-target"]>
  | BridgeEnvelope<"clear-select", BridgePayloads["clear-select"]>
  | BridgeEnvelope<"route", BridgePayloads["route"]>
  | BridgeEnvelope<"state", BridgePayloads["state"]>
  | BridgeEnvelope<"error", BridgePayloads["error"]>;

export type BridgeMessage = WorkbenchBridgeMessage | RuntimeBridgeMessage;

export type BridgeContext = {
  runtimeId: string;
  prototypeId: string;
  screenId: string;
  variantId?: string;
  themeId: string;
};

export function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  return (
    (msg.source === "pbwork" || msg.source === "pbwork-runtime") &&
    msg.protocolVersion === BRIDGE_PROTOCOL_VERSION &&
    typeof msg.runtimeId === "string" &&
    typeof msg.type === "string" &&
    typeof msg.prototypeId === "string" &&
    typeof msg.screenId === "string" &&
    typeof msg.themeId === "string" &&
    typeof msg.payload === "object" &&
    msg.payload !== null
  );
}

export function contextMatches(
  msg: BridgeMessage,
  ctx: BridgeContext,
): boolean {
  if (msg.runtimeId !== ctx.runtimeId) return false;
  if (msg.prototypeId !== ctx.prototypeId) return false;
  if (msg.screenId !== ctx.screenId) return false;
  if (msg.themeId !== ctx.themeId) return false;
  if (
    ctx.variantId !== undefined &&
    msg.variantId !== undefined &&
    msg.variantId !== ctx.variantId
  ) {
    return false;
  }
  return true;
}

export function createWorkbenchEnvelope<
  T extends WorkbenchBridgeMessage["type"],
>(
  type: T,
  ctx: BridgeContext,
  payload: BridgePayloads[T],
  requestId?: string,
): Extract<WorkbenchBridgeMessage, { type: T }> {
  const envelope: BridgeEnvelope<T, BridgePayloads[T]> = {
    source: "pbwork",
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    runtimeId: ctx.runtimeId,
    type,
    prototypeId: ctx.prototypeId,
    screenId: ctx.screenId,
    themeId: ctx.themeId,
    payload,
  };
  if (ctx.variantId !== undefined) envelope.variantId = ctx.variantId;
  if (requestId) envelope.requestId = requestId;
  return envelope as unknown as Extract<WorkbenchBridgeMessage, { type: T }>;
}

export function measurePayloadBytes(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return BRIDGE_MAX_BYTES + 1;
  }
}

export function parseRuntimePathname(pathname: string): {
  prototypeId: string;
  screenSlug: string;
} | null {
  const match = pathname.match(/^\/prototype\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  return { prototypeId: match[1]!, screenSlug: match[2]! };
}

export function workbenchPathFromRuntimeUrl(runtimeUrl: string): string | null {
  try {
    const url = new URL(runtimeUrl, "http://local.invalid");
    const parsed = parseRuntimePathname(url.pathname);
    if (!parsed) return null;
    const search = url.searchParams.toString();
    const base = `/workbench/prototypes/${parsed.prototypeId}/screens/${parsed.screenSlug}`;
    return search ? `${base}?${search}` : base;
  } catch {
    return null;
  }
}
