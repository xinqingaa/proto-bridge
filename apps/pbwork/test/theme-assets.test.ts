import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { collectThemeAssetHashes } from "../build/theme-assets";

it("hashes exact asset bytes in pack and prototype namespaces, including inherited same-name files", () => {
  const root = mkdtempSync(join(tmpdir(), "pb-theme-assets-"));
  try {
    const assets = {
      "src/design-system/theme-packs/base/assets/mark.svg":
        Buffer.from("<svg>标志</svg>"),
      "src/prototypes/demo/theme/assets/mark.svg": Buffer.from([
        0, 255, 13, 10,
      ]),
      "src/prototypes/demo/assets/ignored.svg": Buffer.from("business image"),
    };
    for (const [name, bytes] of Object.entries(assets)) {
      mkdirSync(join(root, name, ".."), { recursive: true });
      writeFileSync(join(root, name), bytes);
    }
    const watched: string[] = [];
    const hashes = collectThemeAssetHashes(root, (path) => watched.push(path));
    expect(Object.keys(hashes)).toHaveLength(2);
    for (const [name, bytes] of Object.entries(assets)) {
      if (name.includes("demo/assets")) {
        expect(hashes[`/${name}`]).toBeUndefined();
        continue;
      }
      expect(hashes[`/${name}`]).toBe(
        createHash("sha1").update(bytes).digest("hex"),
      );
      expect(watched).toContain(join(root, name));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
