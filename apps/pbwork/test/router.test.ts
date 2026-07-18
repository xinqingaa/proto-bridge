import { describe, expect, it } from "vitest";
import { router } from "@/app/router";

describe("PBWork routes", () => {
  it("resolves explicit workbench resources and pure runtime routes", () => {
    const tokens = router.resolve("/workbench/foundations/tokens/colors");
    const themes = router.resolve("/workbench/foundations/themes/light");
    const components = router.resolve("/workbench/components/basic");
    const prototypes = router.resolve("/workbench/prototypes/all");

    expect(tokens.name).toBe("foundation-tokens");
    expect(tokens.meta).toMatchObject({
      sectionId: "foundations",
      resourceId: "tokens",
    });
    expect(themes.name).toBe("foundation-themes");
    expect(components.name).toBe("components-basic");
    expect(prototypes.name).toBe("prototypes-all");
    expect(
      router.resolve("/prototype/project/task-list?variant=default&theme=light")
        .name,
    ).toBe("prototype-runtime");
  });
});
