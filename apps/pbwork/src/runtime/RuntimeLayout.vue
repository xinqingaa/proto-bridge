<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  nextTick,
  ref,
  shallowRef,
  watch,
  type Component,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  loadPrototypeScreens,
  screenViewModules,
} from "@/design-system/loaders";
import {
  resolveThemeTokens,
  tokensToCssVars,
} from "@/design-system/resolveThemeTokens";
import {
  isBridgeMessage,
  type BridgeContext,
  type RuntimeBridgeMessage,
  type WorkbenchBridgeMessage,
} from "@/runtime/bridge";
import { runForcedRuntimeNavigation } from "@/runtime/forced-navigation";
import {
  getRouteNavigationIntent,
  installNavigationIntentTracking,
} from "@/runtime/navigation-intent";
import { buildCanonicalRuntimeUrl, resolveRuntimeRoute } from "@/runtime/url";
import InspectHost from "@/runtime/inspect/InspectHost.vue";
import { installRuntimeCaptureProtocol } from "@/runtime/capture-protocol";
import ScreenTransition from "@/design-system/components/navigation/ScreenTransition.vue";
import type { ScreenTransitionNavigation } from "@/design-system/components/navigation/screenTransition";

installNavigationIntentTracking();

const route = useRoute();
const router = useRouter();
const screenComponent = shallowRef<Component | null>(null);
const loadedView = shallowRef<string | null>(null);
const loadError = shallowRef<string | null>(null);
const screenTransitionIntent = ref<ScreenTransitionNavigation>("replace");
let hasPresentedScreen = false;
const screenComponentCache = new Map<string, Component>();
const screenComponentLoads = new Map<string, Promise<Component>>();
let screenLoadGeneration = 0;
const runtimeId = shallowRef<string | null>(null);
const lastPostedRoute = shallowRef<string | null>(null);
const inspectEnabled = ref(false);
const commentEnabled = ref(false);
const inspectHost = ref<InstanceType<typeof InspectHost> | null>(null);
const isEmbedded = shallowRef(
  typeof window !== "undefined" && window.parent !== window,
);
let disposeCaptureProtocol: (() => void) | undefined;

const resolved = computed(() =>
  resolveRuntimeRoute({
    prototypeId: String(route.params.prototypeId),
    screenSlug: String(route.params.screenSlug),
    searchParams: new URLSearchParams(
      route.fullPath.includes("?")
        ? route.fullPath.slice(route.fullPath.indexOf("?") + 1)
        : "",
    ),
  }),
);

const effectiveThemeId = computed(() => {
  if (!resolved.value.ok) return "light";
  return resolved.value.theme.id;
});

const themeStyle = computed(() => {
  if (!resolved.value.ok) return {};
  try {
    return tokensToCssVars(resolveThemeTokens(effectiveThemeId.value));
  } catch {
    return {};
  }
});

const runtimeTheme = computed(() =>
  effectiveThemeId.value === "dark" ? "pbworkDark" : "pbworkLight",
);

const canonicalRuntimeUrl = computed(() => {
  if (!resolved.value.ok || typeof window === "undefined") return "";
  const path = buildCanonicalRuntimeUrl({
    prototypeId: resolved.value.prototype.id,
    screenSlug: resolved.value.screen.screenSlug,
    variantId: resolved.value.variant.id,
    themeId: effectiveThemeId.value,
    query: resolved.value.query,
  });
  return `${window.location.origin}${path}`;
});

const bridgeContext = computed((): BridgeContext | null => {
  if (!runtimeId.value || !resolved.value.ok) return null;
  return {
    runtimeId: runtimeId.value,
    prototypeId: resolved.value.prototype.id,
    screenId: resolved.value.screen.screenId,
    variantId: resolved.value.variant.id,
    themeId: resolved.value.theme.id,
  };
});

function postToParent(message: RuntimeBridgeMessage) {
  if (window.parent === window) return;
  window.parent.postMessage(message, window.location.origin);
}

function buildEnvelope<TType extends RuntimeBridgeMessage["type"]>(
  type: TType,
  payload: Extract<RuntimeBridgeMessage, { type: TType }>["payload"],
): Extract<RuntimeBridgeMessage, { type: TType }> | null {
  const ctx = bridgeContext.value;
  if (!ctx) return null;
  return {
    source: "pbwork-runtime",
    protocolVersion: 1,
    runtimeId: ctx.runtimeId,
    type,
    prototypeId: ctx.prototypeId,
    screenId: ctx.screenId,
    variantId: ctx.variantId,
    themeId: ctx.themeId,
    payload,
  } as Extract<RuntimeBridgeMessage, { type: TType }>;
}

