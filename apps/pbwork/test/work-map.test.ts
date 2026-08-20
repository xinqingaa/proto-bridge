import { describe, expect, it } from "vitest";
import { loadPrototypeScreens, loadPrototypes } from "@/design-system/loaders";
import {
  formatLastEvent,
  operationCaption,
  prototypeChapters,
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
});
