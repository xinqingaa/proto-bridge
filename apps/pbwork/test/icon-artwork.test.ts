import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { expect, it } from "vitest";

import {
  PB_ICON_NAMES,
  PB_ICON_ARTWORK as artwork,
  resolvePbIcon,
} from "@/design-system/components/_shared/icons";
import catalog from "@/design-system/components/_shared/glyph-artwork.json";
import contract from "@/design-system/components/contracts/icon.json";

it("keeps the public selector, gallery and SVG registry complete", () => {
  expect(new Set(contract.propsSchema.properties.name.enum)).toEqual(
    new Set(PB_ICON_NAMES),
  );
  expect(new Set(contract.states.map((s) => s.props.name))).toEqual(
    new Set(PB_ICON_NAMES),
  );
  for (const entry of Object.values(catalog.icons)) {
    expect(entry.file.endsWith(".svg")).toBe(true);
    expect("body" in entry).toBe(false);
  }
  for (const [id, glyph] of Object.entries(artwork.icons)) {
    const svg = new DOMParser().parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${glyph.body}</svg>`,
      "image/svg+xml",
    );
    expect(svg.querySelector("parsererror"), id).toBeNull();
    expect(
      svg.querySelector("image, script, foreignObject, text"),
      id,
    ).toBeNull();
    expect(glyph.body, id).not.toMatch(/(?:href|\son\w+)=/i);
    if (glyph.colorMode === "theme")
      expect(glyph.body, id).not.toMatch(/#[\da-f]{6}\b/i);
  }
});

it("isolates clip paths for repeated prototype icons", () => {
  const Glyph = resolvePbIcon("yike-water-focus-high");
  const wrapper = mount(
    defineComponent({
      render: () => h("div", [h(Glyph, { size: 20 }), h(Glyph, { size: 20 })]),
    }),
  );
  const svgs = wrapper.findAll("svg");
  const ids = svgs.map((svg) => svg.get("clipPath").attributes("id"));
  expect(new Set(ids).size).toBe(2);
  svgs.forEach((svg, index) => {
    expect(svg.get("[clip-path]").attributes("clip-path")).toBe(
      `url(#${ids[index]})`,
    );
  });
  wrapper.unmount();
});

it("preserves authored prototype colors and root attributes", () => {
  const glyph = artwork.icons["yike-mechanical-focus-high"];
  expect(glyph.attributes.color).toBe("#b94c30");
  expect(glyph.colorMode).toBe("intrinsic");
  const Glyph = resolvePbIcon("yike-mechanical-focus-high");
  const wrapper = mount(Glyph, { props: { size: 160 } });
  expect(wrapper.get("svg").attributes("color")).toBe("#b94c30");
  expect(
    wrapper
      .findAll("circle")
      .some((circle) => circle.attributes("opacity") === "0.62"),
  ).toBe(true);
  wrapper.unmount();
});
