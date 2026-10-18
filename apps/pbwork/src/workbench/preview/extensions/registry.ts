import { prototypes } from "@/prototypes/registry";
import { componentRecords } from "@/design-system/components/registry";
import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";
import { validatePreviewExtensions, type PreviewExtension } from "./model";
// Only explicit metadata files register resources. Finding a Vue file never registers it.
const registrations = import.meta.glob<PreviewExtension[]>(
  "@/prototypes/*/preview-resources.ts",
  { eager: true, import: "default" },
);
const modules = import.meta.glob(
  "@/prototypes/*/{components,previews}/**/*.vue",
);
const relative = (path: string) => path.split("/prototypes/")[1]!;
export const extensionPreviewModules = new Map(
  Object.entries(modules).map(([path, load]) => [relative(path), load]),
);
export const previewExtensions = Object.values(registrations).flat();
const diagnostics = validatePreviewExtensions(previewExtensions, {
  owners: prototypes,
  baseIds: componentRecords.map((record) => record.id),
  tokenIds: runtimeThemeSources.keyCatalog.keys.map((key) => key.id),
  modulePaths: [...extensionPreviewModules.keys()],
});
if (diagnostics.length)
  throw new Error(`INVALID_PREVIEW_REGISTRY\n${diagnostics.join("\n")}`);
