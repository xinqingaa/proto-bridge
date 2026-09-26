import { describe, expect, it } from "vitest";
import { loadPrototypeScreens, loadPrototypes } from "@/design-system/loaders";
import {
  finalizeActionLabel,
  formatLastEvent,
  operationCaption,
  prototypeChapters,
  rollbackActionLabel,
  screensLine,
} from "@/workbench/prototypes/workMap";

describe("prototype work map", () => {
  it("treats cold-chain exception screens as a sequence", () => {
    const prototype = loadPrototypes().find(
      (item) => item.id === "cold-chain-ops",
    )!;
    const screens = loadPrototypeScreens().filter(
      (item) => item.prototypeId === "cold-chain-ops",
    );
    const chapters = prototypeChapters(screens, prototype.screenGroups ?? []);
    expect(chapters[0]?.sequential).toBe(true);
    expect(
      screensLine(
        true,
        chapters[0]?.screens.map((screen) => screen.label) ?? [],
      ),
    ).toContain("→");
  });

  it("treats hengdong root tabs as parallel destinations", () => {
    const prototype = loadPrototypes().find((item) => item.id === "hengdong")!;
    const screens = loadPrototypeScreens().filter(
      (item) => item.prototypeId === "hengdong",
    );
    const tabs = prototypeChapters(
      screens,
      prototype.screenGroups ?? [],
    ).find((chapter) => chapter.id === "root-tabs");
    expect(tabs?.sequential).toBe(false);
    expect(
      screensLine(
        false,
        tabs?.screens.map((screen) => screen.label) ?? [],
      ),
    ).toContain("·");
  });

  it("summarizes the latest lifecycle event", () => {
    expect(formatLastEvent()).toBe("尚未流转");
    expect(
      formatLastEvent({
        id: "1",
        prototypeId: "cold-chain-ops",
        from: "active",
        to: "review",
        note: "",
        changedAt: "2026-08-20T04:00:00.000Z",
      }),
    ).toMatch(/进行中 → 待确定/);
  });

  it("keeps finalized artifact copy for the catalog room", () => {
    expect(operationCaption({ kind: "idle" }, false)).toEqual({
      status: "",
      failure: "",
    });
    expect(operationCaption({ kind: "idle" }, true)).toEqual({
      status: "Evidence + 提示词",
      failure: "",
    });
    expect(
      operationCaption(
        {
          kind: "failed",
          action: "finalize",
          message: "采集失败",
          failedAt: "2026-08-20T04:00:00.000Z",
        },
        false,
      ),
    ).toEqual({ status: "定稿失败", failure: "采集失败" });
  });

  it("lets an unfinished finalization reopen its sheet", () => {
    const startedAt = "2026-08-20T04:00:00.000Z";
    const operationKey = "00000000-0000-4000-8000-000000000001";
    const confirmation = {
      kind: "finalizing" as const,
      operationKey,
      startedAt,
      acceptedWarningIds: [],
      acknowledgedRiskKinds: [],
    };
    expect(finalizeActionLabel({ kind: "idle" })).toBe("定稿并采集");
    expect(
      finalizeActionLabel({
        ...confirmation,
        phase: "awaiting-confirmation",
      }),
    ).toBe("继续定稿");
    expect(
      finalizeActionLabel({ ...confirmation, phase: "capturing" }),
    ).toBe("查看定稿进度");
    expect(
      operationCaption(
        { ...confirmation, phase: "awaiting-risks" },
        false,
      ).status,
    ).toBe("等待你确认风险");
  });

  it("offers a rollback retry when Service persisted a rollback failure", () => {
    expect(rollbackActionLabel({ kind: "idle" })).toBe("回退待确定");
    expect(
      rollbackActionLabel({
        kind: "failed",
        action: "rollback",
        message: "Bundle 清理失败。",
        failedAt: "2026-08-20T04:00:00.000Z",
      }),
    ).toBe("重试回退");
    expect(
      operationCaption(
        {
          kind: "failed",
          action: "rollback",
          message: "Bundle 清理失败。",
          failedAt: "2026-08-20T04:00:00.000Z",
        },
        true,
      ).status,
    ).toBe("回退失败");
  });
});
