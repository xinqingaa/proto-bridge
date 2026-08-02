import { describe, expect, it } from "vitest";
import {
  buildWorkbenchNavigationTree,
  countPrototypesForLifecycle,
} from "@/workbench/navigation";

describe("workbench navigation tree", () => {
  it("builds nested resource counts without lifecycle rows", () => {
    const tree = buildWorkbenchNavigationTree();
    const prototypes = tree.find((node) => node.id === "prototypes")!;
    const components = tree.find((node) => node.id === "components")!;
    const capture = tree.find((node) => node.id === "capture")!;
    const fieldService = prototypes.children?.find(
      (node) => node.id === "prototype-field-service",
    );
    const workOrders = fieldService?.children?.find(
      (node) => node.id === "screen-field-service.work-orders",
    );

    expect(prototypes.count).toBe(3);
    expect(components.children).toHaveLength(2);
    expect(prototypes.children?.some((node) => node.kind === "lifecycle")).toBe(
      false,
    );
    expect(fieldService?.count).toBe(7);
    expect(workOrders?.count).toBe(7);
    expect(capture.children?.[0]).toMatchObject({
      id: "capture-console",
      to: "/workbench/capture",
    });
  });

  it("filters prototypes by lifecycle and counts overrides", () => {
    const effective = (
      id: string,
      registered: "active" | "review" | "final" | "archived",
    ) => (id === "ledger-planet" ? ("review" as const) : registered);

    expect(countPrototypesForLifecycle("active", effective)).toBe(2);
    expect(countPrototypesForLifecycle("review", effective)).toBe(1);

    const activeTree = buildWorkbenchNavigationTree(effective, "active");
    const reviewTree = buildWorkbenchNavigationTree(effective, "review");
    const activePrototypes = activeTree.find(
      (node) => node.id === "prototypes",
    );
    const reviewPrototypes = reviewTree.find(
      (node) => node.id === "prototypes",
    );

    expect(activePrototypes?.children?.map((node) => node.id)).toEqual([
      "prototype-cold-chain-ops",
      "prototype-field-service",
    ]);
    expect(reviewPrototypes?.children?.map((node) => node.id)).toEqual([
      "prototype-ledger-planet",
    ]);
  });
});
