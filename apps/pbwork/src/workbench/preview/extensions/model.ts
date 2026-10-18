/** Explicit presentation registration only. Never used as Runtime/Evidence authority. */
export type PreviewExtension = {
  id: string;
  label: string;
  ownerPrototypeId: string;
  kind: "variant" | "component";
  baseComponentId?: string;
  description: string;
  /** Relative to src/prototypes, inside this owner's components/previews. */
  implementation: string;
  preview: string;
  states: Array<{ id: string; label: string }>;
  tokenIds: string[];
};
export type ExtensionEnvironment = {
  owners: readonly { id: string; label: string }[];
  baseIds: readonly string[];
  tokenIds: readonly string[];
  modulePaths: readonly string[];
};
export function validatePreviewExtensions(
  entries: readonly PreviewExtension[],
  env: ExtensionEnvironment,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entry of entries) {
    const fail = (reason: string) => errors.push(`${entry.id}: ${reason}`);
    if (
      !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(entry.id) ||
      ids.has(entry.id) ||
      env.baseIds.includes(entry.id)
    )
      fail("INVALID_OR_DUPLICATE_ID");
    ids.add(entry.id);
    if (!env.owners.some((owner) => owner.id === entry.ownerPrototypeId))
      fail("UNKNOWN_OWNER");
    if (entry.kind !== "component" && entry.kind !== "variant")
      fail("UNKNOWN_KIND");
    if (
      entry.kind === "variant" &&
      (!entry.baseComponentId || !env.baseIds.includes(entry.baseComponentId))
    )
      fail("UNKNOWN_BASE");
    if (entry.kind === "component" && entry.baseComponentId)
      fail("OWN_COMPONENT_HAS_BASE");
    if (!entry.label?.trim() || !entry.description?.trim())
      fail("MISSING_DESCRIPTION");
    for (const field of ["implementation", "preview"] as const) {
      const path = entry[field];
      if (
        !path ||
        path.includes("..") ||
        !path.startsWith(`${entry.ownerPrototypeId}/`) ||
        !env.modulePaths.includes(path)
      )
        fail(`MISSING_OR_FOREIGN_${field.toUpperCase()}`);
    }
    if (
      !entry.states?.length ||
      entry.states.some((state) => !state.id || !state.label) ||
      new Set(entry.states.map((state) => state.id)).size !==
        entry.states.length
    )
      fail("INVALID_REPRESENTATIVE_STATES");
    if (
      !Array.isArray(entry.tokenIds) ||
      entry.tokenIds.some((id) => !env.tokenIds.includes(id)) ||
      new Set(entry.tokenIds).size !== entry.tokenIds.length
    )
      fail("UNKNOWN_OR_DUPLICATE_TOKEN");
  }
  return errors;
}
export function extensionsForComponent(
  entries: readonly PreviewExtension[],
  componentId: string,
) {
  return entries.filter(
    (entry) =>
      entry.kind === "variant" && entry.baseComponentId === componentId,
  );
}
export function extensionNavigation(
  entries: readonly PreviewExtension[],
  owners: ExtensionEnvironment["owners"],
) {
  return entries
    .filter((entry) => entry.kind === "component")
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      group: `${owners.find((owner) => owner.id === entry.ownerPrototypeId)?.label ?? entry.ownerPrototypeId} · 自有组件`,
      to: `/workbench/components/${entry.id}`,
    }));
}
export function extensionApplicable(
  extension: PreviewExtension,
  selectedPackId: string,
  ownerThemePackId?: string,
) {
  return (
    extension.kind === "variant" ||
    Boolean(ownerThemePackId && selectedPackId === ownerThemePackId)
  );
}
