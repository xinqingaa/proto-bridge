import type {
  Router,
  RouteLocationNormalizedLoaded,
  LocationQueryRaw,
} from "vue-router";
import { fixedCaptureTheme } from "../capture-environment";
import { announceBackNavigation } from "../navigation-intent";
import {
  readThemePackPreference,
  concreteThemeMode,
} from "../theme-pack-preference";

type ParentRef = { url: string; parent?: ParentRef };
type NavigationState = {
  prototypeId: string;
  parent?: ParentRef;
  tab?: string;
  rootPosition?: number;
};
type Destination = { slug: string; variant?: string; query?: LocationQueryRaw };
export function prototypeNavigation(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  prototypeId: string,
  environment = {
    state: () => window.history.state as Record<string, any>,
    embedded: () => window.parent !== window,
    systemMode: () =>
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? ("dark" as const)
        : ("light" as const),
  },
) {
  const prefix = `/prototype/${prototypeId}/`;
  const state = (): NavigationState =>
    environment.state()?.pbPrototype?.prototypeId === prototypeId
      ? environment.state().pbPrototype
      : { prototypeId };
  const theme = () => {
    const fixed = fixedCaptureTheme(prototypeId);
    if (fixed) return { theme: fixed.theme, mode: fixed.mode };
    const preference = readThemePackPreference(prototypeId);
    return {
      theme:
        preference?.theme ??
        (typeof route.query.theme === "string" ? route.query.theme : "default"),
      mode: preference
        ? concreteThemeMode(preference.mode, environment.systemMode())
        : typeof route.query.mode === "string"
          ? route.query.mode
          : "light",
    };
  };
  const location = (to: Destination) => ({
    path: prefix + to.slug,
    query: { ...to.query, variant: to.variant ?? "default", ...theme() },
  });
  const stamp = (url: string) => {
    const resolved = router.resolve(url);
    return { path: resolved.path, query: { ...resolved.query, ...theme() } };
  };
  return {
    path: location,
    async enter(to: Destination, targetHome?: string) {
      let current = state();
      let parentUrl = route.fullPath;
      // Cross-tab stack entry first normalizes its parent to the destination root.
      if (targetHome && current.tab && current.tab !== targetHome) {
        await router.replace({
          ...location({ slug: targetHome }),
          state: { pbPrototype: { prototypeId, tab: targetHome } },
        });
        current = state();
        parentUrl = router.currentRoute.value.fullPath;
      }
      const parent = {
        url: parentUrl,
        ...(current.parent ? { parent: current.parent } : {}),
      };
      return router.push({
        ...location(to),
        state: { pbPrototype: { ...current, parent } },
      });
    },
    replace(to: Destination) {
      return router.replace({
        ...location(to),
        state: { pbPrototype: state() },
      });
    },
    variant(variant: string) {
      return router.replace({
        query: { ...route.query, variant, ...theme() },
        state: { pbPrototype: state() },
      });
    },
    tab(slug: string) {
      return router.replace({
        ...location({ slug }),
        state: {
          pbPrototype: {
            prototypeId,
            tab: slug,
            rootPosition: environment.state()?.position,
          },
        },
      });
    },
    back(fallback: Destination) {
      const current = state();
      const parent = current.parent;
      if (parent?.url.startsWith(prefix)) {
        if (
          !environment.embedded() &&
          Number(environment.state()?.position) > 0
        ) {
          router.back();
          return;
        }
        announceBackNavigation();
        return router.replace({
          ...stamp(parent.url),
          state: { pbPrototype: { ...current, parent: parent.parent } },
        });
      }
      announceBackNavigation();
      return router.replace({
        ...location(fallback),
        state: { pbPrototype: { prototypeId, tab: current.tab } },
      });
    },
    home(slug: string) {
      return router.replace({
        ...location({ slug }),
        state: { pbPrototype: { prototypeId, tab: slug } },
      });
    },
  };
}
