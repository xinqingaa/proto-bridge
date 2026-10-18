import type { Component } from "vue";
import { defineComponent, h, markRaw } from "vue";
import artwork from "./glyph-artwork.json";
/** PBWork original SVG glyphs. Stable ids are preserved for consumers. */
export const PB_ICON_NAMES = [
  "more",
  "plus",
  "search",
  "settings",
  "home",
  "list",
  "user",
  "inbox",
  "check",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "alert-triangle",
  "alert-circle",
  "clock",
  "refresh-cw",
  "clipboard-check",
  "shield-check",
  "folder-open",
  "thermometer",
  "snowflake",
  "copy",
  "file-text",
  "sliders-horizontal",
  "map-pin",
  "radio",
  "truck",
  "dumbbell",
  "eye",
  "eye-off",
  "footprints",
  "person-standing",
  "sparkles",
  "x",
] as const;

export type PbIconName = (typeof PB_ICON_NAMES)[number];

export const PB_ICON_ARTWORK = artwork;
const ICON_MAP = Object.fromEntries(
  PB_ICON_NAMES.map((name) => [
    name,
    markRaw(
      defineComponent({
        name: `PbGlyph-${name}`,
        props: { size: { type: Number, required: true } },
        setup: (props) => () =>
          h(
            "svg",
            {
              xmlns: "http://www.w3.org/2000/svg",
              viewBox: artwork.viewBox,
              width: props.size,
              height: props.size,
              fill: "none",
              stroke: "currentColor",
              "stroke-width": artwork.strokeWidth,
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "data-pb-glyph": name,
            },
            [h("path", { d: artwork.paths[name] })],
          ),
      }),
    ),
  ]),
) as unknown as Record<PbIconName, Component>;

export function resolvePbIcon(name: PbIconName | undefined): Component {
  return ICON_MAP[name ?? "more"] ?? ICON_MAP.more;
}

export function isPbIconName(value: string): value is PbIconName {
  return (PB_ICON_NAMES as readonly string[]).includes(value);
}
