import {
  RUNTIME_CAPTURE_GLOBAL,
  RUNTIME_CAPTURE_PROTOCOL_VERSION,
  RuntimeCaptureRequest,
  RuntimeCaptureResponse,
  RuntimeSemanticNode,
  type RuntimeActualDimensions,
  type RuntimeCaptureApi,
  type RuntimeCaptureFailure,
  type RuntimeCaptureManifest,
  type RuntimeCaptureRequestPayload,
  type RuntimeFragmentIdentity,
  type RuntimeScreenManifest,
} from "@proto-bridge/core/v2/runtime-contract";
import { TOKEN_BINDING_LITERALS } from "@proto-bridge/core/v2";
import {
  loadComponentContracts,
  loadPrototypes,
  loadPrototypeScreens,
  loadThemes,
  loadTokens,
} from "@/design-system/loaders";
import { validateRegistries } from "@/design-system/validateRegistries";
import {
  findRegisteredAncestor,
  getInspectRegistration,
} from "@/runtime/inspect/registry";
import { requiresStrictEvidence } from "@/prototypes/evidence-policy";

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

const CAPTURE_PROP_KEYS = [
  "tone",
  "selectionStyle",
  "size",
  "label",
  "elevated",
  "variant",
] as const;

function readDatasetTokenBindings(
  element: HTMLElement,
): Record<string, string> | undefined {
  const knownTokenIds = new Set(loadTokens().map((token) => token.id));
  const allowedLiterals = new Set<string>(TOKEN_BINDING_LITERALS);
  const bindings: Record<string, string> = {};
  for (const [key, value] of Object.entries(element.dataset)) {
    if (!key.startsWith("pbToken") || !value) continue;
    const slot = key
      .slice("pbToken".length)
      .replace(/^[A-Z]/, (char) => char.toLowerCase())
      .replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    if (!/^[a-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/.test(slot)) {
      throw new ProtocolFailure(
        "invalid-semantic-marker",
        `Invalid Token Evidence slot ${slot}.`,
        { slot, tokenId: value },
      );
    }
    if (!knownTokenIds.has(value) && !allowedLiterals.has(value)) {
      throw new ProtocolFailure(
        "invalid-semantic-marker",
        `Unknown Foundation Token ${value} in data-pb-token-${slot}.`,
        { slot, tokenId: value },
      );
    }
    bindings[slot] = value;
  }
  return Object.keys(bindings).length > 0 ? bindings : undefined;
}

function readComponentContext(element: HTMLElement): {
  componentId?: string;
  props?: Record<string, unknown>;
  tokenBindings?: Record<string, string>;
  tokenBindingEvidence?: Array<{
    slot: string;
    tokenId: string;
    source: "component-contract" | "runtime-registration" | "data-pb";
  }>;
  tokenBindingConflicts?: Array<{ slot: string; candidates: string[] }>;
} {
  const fromDataset = readDatasetTokenBindings(element);
  const directRegistration = getInspectRegistration(element);
  const reg =
    directRegistration ??
    (fromDataset ? undefined : findRegisteredAncestor(element));
  if (!reg) {
    return fromDataset
      ? {
          tokenBindings: fromDataset,
          tokenBindingEvidence: Object.entries(fromDataset).map(
            ([slot, tokenId]) => ({ slot, tokenId, source: "data-pb" }),
          ),
        }
      : {};
  }
  const rawProps = reg.getProps?.() ?? {};
  const props: Record<string, unknown> = {};
  for (const key of CAPTURE_PROP_KEYS) {
    if (rawProps[key] !== undefined) props[key] = rawProps[key];
  }
  const registered = reg.getTokenBindings?.() ?? {};
  const tokenBindings = { ...registered };
  for (const [slot, tokenId] of Object.entries(fromDataset ?? {})) {
    if (!(slot in tokenBindings)) tokenBindings[slot] = tokenId;
  }
  const registrationSource: "component-contract" | "runtime-registration" =
    reg.componentId ? "component-contract" : "runtime-registration";
  const tokenBindingEvidence = [
    ...Object.entries(registered).map(([slot, tokenId]) => ({
      slot,
      tokenId,
      source: registrationSource,
    })),
    ...Object.entries(fromDataset ?? {}).map(([slot, tokenId]) => ({
      slot,
      tokenId,
      source: "data-pb" as const,
    })),
  ];
  const tokenBindingConflicts = Object.entries(fromDataset ?? {}).flatMap(
    ([slot, tokenId]) =>
      registered[slot] && registered[slot] !== tokenId
        ? [{ slot, candidates: [registered[slot], tokenId] }]
        : [],
  );
  return {
    ...(reg.componentId ? { componentId: reg.componentId } : {}),
    ...(Object.keys(props).length > 0 ? { props } : {}),
    ...(Object.keys(tokenBindings).length > 0 ? { tokenBindings } : {}),
    ...(tokenBindingEvidence.length > 0 ? { tokenBindingEvidence } : {}),
    ...(tokenBindingConflicts.length > 0 ? { tokenBindingConflicts } : {}),
  };
}

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

function canonicalRouteQuery(
  query: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!query || Object.keys(query).length === 0) return undefined;
  return Object.fromEntries(
    Object.entries(query).sort(([left], [right]) => left.localeCompare(right)),
  );
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
    variants: screen.variants.map((variant) => {
      const routeQuery = canonicalRouteQuery(variant.query);
      return {
        variantId: variant.id,
        label: variant.label,
        ...(variant.fixture ? { fixtureId: variant.fixture } : {}),
        ...(routeQuery ? { routeQuery } : {}),
        ...(variant.requiredFragments
          ? { requiredFragments: variant.requiredFragments }
          : {}),
        ...(variant.shellPolicy ? { shellPolicy: variant.shellPolicy } : {}),
        structureAssertions: variant.structureAssertions ?? [],
      };
    }),
    actions: (screen.actions ?? []).map((action) => ({
      actionId: action.id,
      kind: action.kind,
      target: action.target,
    })),
    scenarios: (screen.scenarios ?? []).map((scenario) => ({
      scenarioId: scenario.id,
      label: scenario.label,
      ownerScreenId: screen.screenId,
      initialVariantId: scenario.initialVariantId,
      actionIds: scenario.actionIds,
      checkpoints: scenario.checkpoints.map((checkpoint) => ({
        checkpointId: checkpoint.id,
        screenId: checkpoint.screenId,
        variantId: checkpoint.variantId,
        requiredFragments: checkpoint.requiredFragments,
        ...(checkpoint.expectedStates
          ? { expectedStates: checkpoint.expectedStates }
          : {}),
        ...(checkpoint.expectedFragmentKeys
          ? { expectedFragmentKeys: checkpoint.expectedFragmentKeys }
          : {}),
        ...(checkpoint.forbiddenFragments
          ? { forbiddenFragments: checkpoint.forbiddenFragments }
          : {}),
        structureAssertions: checkpoint.structureAssertions ?? [],
      })),
    })),
    ...(screen.requiredScenarioIds
      ? { requiredScenarioIds: screen.requiredScenarioIds }
      : {}),
    shellFragments: screen.shellFragments ?? [],
    structureAssertions: screen.structureAssertions ?? [],
    evidencePolicy: requiresStrictEvidence(screen.screenId)
      ? "strict"
      : "legacy",
  };
}

