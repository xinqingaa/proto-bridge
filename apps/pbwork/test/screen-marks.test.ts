import { describe, expect, it } from "vitest";
import {
  cssViewportForScreenshot,
  marksForBoxes,
} from "@/capture/screen-marks";

describe("screen marks", () => {
  it("reads CSS boxes against a 3x screenshot of the same viewport", () => {
    const viewport = cssViewportForScreenshot(1170, 2532, [
      { x: 24, y: 80, width: 342, height: 48 },
      { x: 24, y: 160, width: 342, height: 48 },
    ]);
    expect(viewport).toEqual({ width: 390, height: 844 });
    const marks = marksForBoxes(
      [
        { id: "root", label: "整页", x: 0, y: 0, width: 390, height: 844 },
        { id: "title", label: "标题", x: 24, y: 80, width: 342, height: 48 },
        { id: "off", label: "滚出", x: 0, y: 900, width: 100, height: 40 },
      ],
      viewport,
    );
    expect(marks.map((mark) => mark.id)).toEqual(["title"]);
    expect(marks[0]?.left).toBeCloseTo((24 / 390) * 100);
    expect(marks[0]?.width).toBeCloseTo((342 / 390) * 100);
  });
});
