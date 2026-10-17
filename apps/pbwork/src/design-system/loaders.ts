import type {
  ComponentContract,
  ComponentRecord,
  PrototypeRecord,
  ScreenRecord,
  ThemeRecord,
  TokenRecord,
} from "@/design-system/types";
import { componentRecords } from "@/design-system/components/registry";
import { prototypes, prototypeScreens } from "@/prototypes/registry";

import { runtimeThemeSources } from "@/design-system/theme/runtime-theme";

export function loadPrototypeThemePack(prototypeId: string) {
  const prototype = prototypes.find((item) => item.id === prototypeId);
  const source = runtimeThemeSources.packs.get(prototype?.themePackId ?? "");
  if (!source) throw new Error(`UNKNOWN_PROTOTYPE_THEME_PACK:${prototypeId}`);
  return source.manifest;
}

const contractModules = import.meta.glob(
  "@/design-system/components/contracts/*.json",
  { eager: true, import: "default" },
) as Record<string, ComponentContract>;

export {
  loadTokenPresentations,
  loadModePresentations,
} from "@/design-system/theme/presentation";

export function loadComponentRecords(): ComponentRecord[] {
  return componentRecords;
}

export function loadComponentContracts(): ComponentContract[] {
  return Object.values(contractModules);
}

export function loadComponentContract(
  contractPath: string,
): ComponentContract | undefined {
  const normalized = contractPath.replace(/^\.\//, "");
  const match = Object.entries(contractModules).find(
    ([path]) => path.endsWith(normalized) || path.endsWith(`/${normalized}`),
  );
  return match?.[1];
}

export function loadPrototypes(): PrototypeRecord[] {
  return prototypes;
}

export function loadPrototypeScreens(): ScreenRecord[] {
  return prototypeScreens;
}

export const screenViewModules = import.meta.glob([
  "@/prototypes/*/screens/*.vue",
  "@/prototypes/*/screens/*/*.vue",
]);

export const componentViewModules = import.meta.glob(
  "@/design-system/components/{action,input,display,navigation,data,feedback}/*.vue",
);

export { loadThemeSources, themeAssetUrl } from "@/design-system/theme/sources";
