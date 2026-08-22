import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import { announceBackNavigation } from "@/runtime/navigation-intent";
import {
  readRuntimeThemePreference,
  stampThemeOnHref,
} from "@/runtime/theme-preference";

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

function currentTheme(route: RouteLocationNormalizedLoaded) {
  const preferred = readRuntimeThemePreference();
  return preferred === "dark" || preferred === "light"
    ? preferred
    : themeOf(route);
}

function hengdongHistoryState() {
  const state = window.history.state;
  const next: Record<string, string> = {};
  if (typeof state?.pbScope === "string") next.pbScope = state.pbScope;
  if (typeof state?.pbParent === "string") next.pbParent = state.pbParent;
  if (typeof state?.pbTab === "string") next.pbTab = state.pbTab;
  return next;
}

export function hengdongPath(
  route: RouteLocationNormalizedLoaded,
  slug: HengdongSlug,
  variant = "default",
  extra: Record<string, string> = {},
) {
  return {
    path: `/prototype/hengdong/${slug}`,
    query: { variant, theme: currentTheme(route), ...extra },
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
  return router.replace({
    ...hengdongPath(route, slug, variant, extra),
    state: {
      pbScope: "hengdong",
      pbTab: rootForSlug(slug),
    },
  });
}

export function rootForSlug(slug: HengdongSlug): RootTab {
  if (["plans", "plan-detail"].includes(slug)) return "plans";
  if (slug === "progress") return "progress";
  return "today";
}

export function ownsHengdongHome(
  route: Pick<RouteLocationNormalizedLoaded, "params">,
  home: RootTab,
) {
  return String(route.params.screenSlug) === home;
}

export function ownedHengdongVariant(
  route: Pick<RouteLocationNormalizedLoaded, "params" | "query">,
  home: RootTab,
) {
  if (!ownsHengdongHome(route, home)) return "default";
  return String(route.query.variant ?? "default");
}

export function goBackHengdong(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  fallback: RootTab,
) {
  const parent = window.history.state?.pbParent;
  if (typeof parent === "string" && parent.startsWith("/prototype/hengdong/")) {
    announceBackNavigation();
    return router.replace(stampThemeOnHref(parent, currentTheme(route)));
  }
  const scope = window.history.state?.pbScope;
  const position = Number(window.history.state?.position ?? 0);
  if (scope === "hengdong" && position > 0 && window.parent === window) {
    return router.back();
  }
  announceBackNavigation();
  return router.replace(hengdongPath(route, fallback));
}

export function replaceHengdongTheme(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  theme: "light" | "dark",
) {
  return router.replace({
    query: { ...route.query, theme },
    state: hengdongHistoryState(),
  });
}

export function replaceVariant(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  variant: string,
  extra: Record<string, string> = {},
) {
  return router.replace({
    query: { ...route.query, variant, ...extra },
    state: hengdongHistoryState(),
  });
}
