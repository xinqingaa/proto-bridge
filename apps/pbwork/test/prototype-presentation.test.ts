import { describe, expect, it } from "vitest";
import {
  atmosphereStyle,
  prototypeShortLabel,
  prototypeSummary,
} from "@/workbench/prototypes/prototypePresentation";

describe("prototype presentation", () => {
  it("uses product short names and summaries instead of first characters", () => {
    expect(
      prototypeShortLabel({ id: "hengdong", label: "恒动 · 健身自律记录" }),
    ).toBe("恒动");
    expect(
      prototypeShortLabel({ id: "cold-chain-ops", label: "冷链异常处置台" }),
    ).toBe("冷链");
    expect(prototypeSummary({ id: "hengdong" })).toBe("健身自律");
    expect(prototypeSummary({ id: "cold-chain-ops" })).toBe("冷链值守");
  });

  it("gives each known prototype a distinct stage atmosphere", () => {
    const hengdong = atmosphereStyle("hengdong");
    const coldChain = atmosphereStyle("cold-chain-ops");
    expect(hengdong["--stage-ground"]).not.toBe(coldChain["--stage-ground"]);
    expect(hengdong["--stage-glow"]).not.toBe(coldChain["--stage-glow"]);
  });
});
