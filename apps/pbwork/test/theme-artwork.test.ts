import { expect, it } from "vitest";
import { themeArtworks } from "@/workbench/preview/theme-artwork";
import {
  parseSvgArtwork,
  svgForView,
} from "@/design-system/components/_shared/svg-artwork.mjs";

it("registers both session variants and every authored SVG view", () => {
  expect(themeArtworks).toHaveLength(8);
  expect(
    themeArtworks.filter((asset) => asset.id.endsWith("-plain")),
  ).toHaveLength(2);
  for (const asset of themeArtworks) {
    for (const view of asset.views) {
      const cropped = parseSvgArtwork(svgForView(asset.svg, view.viewBox));
      expect(cropped.body).toBe(parseSvgArtwork(asset.svg).body);
      expect(cropped.viewBox).toBe(view.viewBox);
    }
  }
});
