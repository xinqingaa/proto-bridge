// @vitest-environment node
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { defineScreen, fragment } from "@/authoring/define-screen";
import { generateScreenBoundaries } from "../scripts/generate-screen-boundaries";
import { createPrototype } from "../scripts/new-prototype.mjs";

it("keeps committed default boundaries fresh from author opt-ins", async () => {
  expect(
    readFileSync("src/prototypes/generated/default-boundaries.json", "utf8"),
  ).toBe(await generateScreenBoundaries());
});
it("does not silently accept an empty authored boundary", () => {
  expect(() =>
    defineScreen({
      prototypeId: "demo",
      slug: "home",
      label: "home",
      view: "Home.vue",
      defaultVariantId: "default",
      fragments: [fragment("optional")],
      variants: [{ id: "default", label: "default" }],
    }),
  ).toThrow("EMPTY_AUTHORED_BOUNDARY");
});
it("creates the full draft skeleton and refuses unsafe ids or overwrite", () => {
  const root = mkdtempSync(path.join(tmpdir(), "pbwork-scaffold-"));
  try {
    const dir = createPrototype("test-app", root);
    expect(readFileSync(path.join(dir, "docs/design.md"), "utf8")).toContain(
      "status: draft",
    );
    expect(readFileSync(path.join(dir, "docs/design.md"), "utf8")).toContain(
      "prototypeId: test-app",
    );
    const docs = JSON.parse(
      readFileSync(path.join(dir, "docs/target-docs.json"), "utf8"),
    );
    expect(docs.files).toContainEqual({
      source: "known-gaps.md",
      target: "prototype/known-gaps.md",
    });
    for (const file of docs.files) {
      expect(
        readFileSync(path.join(dir, "docs", file.source), "utf8"),
      ).not.toContain("{{prototypeId}}");
    }
    expect(
      readFileSync(path.join(dir, "docs/design.md"), "utf8"),
    ).not.toContain("status: approved");
    expect(readFileSync(path.join(dir, "theme/pack.json"), "utf8")).toContain(
      '"scope": "prototype"',
    );
    expect(
      readFileSync(path.join(dir, "screens/home/Home.vue"), "utf8"),
    ).toContain("useClock");
    expect(() => createPrototype("test-app", root)).toThrow("ALREADY_EXISTS");
    expect(() => createPrototype("../escape", root)).toThrow("Usage:");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
