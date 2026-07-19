/** Minimal M3 bridge: init / ready / route only. Full inspect arrives in M4. */

export const BRIDGE_PROTOCOL_VERSION = 1 as const;

export type BridgeSource = "pbwork" | "pbwork-runtime";

export type RuntimeCapability = "route-sync";

export type BridgeEnvelope<TType extends string, TPayload> = {
  source: BridgeSource;
  protocolVersion: typeof BRIDGE_PROTOCOL_VERSION;
  runtimeId: string;
  type: TType;
  prototypeId: string;
  screenId: string;
  variantId?: string;
  themeId: string;
  payload: TPayload;
};

export type InitPayload = { canonicalRuntimeUrl: string };
export type ReadyPayload = {
  canonicalRuntimeUrl: string;
  route: string;
  capabilities: RuntimeCapability[];
};
export type RoutePayload = {
  fromRuntimeUrl: string;
  canonicalRuntimeUrl: string;
};

export type WorkbenchBridgeMessage =
  | BridgeEnvelope<"init", InitPayload>
  | BridgeEnvelope<"reload", { canonicalRuntimeUrl: string }>;

export type RuntimeBridgeMessage =
  | BridgeEnvelope<"ready", ReadyPayload>
  | BridgeEnvelope<"route", RoutePayload>;

export type BridgeMessage = WorkbenchBridgeMessage | RuntimeBridgeMessage;

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
