import { describe, expect, it } from "vitest";
import { presentRiskChecklist, presentWarning, speakEvidenceMessage } from "@/capture/review-copy";

describe("review copy", () => {
  it("turns a shell warning into a screen the reviewer can recognize", () => {
    const check = presentWarning({
      warningId: "reconstruction-shell-hengdong.today-0",
      code: "reconstruction.shell-contract-missing",
      message:
        "Strict Screen hengdong.today must declare shellFragments or explicitly mark every Variant shellPolicy=replace before high-fidelity delivery.",
      source: { kind: "registry", screenId: "hengdong.today" },
    });
    expect(check.title).not.toMatch(/Strict Screen|shellFragments/);
    expect(check.technical).toContain("shellFragments");
    expect(check.body).toContain("截图");
  });

  it("groups repeated risks by kind and names the page instead of the revision", () => {
    const checks = presentRiskChecklist(
      [
        {
          kind: "required-unknown",
          message: "6 facts remain unknown in revision-2026-09-26t032646530-8f6d3cba.",
          refs: ["a", "b"],
        },
        {
          kind: "required-unknown",
          message: "2 facts remain unknown in revision-2026-09-26t032632053-fc0d1a3c.",
          refs: ["c"],
        },
        {
          kind: "reconstruction-readiness",
          message: "High-fidelity structure contract is incomplete in revision-2026-09-26t032646530-8f6d3cba.",
          refs: ["revision-2026-09-26t032646530-8f6d3cba:missing-shell-contract"],
        },
      ],
      (revisionId) =>
        revisionId.endsWith("8f6d3cba") ? "今日 · 默认" : "运动 · 进行中",
    );
    expect(checks).toHaveLength(2);
    expect(checks[0]).toMatchObject({
      id: "required-unknown",
      lines: ["今日 · 默认：6 项必填信息没读到", "运动 · 进行中：2 项必填信息没读到"],
    });
    expect(checks[1]?.lines[0]).toBe("今日 · 默认的页面结构约定不完整");
    expect(checks[1]?.technical).toContain("High-fidelity");
  });

  it("replaces evidence jargon in the result summary", () => {
    expect(speakEvidenceMessage("12 个事实仍为 unknown。")).toContain("未能确认");
    expect(speakEvidenceMessage("所选 Evidence 已完整解析，可继续创建 Handoff。")).toBe(
      "这次页面事实都已读出。",
    );
  });
});
