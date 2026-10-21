import { parseSvgArtwork } from "@/design-system/components/_shared/svg-artwork.mjs";

type ArtworkCatalog = {
  packId: string;
  assets: Array<{
    id: string;
    label: string;
    file: string;
    sourceFile: string;
    theme: string;
    mode: string;
    usage: string;
    layerAsset?: string;
    views: Array<{ id: string; label: string; viewBox: string }>;
  }>;
};
const catalogs = import.meta.glob("/src/prototypes/*/theme/artwork.json", {
  eager: true,
  import: "default",
}) as Record<string, ArtworkCatalog>;
const sources = import.meta.glob(
  "/src/design-system/components/_shared/glyphs/**/*.svg",
  {
    eager: true,
    query: "?raw",
    import: "default",
  },
) as Record<string, string>;
export const themeArtworks = Object.entries(catalogs).flatMap(
  ([file, catalog]) =>
    catalog.assets.map((entry) => {
      const svg =
        sources[
          `/src/design-system/components/_shared/glyphs/${entry.sourceFile}`
        ];
      if (!svg) throw new Error(`Missing theme artwork: ${entry.file}`);
      const parsed = parseSvgArtwork(svg);
      if (entry.layerAsset) {
        const shared = catalog.assets.find(
          (asset) => asset.id === entry.layerAsset,
        );
        if (
          !shared ||
          entry.views.some(
            (view) =>
              !shared.views.some(
                (other) =>
                  other.id === view.id && other.viewBox === view.viewBox,
              ),
          )
        )
          throw new Error(`Invalid shared artwork layers: ${entry.id}`);
      }
      if (
        entry.views.length !== parsed.views.length ||
        entry.views.some(
          (view) =>
            !parsed.views.some(
              (actual) =>
                actual.id === view.id && actual.viewBox === view.viewBox,
            ),
        )
      )
        throw new Error(`Theme artwork views drifted: ${entry.id}`);
      return {
        ...entry,
        ...parsed,
        views: entry.views,
        packId: catalog.packId,
        key: `${catalog.packId}/${entry.id}`,
      };
    }),
);
