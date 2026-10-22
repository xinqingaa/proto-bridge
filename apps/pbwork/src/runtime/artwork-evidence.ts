import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import {
  themeAssetUrl,
  themeArtworkEntry,
} from "@/design-system/theme/sources";
import {
  PB_ICON_ARTWORK,
  type PbIconName,
} from "@/design-system/components/_shared/icons";
import { getInspectRegistration } from "./inspect/registry";

/** Decorative icons belong to their closest semantic owner, not new Fragments. */
export function readOwnedIcons(
  element: Element,
): Array<Record<string, unknown>> {
  return Array.from(
    element.querySelectorAll<HTMLElement>('[data-pb-component="ds.icon"]'),
  )
    .filter((icon) => icon.closest("[data-pb-id][data-pb-role]") === element)
    .map((icon) => {
      const props = getInspectRegistration(icon)?.getProps?.();
      const name = props?.name as PbIconName | undefined;
      const source = name && PB_ICON_ARTWORK.icons[name];
      if (!source) throw new Error("Unknown registered icon resource.");
      if (
        icon.querySelector("[data-pb-glyph]")?.getAttribute("data-pb-glyph") !==
        name
      ) {
        throw new Error(
          `Icon declaration does not match rendered glyph: ${name}`,
        );
      }
      return {
        name,
        owner: source.owner,
        sourceFile: source.file,
        colorMode: source.colorMode,
        size: props?.size,
        tone: props?.tone,
      };
    });
}

/** Explicit authored identity plus observed image views; never infer identity from a URL. */
export function readArtworkEvidence(
  element: Element,
): Record<string, unknown> | undefined {
  const raw = element.getAttribute("data-pb-artwork");
  if (!raw) return undefined;
  const authored = JSON.parse(raw) as Record<string, unknown>;
  if (
    !authored ||
    typeof authored !== "object" ||
    typeof authored.packId !== "string" ||
    typeof authored.file !== "string"
  ) {
    throw new Error("Invalid authored artwork identity.");
  }
  const entry = themeArtworkEntry(authored.packId, authored.file);
  const sha1 = runtimeThemeSources.packs.get(authored.packId)?.files?.[
    authored.file
  ];
  if (!sha1 || !entry)
    throw new Error(
      `Unknown authored artwork: ${authored.packId}/${authored.file}`,
    );
  const declared = {
    ...entry,
    assetId: entry.id,
    packId: authored.packId,
    state: authored.state,
  };
  const expected = new URL(
    themeAssetUrl(declared.packId, declared.file),
    document.baseURI,
  );
  const views = declared.views;
  const images = Array.from(element.querySelectorAll("image")).map((image) => {
    const actual = new URL(image.href.baseVal, document.baseURI);
    const view = actual.hash.slice(1);
    actual.hash = "";
    expected.hash = "";
    if (
      actual.href !== expected.href ||
      (view &&
        !views.some((entry: unknown) =>
          Boolean(
            entry &&
            typeof entry === "object" &&
            "id" in entry &&
            entry.id === view,
          ),
        ))
    ) {
      throw new Error(
        `Artwork declaration does not match rendered image: ${declared.assetId}/${view}`,
      );
    }
    let visible = true;
    for (
      let current: Element | null = image;
      current;
      current = current.parentElement
    ) {
      const style = getComputedStyle(current);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity || "1") === 0
      )
        visible = false;
      if (current === element) break;
    }
    return { view: view || "default", visible };
  });
  if (!images.length)
    throw new Error(`Artwork has no rendered image: ${declared.assetId}`);
  return { declared, sourceDigest: `sha1:${sha1}`, images };
}
