import { describe, expect, it } from "vitest";
import {
  buildCaptureHistoryNavigationNodes,
  buildPrototypeTree,
  buildWorkbenchNavigationTree,
  countPrototypesForLifecycle,
  findCaptureJobIdForEvidenceRoute,
} from "@/workbench/navigation";
import { buildComponentsNavigation } from "@/workbench/navigation";

describe("workbench navigation tree", () => {
  it("keeps the four tab layers consecutive in the navigation group", () => {
    const labels = buildComponentsNavigation()
      .filter((item) => item.group === "导航组件")
      .map((item) => item.label);
    expect(labels.slice(0, 4)).toEqual([
      "Tabbar",
      "一级 Tab",
      "二级 Tab",
      "三级 Tab（局部 Filter Bar）",
    ]);
    expect(labels[4]).toBe("Tab Viewport");
    expect(labels[5]).toBe("页面转场");
  });
  it("builds nested resource counts without lifecycle rows", () => {
    const tree = buildWorkbenchNavigationTree();
    const prototypes = tree.find((node) => node.id === "prototypes")!;
    const components = tree.find((node) => node.id === "components")!;
    const drafts = tree.find((node) => node.id === "drafts")!;
    const capture = tree.find((node) => node.id === "capture")!;
    const coldChain = prototypes.children?.find(
      (node) => node.id === "prototype-cold-chain-ops",
    );
    const exceptionQueue = coldChain?.children?.find(
      (node) => node.id === "screen-cold-chain-ops.exception-queue",
    );

    expect(prototypes.count).toBe(2);
    expect(components.children).toHaveLength(6);
    expect(drafts.children).toEqual([
      {
        id: "draft-hengdong",
        label: "恒动 · 健身自律记录",
        kind: "draft",
        to: "/workbench/drafts/hengdong",
      },
    ]);
    expect(prototypes.children?.some((node) => node.kind === "lifecycle")).toBe(
      false,
    );
    expect(coldChain?.count).toBe(3);
    expect(exceptionQueue?.children).toBeUndefined();
    expect(exceptionQueue?.count).toBeUndefined();
    expect(capture.children?.[0]).toMatchObject({
      id: "capture-console",
      label: "采集历史",
      to: "/workbench/capture",
    });
    expect(capture.label).toBe("采集");
  });

  it("lists Screens without Variant children so the sidebar stays a page map", () => {
    const compactTree = buildPrototypeTree("all");
    const compactToday = compactTree
      .find((node) => node.id === "hengdong")
      ?.children?.find((node) => node.id === "hengdong.today");
    expect(compactToday?.children).toBeUndefined();
    expect(compactToday?.to).toBe(
      "/workbench/prototypes/hengdong/screens/today",
    );

    const workbenchTree = buildWorkbenchNavigationTree();
    const today = workbenchTree
      .find((node) => node.id === "prototypes")
      ?.children?.find((node) => node.id === "prototype-hengdong")
      ?.children?.find((node) => node.id === "screen-hengdong.today");
    expect(today?.children).toBeUndefined();
    expect(today?.to).toBe("/workbench/prototypes/hengdong/screens/today");
  });

  it("nests capture jobs under 采集历史 and selects by evidence route", () => {
    const presentations = [
      {
        job: { jobId: "job-old", acceptedAt: "2026-08-01T10:00:00.000Z" },
        prototypeLabel: "冷链",
        scopeLabel: "异常队列",
        resultPath: "/workbench/evidence/bundle-a/snap-old",
      },
      {
        job: { jobId: "job-new", acceptedAt: "2026-08-08T12:00:00.000Z" },
        prototypeLabel: "冷链",
        scopeLabel: "整原型",
        resultPath: "/workbench/evidence/bundle-b/snap-new",
      },
      {
        job: { jobId: "job-running", acceptedAt: "2026-08-08T13:00:00.000Z" },
        prototypeLabel: "冷链",
        scopeLabel: "控件范围",
      },
    ];
    const nodes = buildCaptureHistoryNavigationNodes(presentations);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: "capture-console",
      label: "采集历史",
      kind: "group",
      to: "/workbench/capture",
      count: 3,
    });
    expect(nodes[0]?.children?.map((item) => item.id)).toEqual([
      "capture-job-job-running",
      "capture-job-job-new",
      "capture-job-job-old",
    ]);
    expect(nodes[0]?.children?.[1]).toMatchObject({
      id: "capture-job-job-new",
      label: "冷链 · 整原型",
      to: "/workbench/evidence/bundle-b/snap-new",
    });
    expect(nodes[0]?.children?.[0]?.to).toBeUndefined();
    expect(
      findCaptureJobIdForEvidenceRoute(presentations, "bundle-b", "snap-new"),
    ).toBe("capture-job-job-new");
    expect(
      findCaptureJobIdForEvidenceRoute(presentations, "missing", "snap"),
    ).toBeNull();
  });

  it("filters prototypes by lifecycle and counts overrides", () => {
    const effective = (
      id: string,
      registered: "active" | "review" | "final" | "archived",
    ) => (id === "cold-chain-ops" ? ("review" as const) : registered);

    expect(countPrototypesForLifecycle("active", effective)).toBe(0);
    expect(countPrototypesForLifecycle("review", effective)).toBe(2);

    const activeTree = buildWorkbenchNavigationTree(effective, "active");
    const reviewTree = buildWorkbenchNavigationTree(effective, "review");
    const activePrototypes = activeTree.find(
      (node) => node.id === "prototypes",
    );
    const reviewPrototypes = reviewTree.find(
      (node) => node.id === "prototypes",
    );

    expect(activePrototypes?.children?.map((node) => node.id)).toEqual([]);
    expect(reviewPrototypes?.children?.map((node) => node.id)).toEqual([
      "prototype-cold-chain-ops",
      "prototype-hengdong",
    ]);
  });
});
