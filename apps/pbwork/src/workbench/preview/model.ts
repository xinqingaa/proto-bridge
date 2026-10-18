import type {
  ResolvedThemeTable,
  ThemePackSource,
} from "@proto-bridge/core/v2";

export type PreviewSelection = {
  contextId: string;
  theme: string;
  mode: string;
};
export type PreviewContext = {
  id: string;
  label: string;
  packId: string;
  kind: "foundation" | "prototype" | "sample";
};
export type PreviewDemo = {
  extensionId?: string;
  session?: Record<string, unknown>;
  busy: boolean;
  completed: boolean;
  open: boolean;
  scenarioId: string;
  detent: "content" | "medium" | "expanded";
};
export type PreviewDeviceSession = {
  id: string;
  selection: PreviewSelection;
  demo: PreviewDemo;
};

/** Registry bindings are authoritative; missing packs remain diagnosable. */
export function previewContexts(
  packs: ReadonlyMap<string, ThemePackSource>,
  prototypes: ReadonlyArray<{ id: string; label: string; themePackId: string }>,
): PreviewContext[] {
  return [
    ...[...packs.values()]
      .filter((p) => p.manifest.scope === "base")
      .map((p) => ({
        id: `foundation:${p.manifest.id}`,
        label: p.manifest.label,
        packId: p.manifest.id,
        kind: "foundation" as const,
      })),
    ...prototypes.map((p) => ({
      id: `prototype:${p.id}`,
      label: p.label,
      packId: p.themePackId,
      kind: "prototype" as const,
    })),
    ...[...packs.values()]
      .filter((p) => p.manifest.scope === "playground")
      .map((p) => ({
        id: `sample:${p.manifest.id}`,
        label: `${p.manifest.label} · 仅演示`,
        packId: p.manifest.id,
        kind: "sample" as const,
      })),
  ];
}

export function defaultPreviewSelection(
  context: PreviewContext,
  packs: ReadonlyMap<string, ThemePackSource>,
): PreviewSelection {
  const manifest = packs.get(context.packId)?.manifest;
  return {
    contextId: context.id,
    theme: manifest?.defaultTheme ?? "",
    mode: manifest?.defaultMode ?? "",
  };
}

export function previewSelectionError(
  selection: PreviewSelection,
  contexts: readonly PreviewContext[],
  packs: ReadonlyMap<string, ThemePackSource>,
): string | undefined {
  const context = contexts.find((c) => c.id === selection.contextId);
  if (!context) return "主题包选项不存在";
  const manifest = packs.get(context.packId)?.manifest;
  if (!manifest) return `主题包不存在：${context.packId}`;
  if (!manifest.themes.some((t) => t.id === selection.theme))
    return `主题不存在：${selection.theme}`;
  if (!manifest.modes.includes(selection.mode))
    return `模式不存在：${selection.mode}`;
}

export function previewAlternatives(
  contexts: readonly PreviewContext[],
  packs: ReadonlyMap<string, ThemePackSource>,
): PreviewSelection[] {
  return contexts.flatMap((context) => {
    const manifest = packs.get(context.packId)?.manifest;
    return (
      manifest?.themes.flatMap((theme) =>
        manifest.modes.map((mode) => ({
          contextId: context.id,
          theme: theme.id,
          mode,
        })),
      ) ?? []
    );
  });
}

export function createPreviewDevice(
  id: string,
  selection: PreviewSelection,
  copy?: PreviewDemo,
): PreviewDeviceSession {
  return {
    id,
    selection: { ...selection },
    demo: copy
      ? JSON.parse(JSON.stringify(copy))
      : {
          busy: false,
          completed: false,
          open: false,
          scenarioId: "",
          detent: "content",
        },
  };
}

