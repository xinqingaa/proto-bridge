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

type LedgerHistoryState = {
  pbScope?: "ledger-planet";
  pbEntryId?: string;
  pbTab?: LedgerTab;
  pbParent?: string;
  pbRootPosition?: number;
};

function currentState(): LedgerHistoryState & { position?: number } {
  return (window.history.state ?? {}) as LedgerHistoryState & {
    position?: number;
  };
}

function isEmbeddedRuntime() {
  return typeof window !== "undefined" && window.parent !== window;
}

function entryState(tab: LedgerTab, parent?: string): LedgerHistoryState {
  const state = currentState();
  const position = Number(state.position ?? 0);
  return {
    pbScope: "ledger-planet",
    pbEntryId: crypto.randomUUID(),
    pbTab: tab,
    ...(parent ? { pbParent: parent } : {}),
    pbRootPosition:
      state.pbScope === "ledger-planet" &&
      typeof state.pbRootPosition === "number"
        ? state.pbRootPosition
        : position,
  };
}

function routeTarget(target: string, state: LedgerHistoryState) {
  const [path, search = ""] = target.split("?");
  return {
    path: path!,
    query: Object.fromEntries(new URLSearchParams(search)),
    state,
  };
}

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
  const params = new URLSearchParams({
    variant,
    theme: themeQuery(route),
    ...extraQuery,
  });
  return `/prototype/ledger-planet/${slug}?${params.toString()}`;
}

export async function ensureRootEntry(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  tab: LedgerTab,
) {
  const state = currentState();
  if (state.pbScope === "ledger-planet" && state.pbTab === tab) return;
  const position = Number(state.position ?? 0);
  await router.replace({
    path: route.path,
    query: route.query,
    state: {
      pbScope: "ledger-planet",
      pbEntryId: crypto.randomUUID(),
      pbTab: tab,
      pbRootPosition: position,
    },
  });
}

export async function switchTab(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  tab: LedgerTab,
) {
  await router.replace(
    routeTarget(runtimePath(TAB_HOME[tab], route), entryState(tab)),
  );
}

export async function pushStack(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  tab: LedgerTab,
  slug: string,
  opts?: { variant?: string; query?: Record<string, string> },
) {
  let parent = route.fullPath;
  const currentHomeTab = HOME_TAB[String(route.params.screenSlug ?? "")];
  if (currentHomeTab && currentHomeTab !== tab) {
    parent = runtimePath(TAB_HOME[tab], route);
    await router.replace(routeTarget(parent, entryState(tab)));
  }
  await router.push(
    routeTarget(
      runtimePath(slug, route, opts?.variant ?? "default", opts?.query),
      entryState(tab, parent),
    ),
  );
}

export async function replaceScreen(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  tab: LedgerTab,
  slug: string,
  opts?: { variant?: string; query?: Record<string, string> },
) {
  await router.replace(
    routeTarget(
      runtimePath(slug, route, opts?.variant ?? "default", opts?.query),
      entryState(tab, currentState().pbParent),
    ),
  );
}

export async function goBack(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  fallbackSlug: string,
) {
  const state = currentState();
  if (state.pbScope === "ledger-planet" && state.pbParent) {
    if (isEmbeddedRuntime()) {
      const fallbackTab = state.pbTab ?? HOME_TAB[fallbackSlug] ?? "记账";
      await router.replace(
        routeTarget(state.pbParent, entryState(fallbackTab)),
      );
      return;
    }
    router.back();
    return;
  }
  const fallbackTab = HOME_TAB[fallbackSlug] ?? state.pbTab ?? "记账";
  await router.replace(
    routeTarget(runtimePath(fallbackSlug, route), entryState(fallbackTab)),
  );
}

export async function finishToHome(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  homeSlug: string,
  opts?: {
    variant?: string;
    query?: Record<string, string>;
    preferBack?: boolean;
  },
) {
  const state = currentState();
  const position = Number(state.position ?? 0);
  const rootPosition = state.pbRootPosition;
  if (
    !isEmbeddedRuntime() &&
    opts?.preferBack !== false &&
    state.pbScope === "ledger-planet" &&
    typeof rootPosition === "number" &&
    position > rootPosition
  ) {
    router.go(rootPosition - position);
    return;
  }
  const tab = HOME_TAB[homeSlug] ?? state.pbTab ?? "记账";
  await router.replace(
    routeTarget(
      runtimePath(homeSlug, route, opts?.variant ?? "default", opts?.query),
      entryState(tab),
    ),
  );
}
