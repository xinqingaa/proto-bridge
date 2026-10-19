import { describe, expect, it } from "vitest";
import {
  buildCanonicalRuntimeUrl,
  resolveRuntimeRoute,
} from "@/runtime/url";
import {
  DEVICE_PRESETS,
  FRAME_BEZEL,
  getDevicePreset,
  getFrameOuterSize,
} from "@/workbench/canvas/devices";

describe("buildCanonicalRuntimeUrl", () => {
  it("always writes variant and theme, and sorts business query keys", () => {
    const href = buildCanonicalRuntimeUrl({
      prototypeId: "cold-chain-ops",
      screenSlug: "exception-queue",
      variantId: "empty",
      themeId: "dark",
      query: { zed: "1", alpha: "2" },
    });
    expect(href).toBe(
      "/prototype/cold-chain-ops/exception-queue?variant=empty&theme=default&mode=dark&alpha=2&zed=1",
    );
  });
});

describe("resolveRuntimeRoute", () => {
  it("opens the Yike detail entry without a habit and preserves explicit objects", () => {
    for (const query of ["theme=mechanical&mode=light", "theme=mechanical&mode=light&habit=habit-reading"]) {
      const result = resolveRuntimeRoute({
        prototypeId: "yike",
        screenSlug: "habit-detail",
        searchParams: new URLSearchParams(query),
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.variant.id).toBe("default");
        expect(result.query).toEqual(query.includes("habit=") ? { habit: "habit-reading" } : {});
      }
    }
  });
  it("resolves known routes and fills defaults when variant/theme omitted", () => {
    const withExplicit = resolveRuntimeRoute({
      prototypeId: "cold-chain-ops",
      screenSlug: "exception-queue",
      searchParams: new URLSearchParams("variant=empty&theme=default&mode=dark"),
    });
    expect(withExplicit.ok).toBe(true);
    if (withExplicit.ok) {
      expect(withExplicit.variant.id).toBe("empty");
      expect(withExplicit.theme.id).toBe("dark");
      expect(withExplicit.canonicalPath).toBe("/prototype/cold-chain-ops/exception-queue");
      expect(withExplicit.canonicalSearch).toBe("variant=empty&theme=default&mode=dark");
    }

    const withDefaults = resolveRuntimeRoute({
      prototypeId: "cold-chain-ops",
      screenSlug: "exception-queue",
      searchParams: new URLSearchParams(""),
    });
    expect(withDefaults.ok).toBe(true);
    if (withDefaults.ok) {
      expect(withDefaults.variant.id).toBe("default");
      expect(withDefaults.theme.id).toBe("light");
      expect(withDefaults.canonicalSearch).toBe("variant=default&theme=default&mode=light");
    }
  });

  it("rejects unknown prototype, screen, variant, and theme", () => {
    expect(
      resolveRuntimeRoute({
        prototypeId: "missing",
        screenSlug: "exception-queue",
        searchParams: new URLSearchParams("theme=default&mode=light"),
      }),
    ).toMatchObject({ ok: false, code: "UNKNOWN_PROTOTYPE" });

    expect(
      resolveRuntimeRoute({
        prototypeId: "cold-chain-ops",
        screenSlug: "missing",
        searchParams: new URLSearchParams("theme=default&mode=light"),
      }),
    ).toMatchObject({ ok: false, code: "UNKNOWN_SCREEN" });

    expect(
      resolveRuntimeRoute({
        prototypeId: "cold-chain-ops",
        screenSlug: "exception-queue",
        searchParams: new URLSearchParams("variant=nope&theme=default&mode=light"),
      }),
    ).toMatchObject({ ok: false, code: "UNKNOWN_VARIANT" });

    expect(
      resolveRuntimeRoute({
        prototypeId: "cold-chain-ops",
        screenSlug: "exception-queue",
        searchParams: new URLSearchParams("variant=default&theme=nope"),
      }),
    ).toMatchObject({ ok: false, code: "UNKNOWN_THEME" });
  });

  it("rejects duplicate query keys and undeclared business query", () => {
    const duplicate = new URLSearchParams();
    duplicate.append("variant", "default");
    duplicate.append("theme", "light");
    duplicate.append("foo", "1");
    duplicate.append("foo", "2");
    expect(
      resolveRuntimeRoute({
        prototypeId: "cold-chain-ops",
        screenSlug: "exception-queue",
        searchParams: duplicate,
      }),
    ).toMatchObject({ ok: false, code: "INVALID_QUERY" });

    expect(
      resolveRuntimeRoute({
        prototypeId: "cold-chain-ops",
        screenSlug: "exception-queue",
        searchParams: new URLSearchParams(
          "variant=default&theme=default&mode=light&extra=1",
        ),
      }),
    ).toMatchObject({ ok: false, code: "INVALID_QUERY" });
  });

  it("accepts an authored optional query key", () => {
    const result = resolveRuntimeRoute({
      prototypeId: "cold-chain-ops",
      screenSlug: "shipment-detail",
      searchParams: new URLSearchParams(
        "variant=default&theme=default&mode=light&shipment=SH-2048",
      ),
    });

    expect(result).toMatchObject({
      ok: true,
      query: { shipment: "SH-2048" },
    });
  });
});

describe("device viewport presets", () => {
  it("keeps the phone shell layout equal to the viewport", () => {
    expect(DEVICE_PRESETS).toHaveLength(4);
    const iphone = getDevicePreset("iphone-14");
    expect(iphone.width).toBe(390);
    expect(iphone.height).toBe(844);
    const outer = getFrameOuterSize(iphone);
    expect(outer.width).toBe(390);
    expect(outer.height).toBe(844);
    expect(FRAME_BEZEL).toBe(0);
  });
});
