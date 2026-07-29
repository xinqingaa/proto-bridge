import {
  RUNTIME_CAPTURE_GLOBAL,
  RUNTIME_CAPTURE_PROTOCOL_VERSION,
  RuntimeCaptureRequest,
  RuntimeCaptureResponse,
  type RuntimeActualDimensions,
  type RuntimeCaptureApi,
  type RuntimeCaptureFailure,
  type RuntimeCaptureManifest,
  type RuntimeCaptureRequestPayload,
  type RuntimeFragmentIdentity,
  type RuntimeScreenManifest,
} from "@proto-bridge/core/v2/runtime-contract";
import { loadPrototypeScreens } from "@/design-system/loaders";

type RuntimeContext = {
  prototypeId: string;
  screenId: string;
  variantId: string;
  themeId: string;
  fixtureId?: string | undefined;
};

type CaptureProtocolOptions = {
  getContext(): RuntimeContext | null;
  navigate(input: RuntimeContext): Promise<void>;
  waitForStable(): Promise<void>;
};

declare global {
  interface Window {
    __PROTO_BRIDGE_CAPTURE_V2__?: RuntimeCaptureApi;
  }
}

// Scenario navigation can remount RuntimeLayout or rebuild the document. Keep
// the prepared baseline in both module state and same-tab session storage so
// the new protocol instance can still reset the isolated browser Case.
let retainedBaseline: RuntimeContext | null = null;
const BASELINE_STORAGE_KEY = "pbwork.capture-v2.baseline";

function saveBaseline(context: RuntimeContext): void {
  retainedBaseline = { ...context };
  window.sessionStorage.setItem(
    BASELINE_STORAGE_KEY,
    JSON.stringify(retainedBaseline),
  );
}

function readBaseline(): RuntimeContext | null {
  if (retainedBaseline) return retainedBaseline;
  const raw = window.sessionStorage.getItem(BASELINE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RuntimeContext>;
    if (
      typeof value.prototypeId !== "string" ||
      typeof value.screenId !== "string" ||
      typeof value.variantId !== "string" ||
      typeof value.themeId !== "string" ||
      (value.fixtureId !== undefined && typeof value.fixtureId !== "string")
    ) {
      return null;
    }
    retainedBaseline = {
      prototypeId: value.prototypeId,
      screenId: value.screenId,
      variantId: value.variantId,
      themeId: value.themeId,
      ...(value.fixtureId ? { fixtureId: value.fixtureId } : {}),
    };
    return retainedBaseline;
  } catch {
    return null;
  }
}

