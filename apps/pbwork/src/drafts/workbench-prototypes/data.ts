import { loadPrototypeScreens, loadPrototypes } from "@/design-system/loaders";
import {
  LIFECYCLE_LABELS,
  type PrototypeLifecycle,
  type PrototypeRecord,
} from "@/design-system/types";
import {
  atmosphereStyle,
  prototypeShortLabel,
  prototypeSummary,
} from "@/workbench/prototypes/prototypePresentation";
import { resolveScreenGroups } from "@/workbench/prototypes/resolveScreenGroups";

export { LIFECYCLE_LABELS };

export const STAGES: PrototypeLifecycle[] = [
  "active",
  "review",
  "final",
  "archived",
];

/** Root tabs are destinations, not a pipeline. Other multi-page groups keep order. */
const PARALLEL_GROUP_IDS = new Set(["root-tabs"]);

export type DraftStage = PrototypeLifecycle;

export type CatalogWork = {
  id: string;
  label: string;
  shortLabel: string;
  summary: string;
  roles: string[];
  owners: string[];
  chapters: MapChapter[];
  screens: number;
  variants: number;
  stage: DraftStage;
  atmosphere: Record<string, string>;
};

export type MapScreen = {
  slug: string;
  label: string;
  variantLabel: string;
  variantCount: number;
};

export type MapChapter = {
  id: string;
  label: string;
  sequential: boolean;
  screens: MapScreen[];
};

export type DetailWork = CatalogWork & {
  lastEvent: string;
};

const prototypes = loadPrototypes();
const screens = loadPrototypeScreens();

function statsFor(id: string) {
  const items = screens.filter((screen) => screen.prototypeId === id);
  return {
    screens: items.length,
    variants: items.reduce((sum, screen) => sum + screen.variants.length, 0),
  };
}

function chaptersFor(prototype: PrototypeRecord): MapChapter[] {
  const items = screens.filter((screen) => screen.prototypeId === prototype.id);
  return resolveScreenGroups(items, prototype.screenGroups ?? []).map(
    (group) => ({
      id: group.id,
      label: group.label,
      sequential:
        group.screens.length > 1 && !PARALLEL_GROUP_IDS.has(group.id),
      screens: group.screens.map((screen) => {
        const variant =
          screen.variants.find(
            (item) => item.id === screen.defaultVariantId,
          ) ?? screen.variants[0];
        return {
          slug: screen.screenSlug,
          label: screen.label,
          variantLabel: variant?.label ?? screen.defaultVariantId,
          variantCount: screen.variants.length,
        };
      }),
    }),
  );
}

function toCatalogWork(prototype: PrototypeRecord): CatalogWork {
  const stats = statsFor(prototype.id);
  const map = chaptersFor(prototype);
  return {
    id: prototype.id,
    label: prototype.label,
    shortLabel: prototypeShortLabel(prototype),
    summary: prototypeSummary(prototype),
    roles: prototype.roles ?? [],
    owners: prototype.owners ?? [],
    chapters: map,
    screens: stats.screens,
    variants: stats.variants,
    stage: "active",
    atmosphere: atmosphereStyle(prototype.id),
  };
}

export const catalogWorks: CatalogWork[] = prototypes.map(toCatalogWork);

export function stageCounts(filterSource: CatalogWork[] = catalogWorks) {
  return STAGES.map((id) => ({
    id,
    label: LIFECYCLE_LABELS[id],
    count: filterSource.filter((work) => work.stage === id).length,
  }));
}

export function verbFor(stage: DraftStage) {
  if (stage === "active") return "送交待确定";
  if (stage === "review") return "定稿并采集";
  if (stage === "final") return "查看定稿产物";
  return "查看归档产物";
}

export function secondaryFor(stage: DraftStage): string[] {
  if (stage === "review") return ["退回进行中"];
  if (stage === "final") return ["回退待确定", "归档"];
  return [];
}

export function lastEventFor(stage: DraftStage) {
  if (stage === "active") return "8 月 20 日进入进行中";
  if (stage === "review") return "昨天送交待确定";
  if (stage === "final") return "3 天前定稿并采集";
  return "上周一归档，永久只读";
}

export function detailWork(
  prototypeId: string,
  stage: DraftStage,
): DetailWork | undefined {
  const prototype = prototypes.find((item) => item.id === prototypeId);
  if (!prototype) return undefined;
  const base = toCatalogWork(prototype);
  return {
    ...base,
    stage,
    lastEvent: lastEventFor(stage),
  };
}

export function canvasPath(prototypeId: string, slug: string) {
  return `/workbench/prototypes/${prototypeId}/screens/${slug}`;
}