/** CSS reference-frame adaptation only. Never mutate the resolved table. */
export function deviceViewportCss(
  css: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(css).map(([key, value]) => [
      key,
      value
        .replace(/(\d+(?:\.\d+)?)(?:dvh|svh|lvh|vh)\b/g, "$1cqh")
        .replace(/(\d+(?:\.\d+)?)(?:dvw|svw|lvw|vw)\b/g, "$1cqw"),
    ]),
  );
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${stableValue(val)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

export function comparePreviewTables(
  current: ResolvedThemeTable,
  reference: ResolvedThemeTable,
) {
  return Object.keys(current.values).map((key) => ({
    key,
    value: current.values[key],
    reference: reference.values[key],
    changed:
      stableValue(current.values[key]) !== stableValue(reference.values[key]),
    source: current.provenance[key],
  }));
}

export function resolvePreviewDevice(
  device: PreviewDeviceSession,
  contexts: readonly PreviewContext[],
  packs: ReadonlyMap<string, ThemePackSource>,
  resolve: (packId: string, theme: string, mode: string) => ResolvedThemeTable,
) {
  const context = contexts.find((c) => c.id === device.selection.contextId);
  const error = previewSelectionError(device.selection, contexts, packs);
  if (error) return { device, context, error, table: undefined };
  try {
    return {
      device,
      context,
      error: undefined,
      table: resolve(
        context!.packId,
        device.selection.theme,
        device.selection.mode,
      ),
    };
  } catch (error) {
    return {
      device,
      context,
      table: undefined,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Only display scale changes; the logical device and Core tables are fixed. */
export function fitPreviewScale(
  width: number,
  height: number,
  count: number,
  deviceWidth: number,
  deviceHeight: number,
) {
  if (
    ![width, height, count, deviceWidth, deviceHeight].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    count < 1 ||
    !Number.isInteger(count) ||
    deviceWidth <= 0 ||
    deviceHeight <= 0
  )
    return 0.72;
  const perDevice = (width - 16 * (count - 1)) / count;
  return Math.max(
    0.1,
    Math.min(1, (perDevice - 24) / deviceWidth, (height - 24) / deviceHeight),
  );
}

/** Source columns enumerate actual themes independently of device sessions. */
export function sourceThemeColumns(
  contexts: readonly PreviewContext[],
  packs: ReadonlyMap<string, ThemePackSource>,
) {
  const seen = new Set<string>();
  return contexts.flatMap((context) => {
    const manifest = packs.get(context.packId)?.manifest;
    const owners = contexts.filter((c) => c.packId === context.packId);
    return (manifest?.themes ?? [{ id: "", label: "不可读取" }]).flatMap(
      (theme) => {
        const id = `${context.packId}/${theme.id}`;
        if (seen.has(id)) return [];
        seen.add(id);
        return [
          {
            id,
            packId: context.packId,
            label: `${manifest?.label ?? context.packId} · ${theme.label}`,
            packLabel: manifest?.label ?? context.packId,
            themeLabel: theme.label,
            sample: manifest?.scope === "playground",
            owners: owners
              .filter((c) => c.kind === "prototype")
              .map((c) => c.label),
            contextIds: owners.map((c) => c.id),
            selection: {
              contextId: context.id,
              theme: theme.id,
              mode: manifest?.defaultMode ?? "",
            },
          },
        ];
      },
    );
  });
}

/** Pack identity drives appearance; prototype aliases are retained only for ownership and migration. */
export function themePackContexts(
  contexts: readonly PreviewContext[],
  packs: ReadonlyMap<string, ThemePackSource>,
): PreviewContext[] {
  const seen = new Set<string>();
  return contexts.flatMap((context) => {
    if (seen.has(context.packId)) return [];
    seen.add(context.packId);
    const manifest = packs.get(context.packId)?.manifest;
    return [
      {
        ...context,
        id: `pack:${context.packId}`,
        kind:
          manifest?.scope === "base"
            ? "foundation"
            : manifest?.scope === "playground"
              ? "sample"
              : context.kind,
        label: manifest
          ? `${manifest.label}${manifest.scope === "playground" ? " · 仅演示" : ""}`
          : context.packId,
      },
    ];
  });
}

export function normalizePreviewSelection(
  selection: PreviewSelection,
  aliases: readonly PreviewContext[],
  packs: ReadonlyMap<string, ThemePackSource>,
): PreviewSelection {
  const context = [...aliases, ...themePackContexts(aliases, packs)].find(
    (context) => context.id === selection.contextId,
  );
  return {
    ...selection,
    ...(context ? { contextId: `pack:${context.packId}` } : {}),
  };
}
