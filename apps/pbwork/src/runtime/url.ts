import {
  loadPrototypes,
  loadPrototypeScreens,
  loadPrototypeThemePack,
} from "@/design-system/loaders";
import type {
  PrototypeRecord,
  PrototypeVariant,
  ScreenRecord,
  ThemeRecord,
} from "@/design-system/types";

export type RuntimeResolveError =
  | "UNKNOWN_PROTOTYPE"
  | "UNKNOWN_SCREEN"
  | "UNKNOWN_VARIANT"
  | "UNKNOWN_THEME"
  | "UNKNOWN_MODE"
  | "INVALID_QUERY";

export type RuntimeResolveResult =
  | {
      ok: true;
      prototype: PrototypeRecord;
      screen: ScreenRecord;
      variant: PrototypeVariant;
      theme: ThemeRecord;
      themeName: string;
      query: Record<string, string>;
      canonicalPath: string;
      canonicalSearch: string;
    }
  | { ok: false; code: RuntimeResolveError; message: string };

const RESERVED = new Set(["variant", "theme", "mode"]);

export function buildCanonicalRuntimeUrl(input: {
  prototypeId: string;
  screenSlug: string;
  variantId: string;
  themeId: string;
  themeName?: string;
  query?: Record<string, string>;
}): string {
  const params = new URLSearchParams();
  params.set("variant", input.variantId);
  params.set(
    "theme",
    input.themeName ?? loadPrototypeThemePack(input.prototypeId).defaultTheme,
  );
  params.set("mode", input.themeId);
  for (const key of Object.keys(input.query ?? {}).sort()) {
    if (RESERVED.has(key)) throw new Error(`RESERVED_RUNTIME_QUERY:${key}`);
    params.set(key, input.query![key]!);
  }
  return `/prototype/${input.prototypeId}/${input.screenSlug}?${params.toString()}`;
}

export function resolveRuntimeRoute(input: {
  prototypeId: string;
  screenSlug: string;
  searchParams: URLSearchParams;
}): RuntimeResolveResult {
  const prototype = loadPrototypes().find(
    (item) => item.id === input.prototypeId,
  );
  if (!prototype) {
    return {
      ok: false,
      code: "UNKNOWN_PROTOTYPE",
      message: `UNKNOWN_PROTOTYPE：${input.prototypeId}`,
    };
  }

  const screen = loadPrototypeScreens().find(
    (item) =>
      item.prototypeId === input.prototypeId &&
      item.screenSlug === input.screenSlug,
  );
  if (!screen) {
    return {
      ok: false,
      code: "UNKNOWN_SCREEN",
      message: `UNKNOWN_SCREEN：${input.prototypeId}/${input.screenSlug}`,
    };
  }

  const rawEntries = [...input.searchParams.entries()];
  const seen = new Set<string>();
  for (const [key] of rawEntries) {
    if (!key || seen.has(key)) {
      return {
        ok: false,
        code: "INVALID_QUERY",
        message: "INVALID_QUERY：duplicate or empty query key",
      };
    }
    seen.add(key);
  }

  const variantId =
    input.searchParams.get("variant") ?? screen.defaultVariantId;
  const pack = loadPrototypeThemePack(prototype.id);
  const themeId = input.searchParams.get("mode") ?? pack.defaultMode;
  const themeName = input.searchParams.get("theme") ?? pack.defaultTheme;
  if (!pack.themes.some((theme) => theme.id === themeName)) {
    return {
      ok: false,
      code: "UNKNOWN_THEME",
      message: `UNKNOWN_THEME：${themeName}`,
    };
  }

  const variant = screen.variants.find((item) => item.id === variantId);
  if (!variant) {
    return {
      ok: false,
      code: "UNKNOWN_VARIANT",
      message: `UNKNOWN_VARIANT：${variantId}`,
    };
  }

  if (!["light", "dark"].includes(themeId) || !pack.modes.includes(themeId)) {
    return {
      ok: false,
      code: "UNKNOWN_MODE",
      message: `UNKNOWN_MODE：${themeId}`,
    };
  }

  const theme: ThemeRecord = {
    schemaVersion: 1,
    id: themeId,
    label: themeId === "dark" ? "深色模式" : "浅色模式",
    dark: themeId === "dark",
    overrides: {},
  };

  const declared = variant.query ?? {};
  const optionalQueryKeys = new Set(screen.queryKeys ?? []);
  const business: Record<string, string> = {};
  for (const [key, value] of rawEntries) {
    if (RESERVED.has(key)) continue;
    if (!(key in declared) && !optionalQueryKeys.has(key)) {
      return {
        ok: false,
        code: "INVALID_QUERY",
        message: `INVALID_QUERY：undeclared ${key}`,
      };
    }
    if (Array.isArray(value) || value.length > 512) {
      return {
        ok: false,
        code: "INVALID_QUERY",
        message: `INVALID_QUERY：invalid value for ${key}`,
      };
    }
    business[key] = value;
  }
  for (const key of Object.keys(declared)) {
    if (!(key in business)) {
      return {
        ok: false,
        code: "INVALID_QUERY",
        message: `INVALID_QUERY：missing declared ${key}`,
      };
    }
  }

  const canonicalPath = screen.path;
  const canonicalSearch = buildCanonicalRuntimeUrl({
    prototypeId: prototype.id,
    screenSlug: screen.screenSlug,
    variantId: variant.id,
    themeId: theme.id,
    themeName,
    query: business,
  }).split("?")[1]!;

  return {
    ok: true,
    prototype,
    screen,
    variant,
    theme,
    themeName,
    query: business,
    canonicalPath,
    canonicalSearch,
  };
}
