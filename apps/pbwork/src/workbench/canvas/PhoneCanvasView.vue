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
  HANDSHAKE_TIMEOUT_MS,
  contextMatches,
  createWorkbenchEnvelope,
  isBridgeMessage,
  workbenchPathFromRuntimeUrl,
  type BridgeContext,
  type RuntimeBridgeMessage,
} from "@/runtime/bridge";
import { useCanvasStore } from "@/app/stores/canvas";
import { useWorkbenchStore } from "@/app/stores/workbench";
import { useSelectionStore } from "@/app/stores/selection";
import CanvasToolbar from "@/workbench/canvas/CanvasToolbar.vue";
import PhoneStage from "@/workbench/canvas/PhoneStage.vue";

const props = defineProps<{
  prototypeId: string;
  screenSlug: string;
}>();

const route = useRoute();
const router = useRouter();
const canvas = useCanvasStore();
const workbench = useWorkbenchStore();
const selection = useSelectionStore();

const stageRef = ref<InstanceType<typeof PhoneStage> | null>(null);
const iframeWindow = ref<Window | null>(null);
const runtimeId = ref<string | null>(null);
const copyFeedback = ref<string | null>(null);
const routeError = ref<string | null>(null);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
let handshakeTimer: ReturnType<typeof setTimeout> | null = null;
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
const isDark = computed(() => workbench.theme === "pbworkDark");

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

const reloadNonce = ref(0);
const iframeSrc = computed(() => absoluteRuntimeUrl.value);
const iframeRenderKey = computed(() => reloadNonce.value);

