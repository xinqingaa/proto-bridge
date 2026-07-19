import type {
  ComponentContract,
  ComponentRecord,
  PrototypeRecord,
  ScreenRecord,
  ThemeRecord,
  TokenRecord,
} from "@/design-system/types";
import tokensJson from "@/design-system/tokens/tokens.json";
import lightTheme from "@/design-system/themes/light.json";
import darkTheme from "@/design-system/themes/dark.json";
import { componentRecords } from "@/design-system/components/registry";
import {
  prototypes,
  prototypeScreens,
} from "@/prototypes/registry";

const contractModules = import.meta.glob(
  "@/design-system/components/contracts/*.json",
  { eager: true, import: "default" },
) as Record<string, ComponentContract>;

export function loadTokens(): TokenRecord[] {
  return tokensJson as TokenRecord[];
}

export function loadThemes(): ThemeRecord[] {
  return [lightTheme, darkTheme] as ThemeRecord[];
}

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
  const match = Object.entries(contractModules).find(([path]) =>
    path.endsWith(normalized) || path.endsWith(`/${normalized}`),
  );
  return match?.[1];
}

export function loadPrototypes(): PrototypeRecord[] {
  return prototypes;
}

export function loadPrototypeScreens(): ScreenRecord[] {
  return prototypeScreens;
}

export const screenViewModules = import.meta.glob(
  "@/prototypes/*/screens/*.vue",
);

export const componentViewModules = import.meta.glob(
  "@/design-system/components/{basic,complex}/*.vue",
);
