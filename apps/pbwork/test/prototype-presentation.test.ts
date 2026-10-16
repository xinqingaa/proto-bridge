import { describe, expect, it } from "vitest";
import {
  atmosphereStyle,
  prototypeShortLabel,
  prototypeSummary,
} from "@/workbench/prototypes/prototypePresentation";

describe("prototype presentation", () => {
  it("uses product short names and summaries instead of first characters", () => {
    expect(
      prototypeShortLabel({ id: "cold-chain-ops", label: "冷链异常处置台" }),
    ).toBe("冷链");
    expect(prototypeSummary({ id: "cold-chain-ops" })).toBe("冷链值守");
  });

  it("gives a known prototype its own stage atmosphere distinct from the fallback", () => {
    const coldChain = atmosphereStyle("cold-chain-ops");
    const fallback = atmosphereStyle("unregistered-prototype");
    expect(coldChain["--stage-ground"]).not.toBe(fallback["--stage-ground"]);
    expect(coldChain["--stage-glow"]).not.toBe(fallback["--stage-glow"]);
  });

  it("falls back to the label prefix and first role for unknown prototypes", () => {
    expect(
      prototypeShortLabel({ id: "unknown", label: "示例 · 副标题" }),
    ).toBe("示例");
    expect(prototypeSummary({ id: "unknown", roles: ["值守专员"] })).toBe(
      "值守专员",
    );
  });
});
