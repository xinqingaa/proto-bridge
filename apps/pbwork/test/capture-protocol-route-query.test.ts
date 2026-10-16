import { describe, expect, it, vi } from "vitest";

vi.mock("@/design-system/loaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/design-system/loaders")>();
  return {
    ...actual,
    loadPrototypeScreens: () =>
      actual.loadPrototypeScreens().map((screen) =>
        screen.screenId === "cold-chain-ops.shipment-detail"
          ? {
              ...screen,
              variants: screen.variants.map((variant) =>
                variant.id === "active-excursion"
                  ? { ...variant, query: { shipment: "SH-2048", focus: "temp" } }
                  : variant,
              ),
            }
          : screen,
      ),
  };
});

describe("Runtime Manifest route query", () => {
  it("publishes authored Variant route query in canonical key order", async () => {
    const { buildRuntimeCaptureManifest } = await import(
      "@/runtime/capture-protocol"
    );
    const manifest = buildRuntimeCaptureManifest("cold-chain-ops");
    const detail = manifest.screens.find(
      (screen) => screen.screenId === "cold-chain-ops.shipment-detail",
    );

    const authored = detail?.variants.find(
      (variant) => variant.variantId === "active-excursion",
    );
    expect(authored?.routeQuery).toEqual({ focus: "temp", shipment: "SH-2048" });
    expect(Object.keys(authored?.routeQuery ?? {})).toEqual([
      "focus",
      "shipment",
    ]);
    expect(
      detail?.variants.find((variant) => variant.variantId === "default")
        ?.routeQuery,
    ).toBeUndefined();
  });
});
