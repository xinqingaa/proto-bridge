import { describe, expect, it } from "vitest";
import {
  artifactBundleIdsFromRecords,
  hasDanglingArtifactRefs,
  knownBundleIdsFromEvidence,
  shouldResetLocalWorkspaceState,
} from "@/app/stores/workspace-generation";

describe("workspace generation cache binding", () => {
  it("does not reset when the current generation is unavailable", () => {
    expect(
      shouldResetLocalWorkspaceState(
        { workspaceId: "ws", generationId: "generation-a" },
        { workspaceId: "ws", generationId: "legacy-unavailable" },
        true,
      ),
    ).toBe(false);
  });

  it("resets when the bound generation or workspace changes", () => {
    expect(
      shouldResetLocalWorkspaceState(
        { workspaceId: "ws", generationId: "generation-a" },
        { workspaceId: "ws", generationId: "generation-b" },
        false,
      ),
    ).toBe(true);
    expect(
      shouldResetLocalWorkspaceState(
        { workspaceId: "ws-a", generationId: "generation-a" },
        { workspaceId: "ws-b", generationId: "generation-a" },
        false,
      ),
    ).toBe(true);
  });

  it("keeps local records on first bind when artifacts still exist", () => {
    expect(
      shouldResetLocalWorkspaceState(
        { workspaceId: null, generationId: null },
        { workspaceId: "ws", generationId: "generation-a" },
        false,
      ),
    ).toBe(false);
  });

  it("resets unbound local records when artifact refs are already gone", () => {
    expect(
      shouldResetLocalWorkspaceState(
        { workspaceId: null, generationId: null },
        { workspaceId: "ws", generationId: "generation-a" },
        true,
      ),
    ).toBe(true);
  });

  it("collects bound and in-flight artifact bundle ids", () => {
    expect(
      artifactBundleIdsFromRecords({
        a: { artifacts: { bundleId: "bundle-final" }, operation: { kind: "idle" } },
        b: {
          artifacts: null,
          operation: { kind: "finalizing", bundleId: "bundle-job" },
        },
        c: {
          artifacts: null,
          operation: { kind: "rolling-back", bundleIds: ["bundle-old"] },
        },
      }),
    ).toEqual(["bundle-final", "bundle-job", "bundle-old"]);
  });

  it("treats missing inventory bundles as dangling refs", () => {
    expect(
      hasDanglingArtifactRefs(
        { a: { artifacts: { bundleId: "bundle-1" } } },
        new Set(["bundle-2"]),
      ),
    ).toBe(true);
    expect(
      hasDanglingArtifactRefs(
        { a: { artifacts: { bundleId: "bundle-1" } } },
        new Set(["bundle-1"]),
      ),
    ).toBe(false);
  });

  it("unions inventory items and console bundles", () => {
    const ids = knownBundleIdsFromEvidence(
      {
        workspaceId: "ws",
        generatedAt: "2026-08-24T00:00:00.000Z",
        prototypes: [
          {
            prototypeId: "demo",
            screens: [
              {
                screenId: "demo.home",
                items: [{ bundleId: "from-inventory" } as never],
              },
            ],
          },
        ],
      },
      {
        workspaceId: "ws",
        generationId: "generation-a",
        jobs: [],
        bundles: [{ bundle: { bundleId: "from-console" } as never, snapshots: [] }],
      },
    );
    expect([...ids].sort()).toEqual(["from-console", "from-inventory"]);
  });
});