function sendReady() {
  const message = buildEnvelope("ready", {
    canonicalRuntimeUrl: canonicalRuntimeUrl.value,
    route: route.fullPath,
    capabilities: ["route-sync", "inspect", "comment-target", "highlight"],
  });
  if (!message) return;
  lastPostedRoute.value = canonicalRuntimeUrl.value;
  postToParent(message);
}

function sendRouteIfChanged() {
  if (!runtimeId.value || !resolved.value.ok || !canonicalRuntimeUrl.value) {
    return;
  }
  if (lastPostedRoute.value === canonicalRuntimeUrl.value) return;
  const fromRuntimeUrl = lastPostedRoute.value ?? canonicalRuntimeUrl.value;
  const message = buildEnvelope("route", {
    fromRuntimeUrl,
    canonicalRuntimeUrl: canonicalRuntimeUrl.value,
    navigation: getRouteNavigationIntent(),
  });
  if (!message) return;
  lastPostedRoute.value = canonicalRuntimeUrl.value;
  postToParent(message);
}

function onMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return;
  if (event.source !== window.parent) return;
  if (!isBridgeMessage(event.data)) return;
  if (event.data.source !== "pbwork") return;

  const msg = event.data as WorkbenchBridgeMessage;
  if (msg.type === "init") {
    runtimeId.value = msg.runtimeId;
    inspectEnabled.value = false;
    commentEnabled.value = false;
    sendReady();
    return;
  }

  if (!runtimeId.value || msg.runtimeId !== runtimeId.value) return;

  if (msg.type === "reload") {
    window.location.assign(msg.payload.canonicalRuntimeUrl);
    return;
  }
  if (msg.type === "navigate") {
    let target: URL;
    try {
      target = new URL(msg.payload.canonicalRuntimeUrl, window.location.origin);
    } catch {
      return;
    }
    if (
      target.origin !== window.location.origin ||
      !target.pathname.startsWith("/prototype/")
    )
      return;
    const destination = `${target.pathname}${target.search}${target.hash}`;
    lastPostedRoute.value = `${window.location.origin}${destination}`;
    void runForcedRuntimeNavigation(() => router.replace(destination));
    return;
  }
  if (msg.type === "inspect-mode") {
    inspectEnabled.value = msg.payload.enabled;
    if (msg.payload.enabled) commentEnabled.value = false;
    return;
  }
  if (msg.type === "comment-mode") {
    commentEnabled.value = msg.payload.enabled;
    if (msg.payload.enabled) inspectEnabled.value = false;
    return;
  }
  if (msg.type === "highlight") {
    inspectHost.value?.highlight(msg.payload.element);
  }
}

function resolveScreenComponent(view: string): Promise<Component> {
  const cached = screenComponentCache.get(view);
  if (cached) return Promise.resolve(cached);

  const loading = screenComponentLoads.get(view);
  if (loading) return loading;

  const match = Object.entries(screenViewModules).find(
    ([path]) =>
      path.endsWith(`/${view}`) || path.endsWith(`/${view.replace(/^\//, "")}`),
  );
  if (!match) {
    return Promise.reject(new Error(`RUNTIME_ADAPTER_MISSING：${view}`));
  }

  const promise = (match[1] as () => Promise<{ default: Component }>)().then(
    (module) => {
      screenComponentCache.set(view, module.default);
      screenComponentLoads.delete(view);
      return module.default;
    },
  );
  screenComponentLoads.set(view, promise);
  return promise;
}

async function loadScreen() {
  const generation = ++screenLoadGeneration;
  loadError.value = null;
  if (!resolved.value.ok) return;

  const view = resolved.value.screen.view;
  if (loadedView.value === view && screenComponent.value) return;
  try {
    const component = await resolveScreenComponent(view);
    if (
      generation !== screenLoadGeneration ||
      !resolved.value.ok ||
      resolved.value.screen.view !== view
    ) {
      return;
    }
    screenTransitionIntent.value = hasPresentedScreen
      ? getRouteNavigationIntent()
      : "replace";
    hasPresentedScreen = true;
    loadedView.value = view;
    screenComponent.value = component;
  } catch (error) {
    screenComponentLoads.delete(view);
    if (generation !== screenLoadGeneration) return;
    loadError.value =
      error instanceof Error
        ? error.message
        : `RUNTIME_ADAPTER_LOAD_FAILED：${view}`;
  }
}

