import { afterEach, describe, expect, it } from "vitest";
import {
  readArtworkEvidence,
  readOwnedIcons,
} from "@/runtime/artwork-evidence";
import { registerInspect } from "@/runtime/inspect/registry";
import { themeAssetUrl } from "@/design-system/theme/sources";
import { themeArtworkEntry } from "@/design-system/theme/sources";
import { PB_ICON_ARTWORK } from "@/design-system/components/_shared/icons";
import { buildRuntimeCaptureManifest } from "@/runtime/capture-protocol";

afterEach(() => document.body.replaceChildren());

function dial(file = "assets/mechanical-light-plain.svg", view = "progress") {
  const root = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  root.setAttribute(
    "data-pb-artwork",
    JSON.stringify({
      packId: "yike",
      file,
      state: { tone: "run", scale: "session", fraction: 0.5 },
    }),
  );
  const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
  // jsdom does not implement SVGImageElement.href.
  Object.defineProperty(image, "href", {
    value: { baseVal: `${themeAssetUrl("yike", file)}#${view}` },
  });
  root.append(image);
  document.body.append(root);
  return root;
}

describe("DS resource usage evidence", () => {
  it("invalidates old Case input when artwork metadata or icon source changes", () => {
    const before = buildRuntimeCaptureManifest("yike").inputVersion;
    const view = themeArtworkEntry("yike", "assets/mechanical-light.svg")!
      .views[0]!;
    const label = view.label;
    const svg = PB_ICON_ARTWORK.icons.settings.svg;
    try {
      view.label += " updated";
      expect(buildRuntimeCaptureManifest("yike").inputVersion).not.toBe(before);
      view.label = label;
      PB_ICON_ARTWORK.icons.settings.svg += " ";
      expect(buildRuntimeCaptureManifest("yike").inputVersion).not.toBe(before);
    } finally {
      view.label = label;
      PB_ICON_ARTWORK.icons.settings.svg = svg;
    }
    expect(buildRuntimeCaptureManifest("yike").inputVersion).toBe(before);
  });

  it("resolves source identity and shared layers without retaining SVG bytes", () => {
    expect(readArtworkEvidence(dial())).toMatchObject({
      declared: {
        assetId: "mechanical-light-plain",
        packId: "yike",
        layerAsset: "mechanical-light",
        state: { scale: "session", fraction: 0.5 },
      },
      sourceDigest: expect.stringMatching(/^sha1:[a-f0-9]{40}$/),
      images: [{ view: "progress", visible: true }],
    });
  });

  it("rejects unregistered identity, mismatched image and unknown view", () => {
    const root = dial();
    root.setAttribute(
      "data-pb-artwork",
      JSON.stringify({ packId: "yike", file: "missing.svg" }),
    );
    expect(() => readArtworkEvidence(root)).toThrow("Unknown authored artwork");
    root.setAttribute(
      "data-pb-artwork",
      JSON.stringify({ packId: "yike", file: "assets/water-light.svg" }),
    );
    expect(() => readArtworkEvidence(root)).toThrow(
      "does not match rendered image",
    );
    expect(() =>
      readArtworkEvidence(dial("assets/mechanical-light-plain.svg", "missing")),
    ).toThrow("does not match rendered image");
  });

  it("keeps decorative icons on their closest semantic owner and validates the actual glyph", () => {
    const owner = document.createElement("button");
    owner.dataset.pbId = "test.action";
    owner.dataset.pbRole = "button";
    const nested = document.createElement("span");
    nested.dataset.pbId = "test.nested";
    nested.dataset.pbRole = "text";
    const icon = document.createElement("span");
    icon.dataset.pbComponent = "ds.icon";
    icon.innerHTML = '<svg data-pb-glyph="settings"></svg>';
    const unregister = registerInspect({
      element: icon,
      pbId: "ds.icon",
      componentId: "icon",
      getProps: () => ({ name: "settings", size: "md", tone: "inherit" }),
    });
    owner.append(icon, nested);
    document.body.append(owner);
    expect(readOwnedIcons(owner)).toMatchObject([
      { name: "settings", owner: "shared", colorMode: "theme" },
    ]);
    nested.append(icon);
    expect(readOwnedIcons(owner)).toEqual([]);
    expect(readOwnedIcons(nested)).toHaveLength(1);
    icon.querySelector("svg")!.setAttribute("data-pb-glyph", "plus");
    expect(() => readOwnedIcons(nested)).toThrow(
      "does not match rendered glyph",
    );
    unregister();
  });
});
