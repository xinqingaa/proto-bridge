// @vitest-environment node
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { generateThemeKeys } from "../scripts/generate-theme-keys.mjs";
import {
  PB_STYLE_SLOTS,
  BINDING_SLOT_PROPERTIES,
} from "@/design-system/theme/slots";
import { pbStyle, type PbDeclaration } from "@/authoring/pb-style";

it("keeps generated keys and slot types fresh", () => {
  expect(
    readFileSync("src/design-system/theme/generated/keys.ts", "utf8"),
  ).toBe(generateThemeKeys(PB_STYLE_SLOTS));
  for (const [slot, spec] of Object.entries(PB_STYLE_SLOTS))
    expect(BINDING_SLOT_PROPERTIES[slot]).toEqual(spec.properties);
});
it("rejects unknown keys and mismatched key families during typecheck", () => {
  // @ts-expect-error Unknown key is never an authoring escape hatch.
  pbStyle({ color: "color.typo" });
  // @ts-expect-error A space key cannot style a color slot.
  pbStyle({ color: "spacing.md" });
  // @ts-expect-error Duration constants cannot style padding.
  pbStyle({ padding: "motion.duration-instant" });
  // @ts-expect-error Roles come from Core, not a local enum.
  const invalid: PbDeclaration = { id: "demo.home.title", role: "made-up" };
  void invalid;
});