const iframeTitle = computed(() => {
  if (!screen.value) return "原型预览";
  return `${screen.value.label}（${selectedVariantId.value}）`;
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
  selection.resetForNavigation();
  const win = iframeWindow.value;
  try {
    if (win) {
      win.location.reload();
      return;
    }
  } catch {
    /* fall through */
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

function postToRuntime(
  message: ReturnType<typeof createWorkbenchEnvelope>,
) {
  const target = iframeWindow.value;
  if (!target) return;
  target.postMessage(message, window.location.origin);
}

function sendInspectMode(enabled: boolean) {
  const ctx = bridgeContext.value;
  if (!ctx || !selection.runtimeReady) return;
  postToRuntime(
    createWorkbenchEnvelope("inspect-mode", ctx, { enabled }),
  );
}

function sendCommentMode(enabled: boolean) {
  const ctx = bridgeContext.value;
  if (!ctx || !selection.runtimeReady) return;
  postToRuntime(createWorkbenchEnvelope("comment-mode", ctx, { enabled }));
}

function toggleInspect() {
  if (!selection.canInspect && !selection.inspecting) return;
  if (selection.commenting) sendCommentMode(false);
  if (!selection.inspecting) {
    if (canvas.toolMode === "pan") canvas.setToolMode("idle");
  }
  selection.toggleInspect();
  sendInspectMode(selection.inspecting);
  if (!selection.inspecting) selection.clearSelection();
}

function toggleComment() {
  if (!selection.canComment && !selection.commenting) return;
  if (!selection.commenting && canvas.toolMode === "pan") canvas.setToolMode("idle");
  if (selection.inspecting) sendInspectMode(false);
  selection.toggleComment();
  sendCommentMode(selection.commenting);
}

function sendInit(contentWindow: Window | null) {
  iframeWindow.value = contentWindow;
  if (!contentWindow || !resolved.value.ok || !absoluteRuntimeUrl.value) return;

  const id = crypto.randomUUID();
  runtimeId.value = id;
  selection.onRuntimeLoading(id);
  if (handshakeTimer) clearTimeout(handshakeTimer);
  handshakeTimer = setTimeout(() => {
    selection.onHandshakeTimeout();
  }, HANDSHAKE_TIMEOUT_MS);

  postToRuntime(
    createWorkbenchEnvelope(
      "init",
      {
        runtimeId: id,
        prototypeId: resolved.value.prototype.id,
        screenId: resolved.value.screen.screenId,
        variantId: resolved.value.variant.id,
        themeId: resolved.value.theme.id,
      },
      { canonicalRuntimeUrl: absoluteRuntimeUrl.value },
    ),
  );
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
  selection.resetForNavigation();
  if (route.fullPath === workbenchPath) return;
  ignoreRouteEchoUntil = Date.now() + 800;
  void router.replace(workbenchPath);
}

function onWindowMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return;
  if (!iframeWindow.value || event.source !== iframeWindow.value) return;
  if (!isBridgeMessage(event.data)) return;
  if (event.data.source !== "pbwork-runtime") return;

  const msg = event.data as RuntimeBridgeMessage;
  const ctx = bridgeContext.value;
  if (msg.type !== "ready" && ctx && !contextMatches(msg, ctx)) return;
  if (runtimeId.value && msg.runtimeId !== runtimeId.value) return;

  if (msg.type === "ready") {
    routeError.value = null;
    selection.onReady(msg.payload.capabilities);
    if (handshakeTimer) {
      clearTimeout(handshakeTimer);
      handshakeTimer = null;
    }
    if (selection.inspecting) sendInspectMode(true);
    if (selection.commenting) sendCommentMode(true);
    return;
  }
  if (msg.type === "route") {
    applyRuntimeNavigation(msg.payload.canonicalRuntimeUrl);
    return;
  }
  if (msg.type === "hover") {
    selection.setHover(msg.payload.element);
    return;
  }
  if (msg.type === "select") {
    selection.setSelected(msg.payload);
    return;
  }
  if (msg.type === "comment-target") {
    selection.setCommentTarget(msg.payload);
    if (!workbench.inspectorOpen) workbench.toggleInspector();
    return;
  }
  if (msg.type === "clear-select") {
    const hadSelection = Boolean(selection.selected);
    selection.clearSelection();
    // Esc inside iframe: first clears selection, second exits inspect.
    if (
      msg.payload.reason === "escape" &&
      !hadSelection &&
      selection.inspecting
    ) {
      selection.setInspectMode(false);
      sendInspectMode(false);
    }
    return;
  }
  if (msg.type === "error") {
    selection.setError(`${msg.payload.code}: ${msg.payload.message}`);
  }
}

function onShellKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  if (selection.selected) {
    event.preventDefault();
    selection.clearSelection();
    const ctx = bridgeContext.value;
    if (ctx && selection.runtimeReady) {
      // ask runtime to clear highlight by toggling highlight empty
      postToRuntime(createWorkbenchEnvelope("highlight", ctx, {}));
    }
    return;
  }
  if (selection.inspecting) {
    event.preventDefault();
    selection.setInspectMode(false);
    sendInspectMode(false);
    return;
  }
  if (selection.commenting) {
    event.preventDefault();
    selection.setCommentMode(false);
    sendCommentMode(false);
  }
}

watch(absoluteRuntimeUrl, () => {
  routeError.value = null;
  selection.resetForNavigation();
});

watch(
  () => canvas.toolMode,
  (mode) => {
    if (mode === "pan" && selection.inspecting) {
      selection.setInspectMode(false);
      sendInspectMode(false);
    }
    if (mode === "pan" && selection.commenting) {
      selection.setCommentMode(false);
      sendCommentMode(false);
    }
  },
);

watch(
  () => selection.highlightNonce,
  () => {
    const ctx = bridgeContext.value;
    if (!ctx || !selection.runtimeReady) return;
    postToRuntime(createWorkbenchEnvelope("highlight", ctx, selection.highlightRequest ? { element: selection.highlightRequest } : {}));
  },
);

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
  window.addEventListener("keydown", onShellKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("message", onWindowMessage);
  window.removeEventListener("keydown", onShellKeydown);
  if (copyTimer) clearTimeout(copyTimer);
  if (handshakeTimer) clearTimeout(handshakeTimer);
  selection.setInspectMode(false);
  selection.setCommentMode(false);
  selection.clearSelection();
});
</script>

<template>
  <section v-if="prototype && screen" class="phone-canvas">
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
    <v-alert
      v-if="selection.handshakeTimedOut"
      type="warning"
      variant="tonal"
      density="compact"
      class="canvas-alert"
    >
      Runtime 握手超时，请点击刷新。
    </v-alert>

    <PhoneStage
      v-if="iframeSrc"
      :key="iframeRenderKey"
      ref="stageRef"
      :src="iframeSrc"
      :iframe-title="iframeTitle"
      :is-dark="isDark"
      @iframe-load="onIframeLoad"
    />

    <CanvasToolbar
      :variants="screen.variants"
      :themes="themes"
      :variant-id="selectedVariantId"
      :theme-id="selectedThemeId"
      :is-dark="isDark"
      :copy-feedback="copyFeedback"
      @update:variant-id="onVariantId"
      @update:theme-id="onThemeId"
      @toggle-inspect="toggleInspect"
      @toggle-comment="toggleComment"
      @refresh="refresh"
      @fullscreen="fullscreen"
      @copy="copyLink"
    />
  </section>
  <v-alert v-else type="error" variant="tonal">
    未知 Screen：{{ prototypeId }}/{{ screenSlug }}
  </v-alert>
</template>

<style scoped>
.phone-canvas {
  position: relative;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.canvas-alert {
  margin: 8px 12px 0;
}
</style>
