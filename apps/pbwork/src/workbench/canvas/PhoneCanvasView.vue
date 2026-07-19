<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  loadPrototypes,
  loadPrototypeScreens,
  loadThemes,
} from "@/design-system/loaders";
import {
  buildCanonicalRuntimeUrl,
  resolveRuntimeRoute,
} from "@/runtime/url";
import {
  BRIDGE_PROTOCOL_VERSION,
  isBridgeMessage,
  workbenchPathFromRuntimeUrl,
  type RuntimeBridgeMessage,
  type WorkbenchBridgeMessage,
} from "@/runtime/bridge";
import CanvasToolbar from "@/workbench/canvas/CanvasToolbar.vue";
import PhoneStage from "@/workbench/canvas/PhoneStage.vue";

const props = defineProps<{
  prototypeId: string;
  screenSlug: string;
}>();

const route = useRoute();
const router = useRouter();

const stageRef = ref<InstanceType<typeof PhoneStage> | null>(null);
const iframeWindow = ref<Window | null>(null);
const runtimeId = ref<string | null>(null);
const copyFeedback = ref<string | null>(null);
const routeError = ref<string | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
let ignoreRouteEchoUntil = 0;

const prototype = computed(() =>
  loadPrototypes().find((item) => item.id === props.prototypeId),
);
const screen = computed(() =>
  loadPrototypeScreens().find(
    (item) =>
      item.prototypeId === props.prototypeId &&
      item.screenSlug === props.screenSlug,
  ),
);
const themes = computed(() => loadThemes());

const searchParams = computed(
  () =>
    new URLSearchParams(
      route.fullPath.includes("?")
        ? route.fullPath.slice(route.fullPath.indexOf("?") + 1)
        : "",
    ),
);

const resolved = computed(() =>
  resolveRuntimeRoute({
    prototypeId: props.prototypeId,
    screenSlug: props.screenSlug,
    searchParams: searchParams.value,
  }),
);

const selectedVariantId = computed(() => {
  if (resolved.value.ok) return resolved.value.variant.id;
  if (typeof route.query.variant === "string") return route.query.variant;
  return screen.value?.defaultVariantId ?? "default";
});

const selectedThemeId = computed(() => {
  if (resolved.value.ok) return resolved.value.theme.id;
  if (typeof route.query.theme === "string") return route.query.theme;
  return prototype.value?.defaultThemeId ?? "light";
});

const canonicalRuntimePath = computed(() => {
  if (!prototype.value || !screen.value) return "";
  if (resolved.value.ok) {
    return buildCanonicalRuntimeUrl({
      prototypeId: prototype.value.id,
      screenSlug: screen.value.screenSlug,
      variantId: resolved.value.variant.id,
      themeId: resolved.value.theme.id,
      query: resolved.value.query,
    });
  }
  const variant =
    screen.value.variants.find((item) => item.id === selectedVariantId.value) ??
    screen.value.variants.find(
      (item) => item.id === screen.value!.defaultVariantId,
    );
  if (!variant) return "";
  return buildCanonicalRuntimeUrl({
    prototypeId: prototype.value.id,
    screenSlug: screen.value.screenSlug,
    variantId: variant.id,
    themeId: selectedThemeId.value,
    ...(variant.query ? { query: variant.query } : {}),
  });
});

const absoluteRuntimeUrl = computed(() => {
  if (!canonicalRuntimePath.value || typeof window === "undefined") return "";
  return `${window.location.origin}${canonicalRuntimePath.value}`;
});

/** Remount iframe when bumping (same URL refresh fallback). */
const reloadNonce = ref(0);
const iframeSrc = computed(() => absoluteRuntimeUrl.value);
const iframeRenderKey = computed(() => reloadNonce.value);

const iframeTitle = computed(() => {
  if (!screen.value) return "原型预览";
  return `${screen.value.label}（${selectedVariantId.value}）`;
});

function replaceWorkbenchQuery(next: {
  variantId: string;
  themeId: string;
}) {
  if (!screen.value || !prototype.value) return;
  const variant =
    screen.value.variants.find((item) => item.id === next.variantId) ??
    screen.value.variants.find(
      (item) => item.id === screen.value!.defaultVariantId,
    );
  if (!variant) return;
  const query: Record<string, string> = {
    variant: variant.id,
    theme: next.themeId,
    ...(variant.query ?? {}),
  };
  ignoreRouteEchoUntil = Date.now() + 800;
  void router.replace({
    path: `/workbench/prototypes/${prototype.value.id}/screens/${screen.value.screenSlug}`,
    query,
  });
}

function onVariantId(variantId: string) {
  replaceWorkbenchQuery({
    variantId,
    themeId: selectedThemeId.value,
  });
}

function onThemeId(themeId: string) {
  replaceWorkbenchQuery({
    variantId: selectedVariantId.value,
    themeId,
  });
}

function refresh() {
  const win = iframeWindow.value;
  try {
    if (win) {
      win.location.reload();
      return;
    }
  } catch {
    /* fall through to remount */
  }
  reloadNonce.value += 1;
}

function fullscreen() {
  if (!absoluteRuntimeUrl.value) return;
  window.open(absoluteRuntimeUrl.value, "_blank", "noopener,noreferrer");
}

async function copyLink() {
  if (!absoluteRuntimeUrl.value) return;
  try {
    await navigator.clipboard.writeText(absoluteRuntimeUrl.value);
    copyFeedback.value = "已复制";
  } catch {
    copyFeedback.value = "复制失败";
  }
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = setTimeout(() => {
    copyFeedback.value = null;
  }, 1600);
}

