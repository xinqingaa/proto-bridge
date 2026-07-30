import { describe, expect, it } from "vitest";
import { buildEvidenceReadModel, fixtures } from "../../src/v2/index.js";

describe("Evidence read model", () => {
  it("groups active Evidence by Screen and reports an undeclared completeness boundary", () => {
    const reference = fixtures.ledgerPlanetTaskList;
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
    expect(model.screens[0]?.screenId).toBe("ledger-planet.task-list");
    expect(model.screens[0]?.cases.length).toBeGreaterThan(0);
    expect(model.screens[0]?.cases[0]?.regions[0]).toMatchObject({
      regionId: "ledger-planet.task-list.root",
      role: "page",
      firstSourceIndex: 0,
      sourceFactIds: ["ledger-planet.task-list.root.role"],
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
});
