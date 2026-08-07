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
    const coldChain = prototypes.children?.find(
      (node) => node.id === "prototype-cold-chain-ops",
    );
    const exceptionQueue = coldChain?.children?.find(
      (node) => node.id === "screen-cold-chain-ops.exception-queue",
    );

    expect(prototypes.count).toBe(1);
    expect(components.children).toHaveLength(2);
    expect(prototypes.children?.some((node) => node.kind === "lifecycle")).toBe(
      false,
    );
    expect(coldChain?.count).toBe(3);
    expect(exceptionQueue?.count).toBe(5);
    expect(capture.children?.[0]).toMatchObject({
      id: "capture-console",
      to: "/workbench/capture",
    });
  });

  it("filters prototypes by lifecycle and counts overrides", () => {
    const effective = (
      id: string,
      registered: "active" | "review" | "final" | "archived",
    ) => (id === "cold-chain-ops" ? ("review" as const) : registered);

    expect(countPrototypesForLifecycle("active", effective)).toBe(0);
    expect(countPrototypesForLifecycle("review", effective)).toBe(1);

    const activeTree = buildWorkbenchNavigationTree(effective, "active");
    const reviewTree = buildWorkbenchNavigationTree(effective, "review");
    const activePrototypes = activeTree.find(
      (node) => node.id === "prototypes",
    );
    const reviewPrototypes = reviewTree.find(
      (node) => node.id === "prototypes",
    );

    expect(activePrototypes?.children?.map((node) => node.id)).toEqual([]);
    expect(reviewPrototypes?.children?.map((node) => node.id)).toEqual([
      "prototype-cold-chain-ops",
    ]);
  });
});
