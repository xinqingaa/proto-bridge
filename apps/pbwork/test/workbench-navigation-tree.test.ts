import { describe, expect, it } from "vitest";
import { buildWorkbenchNavigationTree } from "@/workbench/navigation";

describe("workbench navigation tree", () => {
  it("builds nested resource counts", () => {
    const tree = buildWorkbenchNavigationTree();
    const prototypes = tree.find((node) => node.id === "prototypes")!;
    const components = tree.find((node) => node.id === "components")!;
    const lifecycle = prototypes.children?.find(
      (node) => node.id === "prototype-lifecycles",
    );
    const assets = prototypes.children?.find(
      (node) => node.id === "prototype-assets",
    );
    const fieldService = assets?.children?.find(
      (node) => node.id === "prototype-field-service",
    );
    const workOrders = fieldService?.children?.find(
      (node) => node.id === "screen-field-service.work-orders",
    );

    expect(prototypes.count).toBe(3);
    expect(components.children).toHaveLength(2);
    expect(
      lifecycle?.children?.find((node) => node.id === "lifecycle-active")
        ?.count,
    ).toBe(3);
    expect(fieldService?.count).toBe(7);
    expect(workOrders?.count).toBe(7);
  });

  it("uses effective lifecycle overrides in badges", () => {
    const tree = buildWorkbenchNavigationTree((id, registered) =>
      id === "project" ? "review" : registered,
    );
    const lifecycles = tree
      .find((node) => node.id === "prototypes")
      ?.children?.find((node) => node.id === "prototype-lifecycles")?.children;

    expect(
      lifecycles?.find((node) => node.id === "lifecycle-active")?.count,
    ).toBe(2);
    expect(
      lifecycles?.find((node) => node.id === "lifecycle-review")?.count,
    ).toBe(1);
  });
});
