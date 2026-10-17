import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
type Slug = "exception-queue" | "shipment-detail" | "resolution-form";
export function coldChainPath(
  route: RouteLocationNormalizedLoaded,
  slug: Slug,
  variant = "default",
  shipment = "SH-2048",
) {
  return {
    path: `/prototype/cold-chain-ops/${slug}`,
    query: {
      variant,
      theme:
        typeof route.query.theme === "string" ? route.query.theme : "default",
      mode: typeof route.query.mode === "string" ? route.query.mode : "light",
      shipment,
    },
  };
}
export function openColdChainScreen(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  slug: Slug,
  variant = "default",
  shipment = "SH-2048",
) {
  return prototypeNavigation(router, route, "cold-chain-ops").enter({
    slug,
    variant,
    query: { shipment },
  });
}
export function replaceColdChainVariant(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  variant: string,
) {
  return prototypeNavigation(router, route, "cold-chain-ops").variant(variant);
}