function digestText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `registry-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function toScreenManifest(
  screen: ReturnType<typeof loadPrototypeScreens>[number],
): RuntimeScreenManifest {
  return {
    prototypeId: screen.prototypeId,
    screenId: screen.screenId,
    screenSlug: screen.screenSlug,
    path: screen.path,
    sourcePath: screen.view,
    defaultVariantId: screen.defaultVariantId,
    variants: screen.variants.map((variant) => ({
      variantId: variant.id,
      critical: variant.critical ?? false,
      ...(variant.fixture ? { fixtureId: variant.fixture } : {}),
    })),
    actions: (screen.actions ?? []).map((action) => ({
      actionId: action.id,
      kind: action.kind,
      target: action.target,
    })),
    scenarios: (screen.scenarios ?? []).map((scenario) => ({
      scenarioId: scenario.id,
      ownerScreenId: screen.screenId,
      initialVariantId: scenario.initialVariantId,
      actionIds: scenario.actionIds,
      checkpoints: scenario.checkpoints.map((checkpoint) => ({
        checkpointId: checkpoint.id,
        screenId: checkpoint.screenId,
        variantId: checkpoint.variantId,
        requiredFragments: checkpoint.requiredFragments,
      })),
    })),
  };
}

function buildManifest(prototypeId: string): RuntimeCaptureManifest {
  const screens = loadPrototypeScreens()
    .filter((screen) => screen.prototypeId === prototypeId)
    .map(toScreenManifest)
    .sort((a, b) => a.screenId.localeCompare(b.screenId));
  const versionInput = screens.map((screen) => ({
    screenId: screen.screenId,
    defaultVariantId: screen.defaultVariantId,
    variants: screen.variants,
    actions: screen.actions,
    scenarios: screen.scenarios,
  }));
  return {
    protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
    inputVersion: digestText(JSON.stringify(versionInput)),
    capabilities: [
      "describe",
      "prepare",
      "readiness",
      "semantic-snapshot",
      "reset",
      "scenario",
    ],
    screens,
  };
}

function actualDimensions(context: RuntimeContext): RuntimeActualDimensions {
  return {
    ...context,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      deviceScaleFactor: window.devicePixelRatio,
    },
  };
}

function sameDimensions(
  actual: RuntimeContext,
  expected: RuntimeContext,
): boolean {
  return (
    actual.prototypeId === expected.prototypeId &&
    actual.screenId === expected.screenId &&
    actual.variantId === expected.variantId &&
    actual.themeId === expected.themeId &&
    (expected.fixtureId === undefined ||
      actual.fixtureId === expected.fixtureId)
  );
}

function markerElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-pb-role][data-pb-id]"),
  );
}

function markerIdentity(
  element: HTMLElement,
  screenId: string,
): RuntimeFragmentIdentity {
  const pbId = element.dataset.pbId!;
  const pbKey = element.dataset.pbKey;
  return {
    screenId,
    pbId,
    ...(pbKey ? { pbKey } : {}),
  };
}

function assertMarkerIdentities(
  elements: HTMLElement[],
  screenId: string,
): void {
  const byPbId = new Map<string, HTMLElement[]>();
  const exact = new Set<string>();
  for (const element of elements) {
    const identity = markerIdentity(element, screenId);
    const group = byPbId.get(identity.pbId) ?? [];
    group.push(element);
    byPbId.set(identity.pbId, group);
    const key = `${identity.pbId}#${identity.pbKey ?? ""}`;
    if (exact.has(key)) {
      throw new ProtocolFailure(
        "duplicate-fragment-identity",
        `Duplicate semantic Fragment identity ${key}.`,
      );
    }
    exact.add(key);
  }
  for (const [pbId, group] of byPbId) {
    if (group.length > 1 && group.some((element) => !element.dataset.pbKey)) {
      throw new ProtocolFailure(
        "duplicate-fragment-identity",
        `Repeated template ${pbId} requires a stable data-pb-key on every instance.`,
      );
    }
  }
}

function markerSignature(elements: HTMLElement[], screenId: string): string {
  return JSON.stringify(
    elements.map((element) => markerIdentity(element, screenId)),
  );
}

async function waitForStableSemanticMarkers(
  options: CaptureProtocolOptions,
  expected: RuntimeContext,
  timeoutMs = 5000,
): Promise<HTMLElement[]> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    await options.waitForStable();
    const firstContext = options.getContext();
    if (!firstContext || !sameDimensions(firstContext, expected)) {
      throw new ProtocolFailure(
        "runtime-not-ready",
        "Runtime route changed while semantic markers were stabilizing.",
      );
    }
    const first = markerElements();
    if (first.length === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 25));
      continue;
    }
    assertMarkerIdentities(first, firstContext.screenId);
    const firstSignature = markerSignature(first, firstContext.screenId);

    await options.waitForStable();
    const secondContext = options.getContext();
    if (!secondContext || !sameDimensions(secondContext, expected)) {
      throw new ProtocolFailure(
        "runtime-not-ready",
        "Runtime route changed while semantic markers were stabilizing.",
      );
    }
    const second = markerElements();
    if (second.length > 0) {
      assertMarkerIdentities(second, secondContext.screenId);
      if (markerSignature(second, secondContext.screenId) === firstSignature) {
        return second;
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 25));
  }
  throw new ProtocolFailure(
    "runtime-not-ready",
    "Runtime semantic markers did not stabilize.",
  );
}

function findFragment(
  fragment: RuntimeFragmentIdentity,
  context: RuntimeContext,
): HTMLElement | undefined {
  if (fragment.screenId !== context.screenId) return undefined;
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-pb-id]"),
  ).find(
    (element) =>
      element.dataset.pbId === fragment.pbId &&
      (fragment.pbKey === undefined ||
        element.dataset.pbKey === fragment.pbKey),
  );
}

