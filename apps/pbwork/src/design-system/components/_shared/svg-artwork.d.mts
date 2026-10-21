export type SvgArtwork = {
  svg: string;
  attributes: Record<string, string>;
  body: string;
  viewBox: string;
  width: number;
  height: number;
  views: Array<{id: string; viewBox: string}>;
};
export function parseSvgArtwork(svg: string): SvgArtwork;
export function svgForView(svg: string, viewBox?: string, color?: string): string;
