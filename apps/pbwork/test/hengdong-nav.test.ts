import { describe, expect, it } from "vitest";
import {
  ownedHengdongVariant,
  ownsHengdongHome,
  rootForSlug,
} from "@/prototypes/hengdong/nav";

function route(slug: string, variant?: string) {
  return {
    params: { screenSlug: slug },
    query: variant ? { variant } : {},
  };
}

describe("Hengdong shared tab root", () => {
  it("keeps today, plans, and progress as sibling homes", () => {
    expect(rootForSlug("today")).toBe("today");
    expect(rootForSlug("plans")).toBe("plans");
    expect(rootForSlug("progress")).toBe("progress");
    expect(rootForSlug("activity-history")).toBe("today");
    expect(rootForSlug("plan-detail")).toBe("plans");
  });

  it("lets only the active home consume the URL variant", () => {
    expect(ownsHengdongHome(route("today"), "today")).toBe(true);
    expect(ownsHengdongHome(route("plans"), "today")).toBe(false);
    expect(ownedHengdongVariant(route("progress", "filter-open"), "progress")).toBe(
      "filter-open",
    );
    expect(ownedHengdongVariant(route("progress", "filter-open"), "today")).toBe(
      "default",
    );
    expect(ownedHengdongVariant(route("today"), "today")).toBe("default");
  });
});
