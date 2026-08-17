import { describe, expect, it } from "vitest";
import {
  isForcedRuntimeNavigation,
  runForcedRuntimeNavigation,
} from "@/runtime/forced-navigation";

describe("forced runtime navigation", () => {
  it("is off outside an authoring jump and on while one is in flight", async () => {
    expect(isForcedRuntimeNavigation()).toBe(false);
    let seenInside = false;
    await runForcedRuntimeNavigation(async () => {
      expect(isForcedRuntimeNavigation()).toBe(true);
      seenInside = true;
    });
    expect(seenInside).toBe(true);
    expect(isForcedRuntimeNavigation()).toBe(false);
  });

  it("clears after a failed authoring jump", async () => {
    await expect(
      runForcedRuntimeNavigation(async () => {
        throw new Error("navigate failed");
      }),
    ).rejects.toThrow("navigate failed");
    expect(isForcedRuntimeNavigation()).toBe(false);
  });
});
