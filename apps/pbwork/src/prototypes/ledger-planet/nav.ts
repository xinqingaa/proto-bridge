import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import type { LedgerTab } from "./LedgerPlanetShell.vue";
import { getTheme } from "./theme-session";

export const TAB_HOME: Record<LedgerTab, string> = {
  记账: "ledger-home",
  权益: "benefits-home",
  我的: "me-home",
};

export const HOME_TAB: Record<string, LedgerTab> = {
  "ledger-home": "记账",
  "benefits-home": "权益",
  "me-home": "我的",
};

export function themeQuery(
  route: RouteLocationNormalizedLoaded,
): "light" | "dark" {
  return getTheme(
    typeof route.query.theme === "string" ? route.query.theme : undefined,
  );
}

export function runtimePath(
  slug: string,
  route: RouteLocationNormalizedLoaded,
  variant = "default",
  extraQuery?: Record<string, string>,
) {
  const theme = themeQuery(route);
  const params = new URLSearchParams({
    variant,
    theme,
    ...extraQuery,
  });
  return `/prototype/ledger-planet/${slug}?${params.toString()}`;
}

/**
 * Enter a stack screen from a primary tab.
 * Replaces the URL onto the tab's home first so history.back() restores the correct tab.
 */
export async function pushStack(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  tab: LedgerTab,
  slug: string,
  opts?: { variant?: string; query?: Record<string, string> },
) {
  const home = TAB_HOME[tab];
  const variant = opts?.variant ?? "default";

  if (route.params.screenSlug !== home) {
    await router.replace(runtimePath(home, route, "default"));
  }

  await router.push(runtimePath(slug, route, variant, opts?.query));
}

/** Finish a flow without leaving a duplicate home under the previous stack page. */
export async function finishToHome(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  homeSlug: string,
  opts?: { variant?: string; query?: Record<string, string>; preferBack?: boolean },
) {
  if (opts?.preferBack !== false) {
    const position = Number(window.history.state?.position ?? 0);
    if (position > 0) {
      router.back();
      return;
    }
  }
  await router.replace(
    runtimePath(homeSlug, route, opts?.variant ?? "default", opts?.query),
  );
}
