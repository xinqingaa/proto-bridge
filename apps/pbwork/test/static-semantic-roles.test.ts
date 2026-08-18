import { SEMANTIC_ROLES } from "@proto-bridge/core/v2";
import { describe, expect, it } from "vitest";
import {
  findInvalidStaticSemanticRoles,
  lintFormalPrototypeStaticRoles,
} from "../scripts/validate-static-semantic-roles.mjs";

describe("formal prototype static semantic roles", () => {
  it("accepts every static data-pb-role authored by formal PBWork prototypes", async () => {
    await expect(lintFormalPrototypeStaticRoles()).resolves.toEqual([]);
  });

  it("rejects a static role that is absent from Core SEMANTIC_ROLES", () => {
    expect(
      findInvalidStaticSemanticRoles(
        '<div data-pb-role="not-a-core-role"></div>',
        SEMANTIC_ROLES,
      ),
    ).toEqual([{ role: "not-a-core-role", line: 1 }]);
  });

  it("leaves dynamic role bindings to their runtime contract validation", () => {
    expect(
      findInvalidStaticSemanticRoles(':data-pb-role="resolvedRole"'),
    ).toEqual([]);
  });
});