function postToRuntime(message: WorkbenchBridgeMessage) {
  const target = iframeWindow.value;
  if (!target) return;
  target.postMessage(message, window.location.origin);
}

function sendInit(contentWindow: Window | null) {
  iframeWindow.value = contentWindow;
  if (!contentWindow || !resolved.value.ok || !absoluteRuntimeUrl.value) return;

  const id = crypto.randomUUID();
  runtimeId.value = id;
  const message: WorkbenchBridgeMessage = {
    source: "pbwork",
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    runtimeId: id,
    type: "init",
    prototypeId: resolved.value.prototype.id,
    screenId: resolved.value.screen.screenId,
    variantId: resolved.value.variant.id,
    themeId: resolved.value.theme.id,
    payload: { canonicalRuntimeUrl: absoluteRuntimeUrl.value },
  };
  postToRuntime(message);
}

function onIframeLoad(contentWindow: Window | null) {
  sendInit(contentWindow);
}

function applyRuntimeNavigation(canonicalRuntimeUrl: string) {
  if (Date.now() < ignoreRouteEchoUntil) return;

  let parsed: URL;
  try {
    parsed = new URL(canonicalRuntimeUrl, window.location.origin);
  } catch {
    routeError.value = "INVALID_RUNTIME_ROUTE";
    return;
  }
  if (
    parsed.origin !== window.location.origin ||
    !parsed.pathname.startsWith("/prototype/")
  ) {
    routeError.value = "INVALID_RUNTIME_ROUTE";
    return;
  }

  const segments = parsed.pathname.split("/");
  const check = resolveRuntimeRoute({
    prototypeId: segments[2] ?? "",
    screenSlug: segments[3] ?? "",
    searchParams: parsed.searchParams,
  });
  if (!check.ok) {
    routeError.value = check.code;
    return;
  }

  const canonical = buildCanonicalRuntimeUrl({
    prototypeId: check.prototype.id,
    screenSlug: check.screen.screenSlug,
    variantId: check.variant.id,
    themeId: check.theme.id,
    query: check.query,
  });
  const workbenchPath = workbenchPathFromRuntimeUrl(canonical);
  if (!workbenchPath) {
    routeError.value = "INVALID_RUNTIME_ROUTE";
    return;
  }

  routeError.value = null;
  if (route.fullPath === workbenchPath) return;
  ignoreRouteEchoUntil = Date.now() + 800;
  void router.replace(workbenchPath);
}

function onWindowMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return;
  if (!iframeWindow.value || event.source !== iframeWindow.value) return;
  if (!isBridgeMessage(event.data)) return;
  if (event.data.source !== "pbwork-runtime") return;
  if (runtimeId.value && event.data.runtimeId !== runtimeId.value) return;

  const msg = event.data as RuntimeBridgeMessage;
  if (msg.type === "ready") {
    routeError.value = null;
    return;
  }
  if (msg.type === "route") {
    applyRuntimeNavigation(msg.payload.canonicalRuntimeUrl);
  }
}

watch(absoluteRuntimeUrl, () => {
  routeError.value = null;
});

/** Keep workbench address bar aligned with canonical Runtime query. */
watch(
  () => {
    if (!resolved.value.ok || !prototype.value || !screen.value) return null;
    return workbenchPathFromRuntimeUrl(
      buildCanonicalRuntimeUrl({
        prototypeId: prototype.value.id,
        screenSlug: screen.value.screenSlug,
        variantId: resolved.value.variant.id,
        themeId: resolved.value.theme.id,
        query: resolved.value.query,
      }),
    );
  },
  (canonicalWorkbenchPath) => {
    if (!canonicalWorkbenchPath) return;
    if (route.fullPath === canonicalWorkbenchPath) return;
    if (Date.now() < ignoreRouteEchoUntil) return;
    ignoreRouteEchoUntil = Date.now() + 400;
    void router.replace(canonicalWorkbenchPath);
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("message", onWindowMessage);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", onWindowMessage);
  if (copyTimer) clearTimeout(copyTimer);
});
</script>

<template>
  <section v-if="prototype && screen" class="phone-canvas">
    <CanvasToolbar
      :variants="screen.variants"
      :themes="themes"
      :variant-id="selectedVariantId"
      :theme-id="selectedThemeId"
      :copy-feedback="copyFeedback"
      @update:variant-id="onVariantId"
      @update:theme-id="onThemeId"
      @refresh="refresh"
      @fullscreen="fullscreen"
      @copy="copyLink"
    />

    <v-alert
      v-if="!resolved.ok"
      type="warning"
      variant="tonal"
      density="compact"
      class="canvas-alert"
    >
      {{ resolved.message }}
    </v-alert>
    <v-alert
      v-if="routeError"
      type="error"
      variant="tonal"
      density="compact"
      class="canvas-alert"
      closable
      @click:close="routeError = null"
    >
      {{ routeError }}：无法跟随 iframe 内导航
    </v-alert>

    <PhoneStage
      v-if="iframeSrc"
      :key="iframeRenderKey"
      ref="stageRef"
      :src="iframeSrc"
      :iframe-title="iframeTitle"
      @iframe-load="onIframeLoad"
    />
  </section>
  <v-alert v-else type="error" variant="tonal">
    未知 Screen：{{ prototypeId }}/{{ screenSlug }}
  </v-alert>
</template>

<style scoped>
.phone-canvas {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.canvas-alert {
  margin: 8px 12px 0;
}
</style>
