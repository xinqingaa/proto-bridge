import type { PrototypeRecord, ScreenRecord } from "@/design-system/types";
import boundaries from "./generated/default-boundaries.json";

const prototypeModules = import.meta.glob<PrototypeRecord>("./*/prototype.ts", {
  eager: true,
  import: "default",
});
const screenModules = import.meta.glob<ScreenRecord>(
  "./*/screens/*/screen.ts",
  { eager: true, import: "default" },
);
export const prototypes = Object.values(prototypeModules);
const screenOrder = prototypes.flatMap((prototype) =>
  (prototype.screenGroups ?? []).flatMap((group) =>
    group.screenSlugs.map((slug) => `${prototype.id}.${slug}`),
  ),
);
const rank = (screen: ScreenRecord) => {
  const index = screenOrder.indexOf(screen.screenId);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
};
export const prototypeScreens = Object.values(screenModules)
  .sort((a, b) => rank(a) - rank(b) || a.screenId.localeCompare(b.screenId))
  .map((screen) => ({
    ...screen,
    variants: screen.variants.map((variant) =>
      variant.id === screen.defaultVariantId
        ? {
            ...variant,
            requiredFragments:
              (
                boundaries as Record<
                  string,
                  ScreenRecord["variants"][number]["requiredFragments"]
                >
              )[screen.screenId] ?? [],
          }
        : variant,
    ),
  }));
