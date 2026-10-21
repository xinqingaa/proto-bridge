/** Parse repository-authored SVG assets without depending on a browser DOM. */
export function parseSvgArtwork(svg) {
  const match = /^\s*(?:<\?xml[^>]*>\s*)?<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(svg);
  if (!match) throw new Error('Expected one authored SVG root');
  const attributes = Object.fromEntries([...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
  const dimensions = attributes.viewBox?.trim().split(/\s+/).map(Number);
  if (!dimensions || dimensions.length !== 4 || !dimensions.every(Number.isFinite) || dimensions[2] <= 0 || dimensions[3] <= 0) throw new Error('SVG requires a valid viewBox');
  const views = [...match[2].matchAll(/<view\b([^>]*)\/?\s*>/g)].map(m => {
    const attrs = Object.fromEntries([...m[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(a => [a[1], a[2]]));
    return {id: attrs.id, viewBox: attrs.viewBox};
  });
  return {svg, attributes, body: match[2], viewBox: attributes.viewBox, width: dimensions[2], height: dimensions[3], views};
}

/** Keep definitions and geometry, changing only the exported viewport and ink. */
export function svgForView(svg, viewBox, color) {
  const parsed = parseSvgArtwork(svg);
  const bounds = (viewBox ?? parsed.viewBox).split(/\s+/).map(Number);
  if (bounds.length !== 4 || !bounds.every(Number.isFinite) || bounds[2] <= 0 || bounds[3] <= 0) throw new Error('Invalid SVG view');
  const attributes = {...parsed.attributes, viewBox: viewBox ?? parsed.viewBox, width: String(bounds[2]), height: String(bounds[3]), ...(color ? {color} : {})};
  return `<svg ${Object.entries(attributes).map(([key, value]) => `${key}="${value}"`).join(' ')}>${parsed.body}</svg>`;
}
