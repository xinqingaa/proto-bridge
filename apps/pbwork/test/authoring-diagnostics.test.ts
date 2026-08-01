import { describe, expect, it } from "vitest";
import { inspectElementDiagnostics } from "@/authoring/diagnostics";

describe("authoring diagnostics", () => {
  it("returns stable shared warning codes for a CSS-only list candidate", () => {
    const diagnostics = inspectElementDiagnostics({
      ref: { handle: "h1" },
      tag: "div",
      classes: ["task-list"],
    });
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "authoring.possible-list-marker",
      "authoring.missing-stable-id",
    ]);
    expect(diagnostics.every((diagnostic) => diagnostic.severity === "warning")).toBe(true);
  });
});
