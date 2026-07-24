import type {
  PrototypeScreenGroup,
  ScreenRecord,
} from "@/design-system/types";

export type ResolvedScreenGroup = {
  id: string;
  label: string;
  screens: ScreenRecord[];
};

export function resolveScreenGroups(
  screens: ScreenRecord[],
  groups: PrototypeScreenGroup[] = [],
): ResolvedScreenGroup[] {
  const bySlug = new Map(screens.map((screen) => [screen.screenSlug, screen]));
  const claimed = new Set<string>();
  const resolved: ResolvedScreenGroup[] = [];

  for (const group of groups) {
    const items = group.screenSlugs
      .map((slug) => bySlug.get(slug))
      .filter((screen): screen is ScreenRecord => Boolean(screen));
    for (const screen of items) claimed.add(screen.screenSlug);
    if (items.length) {
      resolved.push({ id: group.id, label: group.label, screens: items });
    }
  }

  const leftovers = screens.filter(
    (screen) => !claimed.has(screen.screenSlug),
  );
  if (leftovers.length) {
    resolved.push({
      id: resolved.length ? "other" : "all",
      label: resolved.length ? "其他" : "全部页面",
      screens: leftovers,
    });
  }

  return resolved;
}
