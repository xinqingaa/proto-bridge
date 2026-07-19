<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type {
  BridgeContext,
  ElementBox,
  ElementRef,
  RuntimeBridgeMessage,
} from "@/runtime/bridge";
import { BRIDGE_PROTOCOL_VERSION } from "@/runtime/bridge";
import HighlightOverlay from "@/runtime/inspect/HighlightOverlay.vue";
import { findByRef } from "@/runtime/inspect/registry";
import {
  buildElementSummary,
  buildSelectPayload,
  isInspectChrome,
  readBbox,
} from "@/runtime/inspect/snapshot";

const props = defineProps<{
  enabled: boolean;
  bridgeContext: BridgeContext | null;
  post: (message: RuntimeBridgeMessage) => void;
}>();

const hoverBox = ref<ElementBox | null>(null);
const selectBox = ref<ElementBox | null>(null);
const selectedEl = shallowRef<HTMLElement | null>(null);

function envelope<T extends RuntimeBridgeMessage["type"]>(
  type: T,
  payload: Extract<RuntimeBridgeMessage, { type: T }>["payload"],
): Extract<RuntimeBridgeMessage, { type: T }> | null {
  const ctx = props.bridgeContext;
  if (!ctx) return null;
  return {
    source: "pbwork-runtime",
    protocolVersion: BRIDGE_PROTOCOL_VERSION,
    runtimeId: ctx.runtimeId,
    type,
    prototypeId: ctx.prototypeId,
    screenId: ctx.screenId,
    variantId: ctx.variantId,
    themeId: ctx.themeId,
    payload,
  } as Extract<RuntimeBridgeMessage, { type: T }>;
}

function targetFromEvent(event: Event): HTMLElement | null {
  const raw = event.target;
  if (!(raw instanceof Element)) return null;
  if (isInspectChrome(raw)) return null;
  const el = raw instanceof HTMLElement ? raw : raw.parentElement;
  if (!el || el === document.documentElement || el === document.body) {
    return null;
  }
  return el;
}

function onPointerMove(event: PointerEvent) {
  if (!props.enabled) return;
  const el = targetFromEvent(event);
  if (!el) {
    hoverBox.value = null;
    const msg = envelope("hover", {});
    if (msg) props.post(msg);
    return;
  }
  hoverBox.value = readBbox(el);
  const summary = buildElementSummary(el);
  const msg = envelope("hover", { element: summary });
  if (msg) props.post(msg);
}

function onClick(event: MouseEvent) {
  if (!props.enabled) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const el = targetFromEvent(event);
  if (!el) {
    clearLocal("blank");
    return;
  }

  const payload = buildSelectPayload(el);
  if ("error" in payload) {
    const err = envelope("error", {
      code: "PAYLOAD_TOO_LARGE",
      message: "select payload exceeds 64KiB",
    });
    if (err) props.post(err);
    return;
  }

  selectedEl.value = el;
  selectBox.value = readBbox(el);
  hoverBox.value = null;
  const msg = envelope("select", payload);
  if (msg) props.post(msg);
}

function onKeyDown(event: KeyboardEvent) {
  if (!props.enabled) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    // Always emit clear-select(escape): parent exits inspect when already empty.
    clearLocal("escape");
    return;
  }
  if (event.key === "Enter") {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || isInspectChrome(active)) return;
    if (active === document.body || active === document.documentElement) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = buildSelectPayload(active);
    if ("error" in payload) return;
    selectedEl.value = active;
    selectBox.value = readBbox(active);
    const msg = envelope("select", payload);
    if (msg) props.post(msg);
  }
}

function clearLocal(reason: "escape" | "blank" | "mode-change" | "unmounted") {
  selectedEl.value = null;
  selectBox.value = null;
  hoverBox.value = null;
  const msg = envelope("clear-select", { reason });
  if (msg) props.post(msg);
}

function highlight(ref?: ElementRef) {
  if (!ref) {
    selectBox.value = null;
    selectedEl.value = null;
    return;
  }
  const el = findByRef(ref);
  if (!el) {
    const err = envelope("error", {
      code: "ELEMENT_NOT_FOUND",
      message: "highlight target missing",
    });
    if (err) props.post(err);
    return;
  }
  selectedEl.value = el;
  selectBox.value = readBbox(el);
}

function onScrollOrResize() {
  if (selectedEl.value) selectBox.value = readBbox(selectedEl.value);
}

defineExpose({ highlight, clearLocal });

watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled) clearLocal("mode-change");
  },
);

onMounted(() => {
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("scroll", onScrollOrResize, true);
  window.addEventListener("resize", onScrollOrResize);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointermove", onPointerMove, true);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("keydown", onKeyDown, true);
  window.removeEventListener("scroll", onScrollOrResize, true);
  window.removeEventListener("resize", onScrollOrResize);
  clearLocal("unmounted");
});
</script>

<template>
  <HighlightOverlay :hover-box="hoverBox" :select-box="selectBox" />
</template>
