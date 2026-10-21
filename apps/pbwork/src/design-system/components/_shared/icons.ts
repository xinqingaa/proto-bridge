import type { Component } from "vue";
import { defineComponent, h, markRaw, useId } from "vue";
import catalog from "./glyph-artwork.json";
import { parseSvgArtwork } from "./svg-artwork.mjs";
const sources = import.meta.glob("./glyphs/**/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;
export const PB_ICON_ARTWORK = {
  icons: Object.fromEntries(
    Object.entries(catalog.icons).map(([id, entry]) => {
      const source = sources[`./${entry.file}`];
      if (!source) throw new Error(`Missing icon SVG: ${entry.file}`);
      return [id, { ...entry, ...parseSvgArtwork(source) }];
    }),
  ) as Record<
    keyof typeof catalog.icons,
    ReturnType<typeof parseSvgArtwork> & {
      owner: string;
      file: string;
      colorMode: string;
    }
  >,
};

/** Authored SVG geometry and ownership have one source across preview and export. */
export type PbIconName = keyof typeof catalog.icons;
export const PB_ICON_NAMES = Object.keys(catalog.icons) as PbIconName[];

function localBody(body: string, prefix: string): string {
  return body
    .replace(/id="([^"]+)"/g, `id="${prefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`);
}

const ICON_MAP = Object.fromEntries(
  PB_ICON_NAMES.map((name) => {
    const glyph = PB_ICON_ARTWORK.icons[name];
    return [
      name,
      markRaw(
        defineComponent({
          name: `PbGlyph-${name}`,
          props: { size: { type: Number, required: true } },
          setup: (props) => {
            // Repeated water glyphs must not share document-global clipPath ids.
            const prefix = `glyph-${useId().replace(/[^a-zA-Z0-9_-]/g, "-")}`;
            const body = localBody(glyph.body, prefix);
            return () =>
              h("svg", {
                ...glyph.attributes,
                viewBox: glyph.viewBox,
                width: props.size,
                height: (props.size * glyph.height) / glyph.width,
                "data-pb-glyph": name,
                // Static repository-authored SVG only; callers cannot inject markup.
                innerHTML: body,
              });
          },
        }),
      ),
    ];
  }),
) as unknown as Record<PbIconName, Component>;

export function resolvePbIcon(name: PbIconName | undefined): Component {
  return ICON_MAP[name ?? "more"] ?? ICON_MAP.more;
}

export function isPbIconName(value: string): value is PbIconName {
  return Object.hasOwn(catalog.icons, value);
}
