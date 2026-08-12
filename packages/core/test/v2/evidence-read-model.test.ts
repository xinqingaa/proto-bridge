import { describe, expect, it } from "vitest";
import {
  buildEvidenceReadModel,
  buildReconstructionAcceptanceContract,
  fixtures,
} from "../../src/v2/index.js";

describe("Evidence read model", () => {
  it("groups active Evidence by Screen and reports an undeclared completeness boundary", () => {
    const reference = fixtures.referenceCaseSlice;
    const model = buildEvidenceReadModel({
      snapshot: reference.SNAPSHOT,
      runs: [reference.RUN_1, reference.RUN_2],
      revisions: [
        reference.PRIMARY_ACTIVE_REVISION,
        reference.FRAGMENT_SCOPED_ACTIVE_REVISION,
      ],
      blobs: [],
    });

    expect(model.bundleId).toBe(reference.BUNDLE_ID);
    expect(model.screens[0]?.screenId).toBe("sample.task-list");
    expect(model.screens[0]?.cases.length).toBeGreaterThan(0);
    expect(model.screens[0]?.cases[0]?.regions[0]).toMatchObject({
      regionId: "sample.task-list.root",
      role: "page",
      firstSourceIndex: 0,
      sourceFactIds: ["sample.task-list.root.role"],
    });
    expect(model.screens[0]?.cases[0]?.facts[0]?.sourceIndex).toBe(0);
    expect(model.evidenceLevels).toEqual([
      { level: "instrumented-source-runtime", count: 1 },
      { level: "instrumented-runtime", count: 1 },
    ]);
    expect(model.semanticStatus).toBe("limited");
    expect(model.deliveryStatus).toBe("attention");
    expect(model.messages.join(" ")).toContain("完整语义覆盖");
  });

  it("does not turn binding literals into Target token obligations", () => {
    const reference = fixtures.referenceCaseSlice;
    const model = buildEvidenceReadModel({
      snapshot: reference.SNAPSHOT,
      runs: [reference.RUN_1, reference.RUN_2],
      revisions: [
        reference.PRIMARY_ACTIVE_REVISION,
        reference.FRAGMENT_SCOPED_ACTIVE_REVISION,
      ],
      blobs: [],
    });
    const region = model.screens[0]!.cases[0]!.regions[0]!;
    region.tokenBindings = {
      transparentSurface: "transparent",
      divider: "color.divider",
    };

    const acceptance = buildReconstructionAcceptanceContract({
      handoffId: "handoff_literal_test",
      workspaceId: reference.WORKSPACE_ID,
      evidence: model,
    });

    expect(
      acceptance.dimensions.tokens.map((item) => item.expected),
    ).toContainEqual({ slot: "divider", tokenId: "color.divider" });
    expect(JSON.stringify(acceptance.dimensions.tokens)).not.toContain(
      "transparent",
    );
  });
});
