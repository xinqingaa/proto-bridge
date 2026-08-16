import { describe, expect, it } from "vitest";
import { resolveScreenTransitionName } from "@/design-system/components/navigation/screenTransition";
import {
  announceBackNavigation,
  getRouteNavigationIntent,
  installNavigationIntentTracking,
  setRouteNavigationIntent,
} from "@/runtime/navigation-intent";

describe("resolveScreenTransitionName", () => {
  it("does not play for missing navigation or reduced motion", () => {
    expect(resolveScreenTransitionName({})).toBe("");
    expect(
      resolveScreenTransitionName({
        navigation: "push",
        reducedMotion: true,
      }),
    ).toBe("");
    expect(
      resolveScreenTransitionName({
        navigation: "replace",
        reducedMotion: true,
      }),
    ).toBe("");
  });

  it("names ios and android push/back classes; replace uses enter motion", () => {
    expect(resolveScreenTransitionName({ navigation: "push" })).toBe(
      "pb-route-ios-push",
    );
    expect(resolveScreenTransitionName({ navigation: "replace" })).toBe(
      "pb-route-ios-push",
    );
    expect(
      resolveScreenTransitionName({ mode: "ios", navigation: "back" }),
    ).toBe("pb-route-ios-back");
    expect(
      resolveScreenTransitionName({ mode: "android", navigation: "push" }),
    ).toBe("pb-route-android-push");
    expect(
      resolveScreenTransitionName({ mode: "android", navigation: "replace" }),
    ).toBe("pb-route-android-push");
    expect(
      resolveScreenTransitionName({ mode: "android", navigation: "back" }),
    ).toBe("pb-route-android-back");
  });
});

describe("announceBackNavigation", () => {
  it("keeps back across the following history.replaceState", () => {
    installNavigationIntentTracking();
    setRouteNavigationIntent("push");
    announceBackNavigation();
    window.history.replaceState({}, "", "/prototype/hengdong/today");
    expect(getRouteNavigationIntent()).toBe("back");
    window.history.replaceState({}, "", "/prototype/hengdong/plans");
    expect(getRouteNavigationIntent()).toBe("replace");
  });
});
