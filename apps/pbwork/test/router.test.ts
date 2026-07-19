import { describe, expect, it } from "vitest";
import { router } from "@/app/router";

describe("PBWork routes", () => {
  it("resolves foundations, components, prototypes and runtime", () => {
    expect(router.resolve("/workbench/foundations/tokens/color").name).toBe(
      "foundation-tokens",
    );
    expect(router.resolve("/workbench/foundations/themes/dark").name).toBe(
      "foundation-themes",
    );
    expect(router.resolve("/workbench/components/button").name).toBe(
      "component-playground",
    );
    expect(router.resolve("/workbench/prototypes/active").name).toBe(
      "prototypes-lifecycle",
    );
    expect(router.resolve("/workbench/prototypes/project").name).toBe(
      "prototype-overview",
    );
    expect(
      router.resolve("/workbench/prototypes/project/screens/task-list").name,
    ).toBe("prototype-screen");
    expect(
      router.resolve("/prototype/project/task-list?variant=default&theme=light")
        .name,
    ).toBe("prototype-runtime");
  });
});
