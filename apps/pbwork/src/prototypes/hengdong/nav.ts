import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import { announceBackNavigation } from "@/runtime/navigation-intent";

export type HengdongSlug =
  | "login"
  | "register"
  | "today"
  | "activity-history"
  | "plans"
  | "progress"
  | "plan-detail"
  | "workout-session"
  | "workout-complete"
  | "settings-goals";

export type RootTab = "today" | "plans" | "progress";

function themeOf(route: RouteLocationNormalizedLoaded) {
  return route.query.theme === "dark" ? "dark" : "light";
}

export function hengdongPath(
  route: RouteLocationNormalizedLoaded,
  slug: HengdongSlug,
  variant = "default",
  extra: Record<string, string> = {},
) {
  return {
    path: `/prototype/hengdong/${slug}`,
    query: { variant, theme: themeOf(route), ...extra },
  };
}

export function openHengdongScreen(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  slug: HengdongSlug,
  variant = "default",
  extra: Record<string, string> = {},
) {
  return router.push({
    ...hengdongPath(route, slug, variant, extra),
    state: {
      pbScope: "hengdong",
      pbParent: route.fullPath,
      pbTab: rootForSlug(slug),
    },
  });
}

export function replaceHengdongScreen(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  slug: HengdongSlug,
  variant = "default",
  extra: Record<string, string> = {},
) {
  return router.replace(hengdongPath(route, slug, variant, extra));
}

export function rootForSlug(slug: HengdongSlug): RootTab {
  if (["plans", "plan-detail"].includes(slug)) return "plans";
  if (slug === "progress") return "progress";
  return "today";
}

export function goBackHengdong(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  fallback: RootTab,
) {
  const parent = window.history.state?.pbParent;
  if (typeof parent === "string" && parent.startsWith("/prototype/hengdong/")) {
    announceBackNavigation();
    return router.replace(parent);
  }
  const scope = window.history.state?.pbScope;
  const position = Number(window.history.state?.position ?? 0);
  if (scope === "hengdong" && position > 0 && window.parent === window) {
    return router.back();
  }
  announceBackNavigation();
  return router.replace(hengdongPath(route, fallback));
}

export function replaceVariant(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  variant: string,
  extra: Record<string, string> = {},
) {
  return router.replace({
    query: { ...route.query, variant, ...extra },
  });
}
