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

it("maps centralized SVG bytes to stable theme identities and watches the actual source", () => {
  const root = mkdtempSync(join(tmpdir(), "pb-theme-glyphs-"));
  try {
    const source = "src/design-system/components/_shared/glyphs/demo/dial.svg";
    const catalog = "src/prototypes/demo/theme/artwork.json";
    const bytes = Buffer.from('<svg color="#b94c30"><circle r="4"/></svg>');
    for (const file of [source, catalog])
      mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, source), bytes);
    writeFileSync(
      join(root, catalog),
      JSON.stringify({
        assets: [{ file: "assets/dial.svg", sourceFile: "demo/dial.svg" }],
      }),
    );
    const watched: string[] = [];
    expect(collectThemeAssetHashes(root, (file) => watched.push(file))).toEqual(
      {
        "/src/prototypes/demo/theme/assets/dial.svg": createHash("sha1")
          .update(bytes)
          .digest("hex"),
      },
    );
    expect(watched).toContain(join(root, source));
    expect(watched).toContain(join(root, catalog));
    writeFileSync(join(root, source), Buffer.from('<svg color="#112233"/>'));
    expect(
      collectThemeAssetHashes(root)[
        "/src/prototypes/demo/theme/assets/dial.svg"
      ],
    ).not.toBe(createHash("sha1").update(bytes).digest("hex"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