watch(
  () => route.fullPath,
  async () => {
    await loadScreen();
    await nextTick();
    sendRouteIfChanged();
  },
  { immediate: true, flush: "post" },
);

onMounted(() => {
  window.addEventListener("message", onMessage);
  if (window.parent !== window) {
    document.documentElement.classList.add("pbwork-runtime-embedded");
  }
  disposeCaptureProtocol = installRuntimeCaptureProtocol({
    getContext: () => {
      if (!resolved.value.ok) return null;
      return {
        prototypeId: resolved.value.prototype.id,
        screenId: resolved.value.screen.screenId,
        variantId: resolved.value.variant.id,
        themeId: effectiveThemeId.value,
        ...(resolved.value.variant.fixture
          ? { fixtureId: resolved.value.variant.fixture }
          : {}),
      };
    },
    navigate: async (target) => {
      const screen = loadPrototypeScreens().find(
        (candidate) =>
          candidate.prototypeId === target.prototypeId &&
          candidate.screenId === target.screenId,
      );
      if (!screen) throw new Error(`UNKNOWN_SCREEN：${target.screenId}`);
      const variant = screen.variants.find(
        (candidate) => candidate.id === target.variantId,
      );
      if (!variant) throw new Error(`UNKNOWN_VARIANT：${target.variantId}`);
      await runForcedRuntimeNavigation(() =>
        router.replace(
          buildCanonicalRuntimeUrl({
            prototypeId: target.prototypeId,
            screenSlug: screen.screenSlug,
            variantId: target.variantId,
            themeId: target.themeId,
            ...(variant.query ? { query: variant.query } : {}),
          }),
        ),
      );
      await nextTick();
    },
    waitForStable: async () => {
      await document.fonts.ready;
      await nextTick();
      await new Promise<void>((resolveFrame) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolveFrame()),
        ),
      );
    },
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("message", onMessage);
  document.documentElement.classList.remove("pbwork-runtime-embedded");
  disposeCaptureProtocol?.();
  disposeCaptureProtocol = undefined;
  for (const key of Object.keys(themeStyle.value)) {
    document.documentElement.style.removeProperty(key);
  }
});

watch(
  themeStyle,
  (vars) => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
  },
  { immediate: true },
);

</script>

<template>
  <v-app
    :theme="runtimeTheme"
    class="runtime-app"
    :class="{ 'is-embedded': isEmbedded }"
    :style="themeStyle"
    data-testid="runtime-root"
  >
    <v-main class="runtime-main">
      <ScreenTransition
        v-if="resolved.ok && screenComponent && !loadError && loadedView"
        :screen-key="loadedView"
        :navigation="screenTransitionIntent"
      >
        <component :is="screenComponent" />
      </ScreenTransition>
      <section
        v-else-if="resolved.ok && !loadError"
        class="runtime-loading"
        aria-busy="true"
      />
      <section v-else class="runtime-error" role="alert" aria-live="assertive">
        <p class="runtime-kicker">PBWork Runtime</p>
        <h1>无法打开原型</h1>
        <p>
          {{
            loadError ?? (!resolved.ok ? resolved.message : "UNKNOWN_SCREEN")
          }}
        </p>
      </section>
    </v-main>

    <InspectHost
      v-if="isEmbedded && bridgeContext"
      ref="inspectHost"
      :enabled="inspectEnabled"
      :comment-enabled="commentEnabled"
      :bridge-context="bridgeContext"
      :post="postToParent"
    />
  </v-app>
</template>

<style scoped>
.runtime-main {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100%;
}

.runtime-app {
  background: rgb(var(--v-theme-background));
}

.runtime-app.is-embedded :deep(.v-main) {
  --v-layout-top: 0px !important;
  --v-layout-bottom: 0px !important;
  --v-layout-left: 0px !important;
  --v-layout-right: 0px !important;
  padding: 0 !important;
  min-height: 100% !important;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
}

.runtime-app.is-embedded :deep(.v-main::-webkit-scrollbar) {
  width: 0;
  height: 0;
}

.runtime-loading {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

.runtime-error {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 32px 24px;
}
.runtime-kicker {
  margin: 0 0 8px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 700;
}
h1 {
  margin: 0 0 12px;
  font-size: 1.5rem;
}
</style>
