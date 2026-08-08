export type TokenCategory =
  | "color"
  | "typography"
  | "spacing"
  | "sizing"
  | "radius"
  | "border"
  | "elevation"
  | "opacity"
  | "motion";

export type TokenValue = string | number;

export type TokenRecord = {
  schemaVersion: 1;
  id: string;
  label: string;
  category: TokenCategory;
  defaultValue: TokenValue;
  description?: string;
};

export type ThemeRecord = {
  schemaVersion: 1;
  id: string;
  label: string;
  dark: boolean;
  overrides: Record<string, TokenValue>;
};

export type VuetifyThemeBindings = Record<
  | "background"
  | "surface"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning"
  | "on-background"
  | "on-surface"
  | "surface-variant"
  | "on-surface-variant"
  | "on-primary"
  | "action"
  | "on-action"
  | "on-secondary"
  | "on-error"
  | "on-success"
  | "on-warning"
  | "on-info"
  | "tooltip"
  | "on-tooltip",
  string
>;

export type PlaygroundControl = {
  key: string;
  label: string;
  control: "text" | "number" | "boolean" | "select" | "color";
  options?: Array<{ label: string; value: string | number | boolean }>;
};

export type ComponentRecord = {
  id: string;
  label: string;
  /** Business-facing playground intro; shown in the page header. */
  description: string;
  category: "basic" | "complex";
  view: string;
  contract: string;
  example: Record<string, unknown>;
  controls: PlaygroundControl[];
};

export type ComponentStateKind = "variant" | "interaction" | "content";

export type ComponentStateContract = {
  id: string;
  label: string;
  description?: string;
  /** variant=appearance; interaction=loading/disabled; content=empty/closed. */
  kind?: ComponentStateKind;
  props?: Record<string, unknown>;
};

export type PlaygroundPresentation = "single" | "tile" | "trigger";

export type ComponentContract = {
  schemaVersion: 1;
  id: string;
  category: "basic" | "complex";
  semantic:
    | { policy: "fixed"; defaultRole: Exclude<SemanticRole, "unknown"> }
    | {
        policy: "contextual";
        defaultRole: Exclude<SemanticRole, "unknown">;
        allowedRoles: Array<Exclude<SemanticRole, "unknown">>;
      }
    | { policy: "decorative" };
  /** One-line cross-stack behavior; Target may read this, not propsSchema. */
  summary?: string;
  /** Short interaction / empty / disabled commitments. */
  behavior?: string[];
  propsSchema: Record<string, unknown>;
  defaultProps: Record<string, unknown>;
  states: ComponentStateContract[];
  slots: string[];
  events: string[];
  tokenBindings: Record<string, string>;
  playground?: {
    presentation: PlaygroundPresentation;
  };
  icons?: {
    pack: "lucide";
    defaults?: string[];
  };
};

export type PrototypeLifecycle = "active" | "review" | "final" | "archived";

export type PrototypeScreenGroup = {
  id: string;
  label: string;
  screenSlugs: string[];
};

export type PrototypeRecord = {
  id: string;
  label: string;
  lifecycle: PrototypeLifecycle;
  owners?: string[];
  roles?: string[];
  defaultThemeId: string;
  /** Optional Tab / module groupings for the overview flow rail. */
  screenGroups?: PrototypeScreenGroup[];
};

export type PrototypeVariant = {
  id: string;
  label: string;
  description?: string;
  query?: Record<string, string>;
  fixture?: string;
  /**
   * Optional authored completeness contract for instrumented Runtime capture.
   * Absence is allowed, but V2 Evidence must then report semantic coverage as
   * undeclared instead of presenting the observed markers as a complete set.
   */
  requiredFragments?: PrototypeFragmentRef[];
  shellPolicy?: "inherit" | "replace";
  structureAssertions?: PrototypeStructureAssertion[];
};

export type PrototypeFragmentRef = {
  screenId: string;
  pbId: string;
  pbKey?: string;
};

