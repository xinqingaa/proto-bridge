/** Shared CSS observation and authoring slots. DS bindings remain Registry-owned. */
export const BINDING_SLOT_PROPERTIES: Record<string, readonly string[]> = {
  background: ["background-color"],
  surface: ["background-color"],
  tonalBackground: ["background-color"],
  activeBackground: ["background-color"],
  color: ["color"],
  onBackground: ["color"],
  inactiveColor: ["color"],
  muted: ["color"],
  indicator: ["color", "background-color"],
  border: ["border", "border-color"],
  radius: ["border-radius"],
  elevation: ["box-shadow"],
  // Root-level typography only. Part slots (title/subtitle/label/input) must not
  // claim the registered root's computed font as "显式绑定".
  typography: [
    "font",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
  ],
};

/** Authorable slots reference generated key families; no second token catalog. */
export const PB_STYLE_SLOTS = {
  background: {
    properties: BINDING_SLOT_PROPERTIES.background!,
    family: "ColorKey",
    literals: ["transparent"],
  },
  color: { properties: BINDING_SLOT_PROPERTIES.color!, family: "ColorKey" },
  radius: { properties: BINDING_SLOT_PROPERTIES.radius!, family: "RadiusKey" },
  typography: {
    properties: BINDING_SLOT_PROPERTIES.typography!,
    family: "TypographyKey",
  },
  elevation: {
    properties: BINDING_SLOT_PROPERTIES.elevation!,
    family: "ElevationKey",
    literals: ["none"],
  },
  border: { properties: BINDING_SLOT_PROPERTIES.border!, family: "BorderKey" },
  gap: { properties: ["gap"], family: "SpaceKey" },
  padding: { properties: ["padding"], family: "SpaceKey", pair: true },
  paddingTop: { properties: ["padding-top"], family: "SpaceKey" },
  paddingBottom: { properties: ["padding-bottom"], family: "SpaceKey" },
  paddingLeft: { properties: ["padding-left"], family: "SpaceKey" },
  paddingRight: { properties: ["padding-right"], family: "SpaceKey" },
  margin: { properties: ["margin"], family: "SpaceKey", pair: true },
  marginTop: { properties: ["margin-top"], family: "SpaceKey" },
  marginBottom: { properties: ["margin-bottom"], family: "SpaceKey" },
  marginLeft: { properties: ["margin-left"], family: "SpaceKey" },
  marginRight: { properties: ["margin-right"], family: "SpaceKey" },
  width: { properties: ["width"], family: "SizeKey" },
  height: { properties: ["height"], family: "SizeKey" },
} as const;

// Inspector consumes the exact same properties, including directional spacing.
for (const [slot, spec] of Object.entries(PB_STYLE_SLOTS)) {
  BINDING_SLOT_PROPERTIES[slot] = spec.properties;
  BINDING_SLOT_PROPERTIES[
    slot.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
  ] = spec.properties;
}