export function buildRuntimeCaptureManifest(
  prototypeId: string,
): RuntimeCaptureManifest {
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
  const catalogValues = [
    {
      kind: "prototype" as const,
      values: loadPrototypes().filter(
        (prototype) => prototype.id === prototypeId,
      ),
      id: (value: { id: string }) => value.id,
    },
    {
      kind: "screen" as const,
      values: loadPrototypeScreens().filter(
        (screen) => screen.prototypeId === prototypeId,
      ),
      id: (value: { screenId: string }) => value.screenId,
    },
    {
      kind: "component" as const,
      values: loadComponentContracts(),
      id: (value: { id: string }) => value.id,
    },
    {
      kind: "token" as const,
      values: [
        ...loadTokens(),
        ...loadThemes().map((theme) => ({ ...theme, catalogObject: "theme" })),
      ],
      id: (value: { id: string }) => value.id,
    },
    {
      kind: "scenario" as const,
      values: loadPrototypeScreens()
        .filter((screen) => screen.prototypeId === prototypeId)
        .flatMap((screen) =>
          (screen.scenarios ?? []).map((scenario) => ({
            ...scenario,
            ownerScreenId: screen.screenId,
          })),
        ),
      id: (value: { id: string; ownerScreenId: string }) =>
        `${value.ownerScreenId}.${value.id}`,
    },
  ];
  const catalogs = catalogValues.map((catalog) => {
    const entries = catalog.values.map((value) => ({
      objectId: catalog.id(value as never),
      digest: digestText(JSON.stringify(value)),
      value,
      blobIds: [],
    }));
    return {
      kind: catalog.kind,
      inputDigest: digestText(JSON.stringify(entries)),
      entries,
    };
  });
  const authoringDiagnostics: RuntimeCaptureManifest["authoringDiagnostics"] =
    validateRegistries().map((error, index) => ({
    diagnosticId: `registry-${error.resourceType}-${error.resourceId ?? "unknown"}-${index}`,
    code: `registry.${error.keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "invalid"}`,
    severity: "block" as const,
    message: `${error.resourceType} ${error.resourceId ?? "unknown"}: ${error.message}`,
    caseIds: [],
    source: {
      kind: "registry" as const,
      locator: `${error.resourceType}:${error.resourceId ?? "unknown"}${error.instancePath}`,
      ...(error.resourceType === "screen" && error.resourceId
        ? { screenId: error.resourceId }
        : {}),
    },
    nextAction: "Fix the Registry/Contract validation error before Capture.",
    }));
  authoringDiagnostics.push(
    ...screens
      .filter(
        (screen) =>
          screen.evidencePolicy === "strict" &&
          screen.shellFragments.length === 0 &&
          screen.variants.some((variant) => variant.shellPolicy !== "replace"),
      )
      .map((screen, index) => ({
        diagnosticId: `reconstruction-shell-${screen.screenId}-${index}`,
        code: "reconstruction.shell-contract-missing",
        severity: "warning" as const,
        message: `Strict Screen ${screen.screenId} must declare shellFragments or explicitly mark every Variant shellPolicy=replace before high-fidelity delivery.`,
        caseIds: [],
        source: {
          kind: "registry" as const,
          locator: `screen:${screen.screenId}/shellFragments`,
          screenId: screen.screenId,
        },
        nextAction:
          "Author the stable Screen shell and Variant inheritance/replacement policy; do not infer it from a Screenshot.",
      })),
  );
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
    catalogs,
    authoringDiagnostics,
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

function semanticAncestors(
  element: HTMLElement,
  screenId: string,
): RuntimeFragmentIdentity[] {
  const ancestors: RuntimeFragmentIdentity[] = [];
  let current = element.parentElement;
  while (current) {
    if (current.dataset.pbId && current.dataset.pbRole) {
      ancestors.push(markerIdentity(current, screenId));
    }
    current = current.parentElement;
  }
  return ancestors;
}

function isVerticalScrollContainer(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const overflow = style.overflowY;
  return (
    overflow === "auto" ||
    overflow === "scroll" ||
    overflow === "overlay" ||
    element.dataset.pbRole === "scroll-list"
  );
}

function observedScrollOwner(
  element: HTMLElement,
  screenId: string,
):
  | { kind: "viewport" }
  | { kind: "fragment"; fragment: RuntimeFragmentIdentity } {
  let current = element.parentElement;
  while (current) {
    if (isVerticalScrollContainer(current)) {
      if (current.dataset.pbId && current.dataset.pbRole) {
        return {
          kind: "fragment",
          fragment: markerIdentity(current, screenId),
        };
      }
      const semanticOwner = current.closest<HTMLElement>(
        "[data-pb-id][data-pb-role]",
      );
      if (semanticOwner && semanticOwner !== element) {
        return {
          kind: "fragment",
          fragment: markerIdentity(semanticOwner, screenId),
        };
      }
    }
    current = current.parentElement;
  }
  return { kind: "viewport" };
}

function observedPositioning(
  element: HTMLElement,
): "flow" | "sticky" | "fixed" | "overlay" {
  const role = element.dataset.pbRole;
  if (["sheet", "dialog", "drawer", "toast"].includes(role ?? "")) {
    return "overlay";
  }
  const position = window.getComputedStyle(element).position;
  if (position === "fixed") return "fixed";
  if (position === "sticky") return "sticky";
  return "flow";
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

function findFragments(
  fragment: RuntimeFragmentIdentity,
  context: RuntimeContext,
): HTMLElement[] {
  if (fragment.screenId !== context.screenId) return [];
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-pb-id][data-pb-role]"),
  ).filter(
    (element) =>
      element.dataset.pbId === fragment.pbId &&
      (fragment.pbKey === undefined ||
        element.dataset.pbKey === fragment.pbKey),
  );
}