export type PrototypeScrollOwner =
  | { kind: "viewport" }
  | { kind: "fragment"; fragment: PrototypeFragmentRef };

export type PrototypeStructureAssertion =
  | {
      kind: "parent";
      child: PrototypeFragmentRef;
      parent: PrototypeFragmentRef;
    }
  | {
      kind: "scroll-owner";
      fragment: PrototypeFragmentRef;
      owner: PrototypeScrollOwner;
    }
  | {
      kind: "order";
      parent: PrototypeFragmentRef;
      children: PrototypeFragmentRef[];
    }
  | {
      kind: "positioning";
      fragment: PrototypeFragmentRef;
      value: "flow" | "sticky" | "fixed" | "overlay";
    }
  | {
      kind: "visibility";
      fragment: PrototypeFragmentRef;
      visible: boolean;
    };

export type PrototypeAction = {
  id: string;
  kind: "click";
  target: PrototypeFragmentRef;
};

export type PrototypeCheckpoint = {
  id: string;
  screenId: string;
  variantId: string;
  requiredFragments: PrototypeFragmentRef[];
  expectedStates?: Array<{
    fragment: PrototypeFragmentRef;
    key: string;
    value: string | number | boolean | null;
  }>;
  expectedFragmentKeys?: Array<{
    fragment: Omit<PrototypeFragmentRef, "pbKey">;
    keys: string[];
  }>;
  forbiddenFragments?: PrototypeFragmentRef[];
  structureAssertions?: PrototypeStructureAssertion[];
};

export type PrototypeScenario = {
  id: string;
  label: string;
  initialVariantId: string;
  actionIds: string[];
  checkpoints: PrototypeCheckpoint[];
};

export type ScreenRecord = {
  prototypeId: string;
  screenId: string;
  screenSlug: string;
  label: string;
  title?: string;
  path: string;
  view: string;
  fixtureSchema?: string;
  /** Optional Runtime business query inputs accepted independently of a Variant. */
  queryKeys?: string[];
  defaultVariantId: string;
  variants: PrototypeVariant[];
  actions?: PrototypeAction[];
  scenarios?: PrototypeScenario[];
  /** Scenarios required before this Screen has complete interaction Evidence. */
  requiredScenarioIds?: string[];
  /** Stable page chrome inherited by Variants unless they explicitly replace it. */
  shellFragments?: PrototypeFragmentRef[];
  structureAssertions?: PrototypeStructureAssertion[];
};

export type FixturePayload = { schemaVersion: 1 } & Record<string, unknown>;

export type ScreenRuntimeContext = {
  prototype: PrototypeRecord;
  screen: ScreenRecord;
  variant: PrototypeVariant;
  theme: ThemeRecord;
  query: Record<string, string>;
  fixture?: FixturePayload;
};

export type ScreenRuntimeAdapter = {
  applyVariant: (context: ScreenRuntimeContext) => void | Promise<void>;
  serializeVariant?: () =>
    Record<string, unknown> | Promise<Record<string, unknown>>;
};

export type RegistryValidationError = {
  resourceType:
    | "token"
    | "theme"
    | "component"
    | "prototype"
    | "screen"
    | "variant"
    | "fixture";
  resourceId?: string;
  instancePath: string;
  keyword: string;
  message: string;
};

export const RESOURCE_ID_PATTERN = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
export const SLUG_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export const QUERY_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;

export const TOKEN_CATEGORIES: TokenCategory[] = [
  "color",
  "typography",
  "spacing",
  "sizing",
  "radius",
  "border",
  "elevation",
  "opacity",
  "motion",
];

export const LIFECYCLE_LABELS: Record<PrototypeLifecycle, string> = {
  active: "进行中",
  review: "待确认",
  final: "已定稿",
  archived: "已归档",
};
import type { SemanticRole } from "@proto-bridge/core/v2";
