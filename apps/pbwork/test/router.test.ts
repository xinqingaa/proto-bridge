import { describe, expect, it } from "vitest";
import { router } from "@/app/router";

describe("PBWork routes", () => {
  it("resolves overview, foundations, components, prototypes and runtime", () => {
    expect(router.resolve("/workbench/overview").name).toBe(
      "workbench-overview",
    );
    expect(router.resolve("/workbench/capture").name).toBe("workbench-capture");
    expect(router.resolve("/workbench/foundations/tokens/color").name).toBe(
      "foundation-tokens",
    );
    expect(router.resolve("/workbench/foundations/themes/dark").name).toBe(
      "foundation-themes",
    );
    expect(router.resolve("/workbench/components/button").name).toBe(
      "component-playground",
    );
    expect(router.resolve("/workbench/drafts/hengdong").name).toBe(
      "draft-prototype",
    );
    expect(router.resolve("/workbench/prototypes/active").name).toBe(
      "prototypes-lifecycle",
    );
    expect(router.resolve("/workbench/prototypes/cold-chain-ops").name).toBe(
      "prototype-overview",
    );
    expect(
      router.resolve("/workbench/prototypes/cold-chain-ops/screens/exception-queue")
        .name,
    ).toBe("prototype-screen");
    expect(
      router.resolve(
        "/prototype/cold-chain-ops/exception-queue?variant=default&theme=light",
      ).name,
    ).toBe("prototype-runtime");
  });
});
