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
      prototypeId: "project",
      screenSlug: "task-list",
      variantId: "empty",
      themeId: "dark",
      query: { zed: "1", alpha: "2" },
    });
    expect(href).toBe(
      "/prototype/project/task-list?variant=empty&theme=dark&alpha=2&zed=1",
    );
  });
});

describe("resolveRuntimeRoute", () => {
  it("resolves known routes and fills defaults when variant/theme omitted", () => {
    const withExplicit = resolveRuntimeRoute({
      prototypeId: "project",
      screenSlug: "task-list",
      searchParams: new URLSearchParams("variant=empty&theme=dark"),
    });
    expect(withExplicit.ok).toBe(true);
    if (withExplicit.ok) {
      expect(withExplicit.variant.id).toBe("empty");
      expect(withExplicit.theme.id).toBe("dark");
      expect(withExplicit.canonicalPath).toBe("/prototype/project/task-list");
      expect(withExplicit.canonicalSearch).toBe("variant=empty&theme=dark");
    }

    const withDefaults = resolveRuntimeRoute({
      prototypeId: "project",
      screenSlug: "task-list",
      searchParams: new URLSearchParams(""),
    });
    expect(withDefaults.ok).toBe(true);
    if (withDefaults.ok) {
      expect(withDefaults.variant.id).toBe("default");
      expect(withDefaults.theme.id).toBe("light");
      expect(withDefaults.canonicalSearch).toBe("variant=default&theme=light");
    }
  });

  it("rejects unknown prototype, screen, variant, and theme", () => {
    expect(
      resolveRuntimeRoute({
        prototypeId: "missing",
        screenSlug: "task-list",
        searchParams: new URLSearchParams("theme=light"),
      }),
    ).toMatchObject({ ok: false, code: "UNKNOWN_PROTOTYPE" });

    expect(
      resolveRuntimeRoute({
        prototypeId: "project",
        screenSlug: "missing",
        searchParams: new URLSearchParams("theme=light"),
      }),
    ).toMatchObject({ ok: false, code: "UNKNOWN_SCREEN" });

    expect(
      resolveRuntimeRoute({
        prototypeId: "project",
        screenSlug: "task-list",
        searchParams: new URLSearchParams("variant=nope&theme=light"),
      }),
    ).toMatchObject({ ok: false, code: "UNKNOWN_VARIANT" });

    expect(
      resolveRuntimeRoute({
        prototypeId: "project",
        screenSlug: "task-list",
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
        prototypeId: "project",
        screenSlug: "task-list",
        searchParams: duplicate,
      }),
    ).toMatchObject({ ok: false, code: "INVALID_QUERY" });

    expect(
      resolveRuntimeRoute({
        prototypeId: "project",
        screenSlug: "task-list",
        searchParams: new URLSearchParams(
          "variant=default&theme=light&extra=1",
        ),
      }),
    ).toMatchObject({ ok: false, code: "INVALID_QUERY" });
  });
});

describe("device viewport presets", () => {
  it("keeps outer frame aspect equal to viewport plus bezel only", () => {
    expect(DEVICE_PRESETS).toHaveLength(4);
    const iphone = getDevicePreset("iphone-14");
    expect(iphone.width).toBe(390);
    expect(iphone.height).toBe(844);
    const outer = getFrameOuterSize(iphone);
    expect(outer.width).toBe(390 + FRAME_BEZEL * 2);
    expect(outer.height).toBe(844 + FRAME_BEZEL * 2);
  });
});