async function waitForExpectedContext(
  options: CaptureProtocolOptions,
  expected: RuntimeContext,
  timeoutMs = 5000,
): Promise<RuntimeContext> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    await options.waitForStable();
    const current = options.getContext();
    if (current && sameDimensions(current, expected)) return current;
    await new Promise((resolve) => window.setTimeout(resolve, 25));
  }
  throw new ProtocolFailure(
    "dimension-mismatch",
    `Runtime did not reach ${expected.screenId}/${expected.variantId}/${expected.themeId}.`,
  );
}

async function waitForFragments(
  options: CaptureProtocolOptions,
  context: RuntimeContext,
  fragments: RuntimeFragmentIdentity[],
  timeoutMs = 5000,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    await options.waitForStable();
    if (fragments.every((fragment) => findFragment(fragment, context))) return;
    await new Promise((resolve) => window.setTimeout(resolve, 25));
  }
  const missing = fragments.find(
    (fragment) => !findFragment(fragment, context),
  );
  throw new ProtocolFailure(
    "fragment-not-found",
    `Fragment ${missing?.pbId ?? "unknown"}/${missing?.pbKey ?? ""} is missing.`,
    missing,
  );
}

class ProtocolFailure extends Error {
  constructor(
    readonly code: RuntimeCaptureFailure["error"]["code"],
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function installRuntimeCaptureProtocol(
  options: CaptureProtocolOptions,
): () => void {
  async function handle(
    payload: RuntimeCaptureRequestPayload,
  ): Promise<unknown> {
    const context = options.getContext();
    if (!context) {
      throw new ProtocolFailure(
        "runtime-not-ready",
        "Runtime route has not resolved.",
      );
    }
    const manifest = buildManifest(context.prototypeId);

    if (payload.kind === "describe") return { manifest };

    if (payload.kind === "prepare") {
      if (!sameDimensions(context, payload.expected)) {
        throw new ProtocolFailure(
          "dimension-mismatch",
          "Runtime dimensions do not match the prepared Case.",
          { actual: context, expected: payload.expected },
        );
      }
      saveBaseline(context);
      await options.waitForStable();
      return { actual: actualDimensions(context) };
    }

    if (payload.kind === "reset") {
      const baseline = readBaseline();
      if (!baseline) {
        throw new ProtocolFailure(
          "runtime-not-ready",
          "prepare must establish a reset baseline first.",
        );
      }
      await options.navigate(baseline);
      const resetContext = await waitForExpectedContext(options, baseline);
      return { actual: actualDimensions(resetContext) };
    }

    if (payload.kind === "readiness") {
      const readyContext = await waitForExpectedContext(
        options,
        payload.expected,
      );
      if (
        window.innerWidth !== payload.expected.viewport.width ||
        window.innerHeight !== payload.expected.viewport.height
      ) {
        throw new ProtocolFailure(
          "dimension-mismatch",
          "Runtime viewport does not match the Core Device profile.",
          {
            actual: { width: window.innerWidth, height: window.innerHeight },
            expected: payload.expected.viewport,
          },
        );
      }
      await waitForStableSemanticMarkers(options, readyContext);
      await waitForFragments(options, readyContext, payload.requiredFragments);
      return {
        actual: actualDimensions(readyContext),
        stable: true,
        checks: ["route", "viewport", "fonts", "motion", "semantic-markers"],
      };
    }

    if (payload.kind === "semantic-snapshot") {
      const current = options.getContext();
      if (!current) {
        throw new ProtocolFailure(
          "runtime-not-ready",
          "Runtime route changed.",
        );
      }
      const all = await waitForStableSemanticMarkers(options, current);
      const selected =
        payload.fragments.length === 0
          ? all
          : payload.fragments.map((fragment) => {
              const element = findFragment(fragment, current);
              if (!element) {
                throw new ProtocolFailure(
                  "fragment-not-found",
                  `Fragment ${fragment.pbId}/${fragment.pbKey ?? ""} is missing.`,
                );
              }
              return element;
            });
      return {
        actual: actualDimensions(current),
        nodes: selected.map((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return {
            fragment: markerIdentity(element, current.screenId),
            role: element.dataset.pbRole!,
            tag: element.tagName.toLowerCase(),
            text: (element.innerText || element.textContent || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 1000),
            visible:
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0,
            bbox: {
              x: Number(rect.x.toFixed(2)),
              y: Number(rect.y.toFixed(2)),
              width: Number(rect.width.toFixed(2)),
              height: Number(rect.height.toFixed(2)),
            },
          };
        }),
      };
    }

    const ownerScreen = manifest.screens.find((screen) =>
      screen.scenarios.some(
        (scenario) => scenario.scenarioId === payload.scenarioId,
      ),
    );
    const scenario = ownerScreen?.scenarios.find(
      (candidate) => candidate.scenarioId === payload.scenarioId,
    );
    if (!scenario) {
      throw new ProtocolFailure(
        "unknown-scenario",
        `Unknown Scenario ${payload.scenarioId}.`,
      );
    }

    if (payload.kind === "execute-action") {
      if (!scenario.actionIds.includes(payload.actionId)) {
        throw new ProtocolFailure(
          "unknown-action",
          `Action ${payload.actionId} is not part of Scenario ${payload.scenarioId}.`,
        );
      }
      const action = ownerScreen?.actions.find(
        (candidate) => candidate.actionId === payload.actionId,
      );
      if (!action) {
        throw new ProtocolFailure(
          "unknown-action",
          `Unknown Action ${payload.actionId}.`,
        );
      }
      const target = findFragment(action.target, context);
      if (!target) {
        throw new ProtocolFailure(
          "fragment-not-found",
          `Action target ${action.target.pbId}/${action.target.pbKey ?? ""} is missing.`,
        );
      }
      target.click();
      return {
        actionId: action.actionId,
        actual: actualDimensions(options.getContext() ?? context),
      };
    }

    const checkpoint = scenario.checkpoints.find(
      (candidate) => candidate.checkpointId === payload.checkpointId,
    );
    if (!checkpoint) {
      throw new ProtocolFailure(
        "unknown-checkpoint",
        `Unknown Checkpoint ${payload.checkpointId}.`,
      );
    }
    const checkpointContext = await waitForExpectedContext(options, {
      prototypeId: ownerScreen!.prototypeId,
      screenId: checkpoint.screenId,
      variantId: checkpoint.variantId,
      themeId: context.themeId,
    });
    await waitForFragments(
      options,
      checkpointContext,
      checkpoint.requiredFragments,
    );
    return {
      checkpointId: checkpoint.checkpointId,
      actual: actualDimensions(checkpointContext),
    };
  }

  const api: RuntimeCaptureApi = {
    protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
    async request(rawRequest: unknown): Promise<unknown> {
      let request: ReturnType<typeof RuntimeCaptureRequest.parse>;
      try {
        request = RuntimeCaptureRequest.parse(rawRequest);
      } catch (error) {
        const fallbackId =
          rawRequest &&
          typeof rawRequest === "object" &&
          "requestId" in rawRequest &&
          typeof rawRequest.requestId === "string"
            ? rawRequest.requestId
            : "invalid-request";
        return RuntimeCaptureResponse.parse({
          protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
          requestId: fallbackId,
          kind: "invalid-request",
          ok: false,
          error: {
            code: "invalid-request",
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
      try {
        const payload = await handle(request.payload);
        return RuntimeCaptureResponse.parse({
          protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
          requestId: request.requestId,
          kind: request.payload.kind,
          ok: true,
          payload,
        });
      } catch (error) {
        const failure =
          error instanceof ProtocolFailure
            ? error
            : new ProtocolFailure(
                "command-failed",
                error instanceof Error ? error.message : String(error),
              );
        return RuntimeCaptureResponse.parse({
          protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
          requestId: request.requestId,
          kind: request.payload.kind,
          ok: false,
          error: {
            code: failure.code,
            message: failure.message,
            ...(failure.details === undefined
              ? {}
              : { details: failure.details }),
          },
        });
      }
    },
  };

  window[RUNTIME_CAPTURE_GLOBAL] = api;
  return () => {
    if (window[RUNTIME_CAPTURE_GLOBAL] === api) {
      delete window[RUNTIME_CAPTURE_GLOBAL];
    }
  };
}
