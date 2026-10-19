import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
import { writeThemePackPreference } from "@/runtime/theme-pack-preference";
import { focusVariant } from "./session";
import type { YikeFace, YikeStore } from "./model";

/** Product destinations only; routing/history/parent semantics remain shared. */
export function yikeNavigation(
  router: Router,
  route: RouteLocationNormalizedLoaded,
  store: YikeStore,
) {
  const navigation = prototypeNavigation(router, route, "yike");
  return {
    async tab(slug: "focus" | "checkin" | "review") {
      await navigation.tab(slug);
      if (slug === "focus")
        await prototypeNavigation(
          router,
          router.currentRoute.value,
          "yike",
        ).variant(focusVariant(store));
    },
    settings() {
      return navigation.enter({ slug: "settings" });
    },
    habit(id: string) {
      return navigation.enter(
        { slug: "habit-detail", query: { habit: id } },
        "checkin",
      );
    },
    editor(id?: string) {
      return navigation.enter({
        slug: "habit-editor",
        query: id ? { habit: id } : {},
      });
    },
    editorBack(id?: string) {
      return navigation.back(
        id
          ? { slug: "habit-detail", query: { habit: id } }
          : { slug: "checkin" },
      );
    },
    editorSaved(id: string, editing: boolean) {
      return editing
        ? navigation.back({ slug: "habit-detail", query: { habit: id } })
        : navigation.home("checkin");
    },
    home(slug: "focus" | "checkin") {
      return navigation.home(slug);
    },
    back(home: "focus" | "checkin" = "checkin") {
      return navigation.back({
        slug: home,
        variant: home === "focus" ? focusVariant(store) : "default",
      });
    },
    variant() {
      return navigation.variant(focusVariant(store));
    },
    theme(face: YikeFace, mode: "system" | "light" | "dark") {
      if (!store.updatePreferences({ face, mode })) return false;
      writeThemePackPreference("yike", { theme: face, mode });
      return true;
    },
  };
}