function findFragment(
  fragment: RuntimeFragmentIdentity,
  context: RuntimeContext,
): HTMLElement | undefined {
  return findFragments(fragment, context)[0];
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
  strict: boolean,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    await options.waitForStable();
    const failure = fragments
      .map((fragment) => {
        if (strict && fragment.pbId.startsWith("ds.")) {
          return new ProtocolFailure(
            "invalid-business-identity",
            `Strict required Fragment ${fragment.pbId} must use a business identity, not ds.*.`,
            fragment,
          );
        }
        const matches = findFragments(fragment, context);
        if (matches.length === 0) {
          const idOnly = Array.from(
            document.querySelectorAll<HTMLElement>("[data-pb-id]"),
          ).find(
            (element) =>
              element.dataset.pbId === fragment.pbId &&
              (fragment.pbKey === undefined ||
                element.dataset.pbKey === fragment.pbKey) &&
              !element.hasAttribute("data-pb-role"),
          );
          if (idOnly) {
            return new ProtocolFailure(
              "invalid-semantic-marker",
              `Required Fragment ${fragment.pbId}/${fragment.pbKey ?? ""} has data-pb-id without data-pb-role.`,
              fragment,
            );
          }
          return undefined;
        }
        if (matches.length > 1) {
          return new ProtocolFailure(
            "duplicate-fragment-identity",
            `Required Fragment ${fragment.pbId}/${fragment.pbKey ?? ""} matched ${matches.length} semantic markers.`,
            fragment,
          );
        }
        const element = matches[0]!;
        const role = element.dataset.pbRole;
        if (
          !RuntimeSemanticNode.shape.role.safeParse(role).success ||
          role === "unknown"
        ) {
          return new ProtocolFailure(
            "invalid-fragment-role",
            `Required Fragment ${fragment.pbId}/${fragment.pbKey ?? ""} has invalid role ${role ?? "missing"}.`,
            { fragment, role },
          );
        }
        if (!isVisible(element)) {
          const rect = element.getBoundingClientRect();
          return new ProtocolFailure(
            "fragment-not-visible",
            `Required Fragment ${fragment.pbId}/${fragment.pbKey ?? ""} is hidden or has a zero-size box.`,
            { fragment, bbox: { width: rect.width, height: rect.height } },
          );
        }
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        if (hit && !element.contains(hit)) {
          return new ProtocolFailure(
            "fragment-occluded",
            `Required Fragment ${fragment.pbId}/${fragment.pbKey ?? ""} is occluded at its center point.`,
            {
              fragment,
              occluder:
                hit instanceof HTMLElement
                  ? {
                      tag: hit.tagName.toLowerCase(),
                      pbId: hit.dataset.pbId,
                      className: hit.className,
                    }
                  : { tag: hit.nodeName.toLowerCase() },
            },
          );
        }
        return null;
      })
      .find((result) => result !== null && result !== undefined);
    if (
      !failure &&
      fragments.every(
        (fragment) => findFragments(fragment, context).length === 1,
      )
    )
      return;
    if (failure) throw failure;
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

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function readCheckpointState(element: HTMLElement, key: string): unknown {
  const registered =
    getInspectRegistration(element) ?? findRegisteredAncestor(element);
  const state = registered?.getState?.();
  if (state && key in state) return state[key];
  if (key === "selected") {
    const selected = element.querySelector<HTMLElement>(
      '[data-pb-role="tab"][aria-selected="true"], [role="tab"][aria-selected="true"]',
    );
    return selected?.dataset.pbKey;
  }
  return undefined;
}

async function verifyCheckpointAssertions(
  options: CaptureProtocolOptions,
  context: RuntimeContext,
  checkpoint: RuntimeScreenManifest["scenarios"][number]["checkpoints"][number],
  timeoutMs = 5000,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  let lastFailure = "Checkpoint assertions did not pass.";
  while (performance.now() < deadline) {
    await options.waitForStable();
    const current = options.getContext();
    if (!current || !sameDimensions(current, context)) {
      throw new ProtocolFailure(
        "dimension-mismatch",
        "Runtime route changed while verifying Checkpoint assertions.",
      );
    }

    const failedState = checkpoint.expectedStates?.find((expectation) => {
      const element = findFragment(expectation.fragment, context);
      return (
        !element ||
        readCheckpointState(element, expectation.key) !== expectation.value
      );
    });
    if (failedState) {
      lastFailure = `Fragment ${failedState.fragment.pbId}/${failedState.fragment.pbKey ?? ""} state ${failedState.key} did not equal ${JSON.stringify(failedState.value)}.`;
      await new Promise((resolve) => window.setTimeout(resolve, 25));
      continue;
    }

    const failedKeys = checkpoint.expectedFragmentKeys?.find((expectation) => {
      const actual = markerElements()
        .filter(
          (element) =>
            element.dataset.pbId === expectation.fragment.pbId &&
            isVisible(element),
        )
        .map((element) => element.dataset.pbKey)
        .filter((key): key is string => Boolean(key))
        .sort();
      const expected = [...expectation.keys].sort();
      return JSON.stringify(actual) !== JSON.stringify(expected);
    });
    if (failedKeys) {
      lastFailure = `Visible keys for ${failedKeys.fragment.pbId} did not exactly match [${failedKeys.keys.join(", ")}].`;
      await new Promise((resolve) => window.setTimeout(resolve, 25));
      continue;
    }

    const forbidden = checkpoint.forbiddenFragments?.find((fragment) => {
      const element = findFragment(fragment, context);
      return element ? isVisible(element) : false;
    });
    if (forbidden) {
      lastFailure = `Forbidden Fragment ${forbidden.pbId}/${forbidden.pbKey ?? ""} is visible.`;
      await new Promise((resolve) => window.setTimeout(resolve, 25));
      continue;
    }
    return;
  }
  throw new ProtocolFailure("command-failed", lastFailure);
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
    const manifest = buildRuntimeCaptureManifest(context.prototypeId);

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
      const screen = manifest.screens.find(
        (candidate) => candidate.screenId === readyContext.screenId,
      );
      await waitForFragments(
        options,
        readyContext,
        payload.requiredFragments,
        screen?.evidencePolicy === "strict",
      );
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
              const matches = findFragments(fragment, current);
              if (matches.length !== 1) {
                throw new ProtocolFailure(
                  matches.length === 0
                    ? "fragment-not-found"
                    : "duplicate-fragment-identity",
                  `Fragment ${fragment.pbId}/${fragment.pbKey ?? ""} matched ${matches.length} semantic markers.`,
                );
              }
              return matches[0]!;
            });
      return {
        actual: actualDimensions(current),
        nodes: selected.map((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const context = readComponentContext(element);
          const ancestors = semanticAncestors(element, current.screenId);
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
            ...(ancestors[0] ? { semanticParent: ancestors[0] } : {}),
            semanticAncestors: ancestors,
            documentOrder: all.indexOf(element),
            scrollOwner: observedScrollOwner(element, current.screenId),
            positioning: observedPositioning(element),
            ...(context.componentId
              ? { componentId: context.componentId }
              : {}),
            ...(context.props ? { props: context.props } : {}),
            ...(context.tokenBindings
              ? { tokenBindings: context.tokenBindings }
              : {}),
            ...(context.tokenBindingEvidence
              ? { tokenBindingEvidence: context.tokenBindingEvidence }
              : {}),
            ...(context.tokenBindingConflicts
              ? { tokenBindingConflicts: context.tokenBindingConflicts }
              : {}),
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
      manifest.screens.find(
        (candidate) => candidate.screenId === checkpoint.screenId,
      )?.evidencePolicy === "strict",
    );
    await verifyCheckpointAssertions(options, checkpointContext, checkpoint);
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
