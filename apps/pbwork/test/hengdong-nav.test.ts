import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import {
  goBackHengdong,
  ownedHengdongVariant,
  ownsHengdongHome,
  rootForSlug,
} from "@/prototypes/hengdong/nav";
import { writeRuntimeThemePreference } from "@/runtime/theme-preference";

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

describe("goBackHengdong", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("restores pbParent with the current theme instead of the frozen query", () => {
    writeRuntimeThemePreference("dark");
    window.history.replaceState(
      {
        pbParent: "/prototype/hengdong/today?variant=default&theme=light",
        pbScope: "hengdong",
      },
      "",
    );
    const replace = vi.fn();
    goBackHengdong(
      { replace, back: vi.fn() } as unknown as Router,
      {
        query: { variant: "default", theme: "dark" },
        fullPath:
          "/prototype/hengdong/settings-goals?variant=default&theme=dark",
        params: { screenSlug: "settings-goals" },
      } as unknown as RouteLocationNormalizedLoaded,
      "today",
    );
    expect(replace).toHaveBeenCalledWith(
      "/prototype/hengdong/today?variant=default&theme=dark",
    );
  });
});
