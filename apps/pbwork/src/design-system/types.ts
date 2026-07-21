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
  | "on-primary"
  | "on-secondary"
  | "on-error"
  | "on-success"
  | "on-warning"
  | "on-info",
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

export type ComponentStateContract = {
  id: string;
  label: string;
  description?: string;
  props?: Record<string, unknown>;
};

export type ComponentContract = {
  schemaVersion: 1;
  id: string;
  category: "basic" | "complex";
  propsSchema: Record<string, unknown>;
  defaultProps: Record<string, unknown>;
  states: ComponentStateContract[];
  slots: string[];
  events: string[];
  tokenBindings: Record<string, string>;
};

export type PrototypeLifecycle = "active" | "review" | "final" | "archived";

export type PrototypeRecord = {
  id: string;
  label: string;
  lifecycle: PrototypeLifecycle;
  owners?: string[];
  roles?: string[];
  defaultThemeId: string;
};

export type PrototypeVariant = {
  id: string;
  label: string;
  description?: string;
  query?: Record<string, string>;
  fixture?: string;
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
  defaultVariantId: string;
  variants: PrototypeVariant[];
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
    | Record<string, unknown>
    | Promise<Record<string, unknown>>;
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
