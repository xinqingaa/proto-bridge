// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runtimeSourceDigest } from "../build/runtime-source";

describe("Runtime source fingerprint", () => {
  it("invalidates probes for code changes, additions and removals without hashing product docs", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "pb-runtime-source-"));
    try {
      const source = path.join(root, "View.vue");
      writeFileSync(source, "before");
      const before = runtimeSourceDigest([root], []);
      writeFileSync(source, "after");
      expect(runtimeSourceDigest([root], [])).not.toBe(before);
      writeFileSync(source, "before");
      expect(runtimeSourceDigest([root], [])).toBe(before);
      writeFileSync(path.join(root, "new.ts"), "added");
      expect(runtimeSourceDigest([root], [])).not.toBe(before);
      rmSync(path.join(root, "new.ts"));
      mkdirSync(path.join(root, "docs"));
      writeFileSync(path.join(root, "docs", "product.md"), "product prose");
      expect(runtimeSourceDigest([root], [])).toBe(before);
      const dependency = path.join(root, "lock.yaml");
      writeFileSync(dependency, "version-a");
      const pinned = runtimeSourceDigest([], [dependency]);
      writeFileSync(dependency, "version-b");
      expect(runtimeSourceDigest([], [dependency])).not.toBe(pinned);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
