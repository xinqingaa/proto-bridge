import { describe, expect, it } from "vitest";
import type { EvidenceSemanticRegionReadModel } from "@proto-bridge/core/v2/evidence-read-model";
import { structureOutline } from "@/capture/structure-outline";

function region(
  pbId: string,
  role: string,
  order: number,
  extra: Partial<EvidenceSemanticRegionReadModel> = {},
): EvidenceSemanticRegionReadModel {
  return {
    regionId: `s.${pbId}`,
    identity: { screenId: "s", pbId },
    label: pbId,
    role,
    documentOrder: order,
    firstSourceIndex: order,
    sourceFactIds: [],
    facts: [],
    ...extra,
  };
}

describe("structure outline", () => {
  it("nests regions, names only leaves, and folds same-box wrappers", () => {
    const rows = structureOutline([
      region("root", "page", 0, {
        text: "活动记录 2026 年 8 月 全部 训练 步行",
        bbox: { x: 0, y: 0, width: 390, height: 844 },
      }),
      region("bar", "app-bar", 1, {
        componentId: "app-bar",
        semanticParent: { screenId: "s", pbId: "root" },
        text: "活动记录 2026 年 8 月",
      }),
      region("month-wrap", "section", 2, {
        semanticParent: { screenId: "s", pbId: "bar" },
        bbox: { x: 300, y: 10, width: 70, height: 30 },
      }),
      region("month", "button", 3, {
        componentId: "button",
        semanticParent: { screenId: "s", pbId: "month-wrap" },
        text: "2026 年 8 月",
        bbox: { x: 300, y: 10, width: 70, height: 30 },
      }),
    ]);
    expect(rows.map((row) => [row.regionId, row.depth])).toEqual([
      ["s.root", 0],
      ["s.bar", 1],
      ["s.month", 2],
    ]);
    expect(rows[0]).toMatchObject({ role: "页面", childCount: 1 });
    expect(rows[0]?.name).toBeUndefined();
    expect(rows[1]?.component).toBeUndefined();
    expect(rows[2]).toMatchObject({ role: "按钮", name: "2026 年 8 月" });
  });
});
