import type {
  PrototypeRecord,
  PrototypeScreenGroup,
  ScreenRecord,
} from "@/design-system/types";
import { LIFECYCLE_LABELS } from "@/design-system/types";
import type {
  LifecycleHistoryEntry,
  LifecycleOperation,
} from "@/app/stores/prototypeLifecycle";
import { resolveScreenGroups } from "./resolveScreenGroups";

/** Root tabs are destinations, not a pipeline. */
const PARALLEL_GROUP_IDS = new Set(["root-tabs"]);

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

export function prototypeChapters(
  screens: ScreenRecord[],
  groups: PrototypeScreenGroup[] = [],
): MapChapter[] {
  return resolveScreenGroups(screens, groups).map((group) => ({
    id: group.id,
    label: group.label,
    sequential: group.screens.length > 1 && !PARALLEL_GROUP_IDS.has(group.id),
    screens: group.screens.map((screen) => {
      const variant =
        screen.variants.find((item) => item.id === screen.defaultVariantId) ??
        screen.variants[0];
      return {
        slug: screen.screenSlug,
        label: screen.label,
        variantLabel: variant?.label ?? screen.defaultVariantId,
        variantCount: screen.variants.length,
      };
    }),
  }));
}

export function screensLine(sequential: boolean, labels: string[]): string {
  return labels.join(sequential ? " → " : " · ");
}

export function canvasPath(prototypeId: string, slug: string): string {
  return `/workbench/prototypes/${prototypeId}/screens/${slug}`;
}

export function prototypeStats(screens: ScreenRecord[]) {
  return {
    screens: screens.length,
    variants: screens.reduce((sum, screen) => sum + screen.variants.length, 0),
  };
}

export function formatLastEvent(entry?: LifecycleHistoryEntry): string {
  if (!entry) return "尚未流转";
  const time = new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
  }).format(new Date(entry.changedAt));
  return `${time} ${LIFECYCLE_LABELS[entry.from]} → ${LIFECYCLE_LABELS[entry.to]}`;
}

export function operationCaption(
  operation: LifecycleOperation | undefined,
  resultHeadline: string | null,
): { status: string; failure: string } {
  const failure = operation?.kind === "failed" ? operation.message : "";
  if (operation?.kind === "failed" && operation.action === "rollback") {
    return { status: "回退失败", failure };
  }
  if (operation?.kind === "rolling-back") {
    return { status: resultHeadline ?? "Evidence 清理中", failure: "" };
  }
  if (resultHeadline) return { status: resultHeadline, failure };
  return { status: "", failure: "" };
}

/** Label of the finalize entry; an unfinished finalization reopens its sheet instead of locking the button. */
export function finalizeActionLabel(
  operation: LifecycleOperation | undefined,
): string {
  if (operation?.kind !== "finalizing") return "定稿并采集";
  return operation.phase === "capturing" ||
    operation.phase === "building-prompt"
    ? "查看定稿进度"
    : "继续定稿";
}

export function rollbackActionLabel(
  operation: LifecycleOperation | undefined,
): string {
  return operation?.kind === "failed" && operation.action === "rollback"
    ? "重试回退"
    : "回退待确定";
}

export function ownersAndRoles(prototype: PrototypeRecord): string {
  const people = [
    ...(prototype.roles ?? []),
    ...(prototype.owners ?? []),
  ];
  return people.join(" / ");
}
