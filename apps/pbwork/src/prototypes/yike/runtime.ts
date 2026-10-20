import { watch, onMounted, onBeforeUnmount, type Ref } from "vue";
import { useRoute } from "vue-router";
import { useClock } from "@/runtime/useClock";
import { isForcedRuntimeNavigation } from "@/runtime/forced-navigation";
import { usePrototypeCaseReset } from "@/runtime/prototype/case";
import { useThemePackPreference } from "@/runtime/theme-pack-preference";
import { useYikeStore, type YikeFace } from "./model";
import { sharedYikeSession, focusVariant } from "./session";
import { createYikeDemo } from "./demo";

const mountedStores = new WeakSet<object>();
const presentedStores = new WeakSet<object>();
export function claimYikeColdStart(store: object) {
  if (presentedStores.has(store)) return false;
  presentedStores.add(store);
  return true;
}

/** Each active view owns a scoped clock; commands and facts survive stack views. */
export function useYikeRuntime() {
  const route = useRoute();
  const store = useYikeStore();
  const session = sharedYikeSession(store);
  const clock = useClock();
  watch(clock, (date) => session.tick(date.getTime()));
  session.tick();
  const preference = useThemePackPreference("yike");
  watch(
    preference,
    (value) => {
      if (value && ["mechanical", "water", "sundial"].includes(value.theme))
        store.updatePreferences({
          face: value.theme as YikeFace,
          mode: value.mode,
        });
    },
    { immediate: true },
  );

  function prepare() {
    store.presentation.preparing = true;
    const fixture = createYikeDemo(
      String(route.query.variant ?? "default"),
      new Date(),
    );
    fixture.preferences.face = store.data.preferences.face;
    fixture.preferences.mode = store.data.preferences.mode;
    store.prepareDemo(fixture);
    store.recoveryNeeded.value = route.query.variant === "recovery";
    store.recoveryAvailable.value = store.recoveryNeeded.value;
    session.sync();
    if (route.query.variant === "short-record") session.finish();
    if (
      route.query.variant === "countdown-setup" ||
      route.query.variant === "custom-duration"
    )
      session.mode.value = "countdown";
    if (route.query.variant === "switch-confirm")
      session.pendingMode.value = "countdown";
    if (
      route.params.screenSlug === "review" &&
      ["month", "intensity-levels", "day-detail"].includes(
        String(route.query.variant),
      )
    )
      store.presentation.review.range = "month";
    if (
      route.params.screenSlug === "review" &&
      route.query.variant === "day-detail"
    ) {
      store.presentation.review.selected = store.today();
      store.presentation.review.detailOpen = true;
    }
    store.presentation.preparing = false;
  }
  usePrototypeCaseReset(prepare);
  watch(
    () => [route.params.screenSlug, route.query.variant],
    () => {
      if (isForcedRuntimeNavigation()) prepare();
    },
    { flush: "sync" },
  );
  if (!mountedStores.has(store)) {
    mountedStores.add(store);
    const variant = String(route.query.variant ?? "default");
    if (
      variant !== "default" &&
      !store.recoveryNeeded.value &&
      (route.params.screenSlug !== "focus" || focusVariant(store) !== variant)
    )
      prepare();
  }
  return { store, session, clock, prepare };
}

export function useYikeScroll(element: Ref<HTMLElement | null>, slug: string) {
  const store = useYikeStore();
  const revision = store.presentation.revision;
  onMounted(() => {
    if (element.value)
      element.value.scrollTop = store.presentation.scroll[slug] ?? 0;
  });
  onBeforeUnmount(() => {
    if (element.value && revision === store.presentation.revision)
      store.presentation.scroll[slug] = element.value.scrollTop;
  });
}
