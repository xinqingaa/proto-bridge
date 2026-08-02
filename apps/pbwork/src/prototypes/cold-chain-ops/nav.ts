import type { RouteLocationNormalizedLoaded, Router } from "vue-router";

function themeOf(route: RouteLocationNormalizedLoaded) {
  return typeof route.query.theme === "string" ? route.query.theme : "light";
}

export function coldChainPath(
  route: RouteLocationNormalizedLoaded,
  slug: "exception-queue" | "shipment-detail" | "resolution-form",
  variant = "default",
  shipment = "SH-2048",
) {
  return {
    path: `/prototype/cold-chain-ops/${slug}`,
    query: { variant, theme: themeOf(route), shipment },
  };
}

export function openColdChainScreen(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  slug: "exception-queue" | "shipment-detail" | "resolution-form",
  variant = "default",
  shipment = "SH-2048",
) {
  return router.push(coldChainPath(route, slug, variant, shipment));
}

export function replaceColdChainVariant(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  variant: string,
) {
  return router.replace({ query: { ...route.query, variant } });
}
