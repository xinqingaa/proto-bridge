import { it, expect } from "vitest";
import { reviewIntensity } from "@/prototypes/yike/components/review-intensity";
it("keeps zero separate and uses inclusive 30/90 minute boundaries", () => {
  for (const value of [NaN, Infinity, -2, 0])
    expect(reviewIntensity(value)).toBe("none");
  for (const [value, band] of [
    [0.1, "low"],
    [30, "low"],
    [30.1, "medium"],
    [90, "medium"],
    [90.1, "high"],
    [500, "high"],
  ] as const)
    expect(reviewIntensity(value)).toBe(band);
});
