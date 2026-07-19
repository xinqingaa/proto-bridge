<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type Component,
} from "vue";
import { useRoute } from "vue-router";
import { screenViewModules } from "@/design-system/loaders";
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
import {
  buildCanonicalRuntimeUrl,
  resolveRuntimeRoute,
} from "@/runtime/url";
import InspectHost from "@/runtime/inspect/InspectHost.vue";

const route = useRoute();
const screenComponent = shallowRef<Component | null>(null);
const loadError = shallowRef<string | null>(null);
const runtimeId = shallowRef<string | null>(null);
const lastPostedRoute = shallowRef<string | null>(null);
const inspectEnabled = ref(false);
const inspectHost = ref<InstanceType<typeof InspectHost> | null>(null);
const isEmbedded = shallowRef(
  typeof window !== "undefined" && window.parent !== window,
);

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

const themeStyle = computed(() => {
  if (!resolved.value.ok) return {};
  try {
    return tokensToCssVars(resolveThemeTokens(resolved.value.theme.id));
  } catch {
    return {};
  }
});

const runtimeTheme = computed(() =>
  resolved.value.ok && resolved.value.theme.dark ? "pbworkDark" : "pbworkLight",
);

const canonicalRuntimeUrl = computed(() => {
  if (!resolved.value.ok || typeof window === "undefined") return "";
  const path = buildCanonicalRuntimeUrl({
    prototypeId: resolved.value.prototype.id,
    screenSlug: resolved.value.screen.screenSlug,
    variantId: resolved.value.variant.id,
    themeId: resolved.value.theme.id,
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
    capabilities: ["route-sync", "inspect", "highlight"],
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
    sendReady();
    return;
  }

  if (!runtimeId.value || msg.runtimeId !== runtimeId.value) return;

  if (msg.type === "reload") {
    window.location.assign(msg.payload.canonicalRuntimeUrl);
    return;
  }
  if (msg.type === "inspect-mode") {
    inspectEnabled.value = msg.payload.enabled;
    return;
  }
  if (msg.type === "comment-mode") {
    // M5 — ignore enable, force inspect off if somehow sent
    if (msg.payload.enabled) inspectEnabled.value = false;
    return;
  }
  if (msg.type === "highlight") {
    inspectHost.value?.highlight(msg.payload.element);
  }
}

async function loadScreen() {
  screenComponent.value = null;
  loadError.value = null;
  if (!resolved.value.ok) return;

  const view = resolved.value.screen.view;
  const match = Object.entries(screenViewModules).find(
    ([path]) =>
      path.endsWith(`/${view}`) || path.endsWith(`/${view.replace(/^\//, "")}`),
  );
  if (!match) {
    loadError.value = `RUNTIME_ADAPTER_MISSING：${view}`;
    return;
  }
  screenComponent.value = defineAsyncComponent(
    match[1] as () => Promise<{ default: Component }>,
  );
}

watch(
  () => route.fullPath,
  () => {
    void loadScreen();
    sendRouteIfChanged();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("message", onMessage);
  if (window.parent !== window) {
    document.documentElement.classList.add("pbwork-runtime-embedded");
  }
  void loadScreen();
});

onBeforeUnmount(() => {
  window.removeEventListener("message", onMessage);
  document.documentElement.classList.remove("pbwork-runtime-embedded");
});
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
      <component
        :is="screenComponent"
        v-if="resolved.ok && screenComponent && !loadError"
      />
      <section
        v-else
        class="runtime-error"
        role="alert"
        aria-live="assertive"
      >
        <p class="runtime-kicker">PBWork Runtime</p>
        <h1>无法打开原型</h1>
        <p>
          {{
            loadError ??
            (!resolved.ok ? resolved.message : "UNKNOWN_SCREEN")
          }}
        </p>
      </section>
    </v-main>

    <InspectHost
      v-if="isEmbedded && bridgeContext"
      ref="inspectHost"
      :enabled="inspectEnabled"
      :bridge-context="bridgeContext"
      :post="postToParent"
    />
  </v-app>
</template>

<style scoped>
.runtime-main {
  min-height: 100vh;
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
