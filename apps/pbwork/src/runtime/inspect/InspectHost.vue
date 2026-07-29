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
  climbInspectTarget,
  isInspectChrome,
  readBbox,
  resolvePickTarget,
} from "@/runtime/inspect/snapshot";

const props = defineProps<{
  enabled: boolean;
  commentEnabled: boolean;
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

function selectElement(el: HTMLElement) {
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

function stableSelector(el: HTMLElement): string | undefined {
  const pbId = el.getAttribute("data-pb-id");
  const pbKey = el.getAttribute("data-pb-key");
  const pbSelector = pbId
    ? `[data-pb-id="${CSS.escape(pbId)}"]${pbKey ? `[data-pb-key="${CSS.escape(pbKey)}"]` : ""}`
    : undefined;
  if (pbSelector && document.querySelectorAll(pbSelector).length === 1) {
    return pbSelector;
  }
  if (
    el.id &&
    document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1
  ) {
    return `#${CSS.escape(el.id)}`;
  }

  const parts: string[] = [];
  let cur: HTMLElement | null = el;
  while (cur && cur !== document.body && parts.length < 10) {
    const curPbId = cur.getAttribute("data-pb-id");
    const curPbKey = cur.getAttribute("data-pb-key");
    const currentSelector = curPbId
      ? `[data-pb-id="${CSS.escape(curPbId)}"]${curPbKey ? `[data-pb-key="${CSS.escape(curPbKey)}"]` : ""}`
      : undefined;
    if (
      currentSelector &&
      document.querySelectorAll(currentSelector).length === 1
    ) {
      parts.unshift(currentSelector);
      break;
    }
    const parentEl: HTMLElement | null = cur.parentElement;
    if (!parentEl) break;
    const tag = cur.tagName.toLowerCase();
    const siblings = Array.from(parentEl.children).filter(
      (node: Element) => node.tagName === cur!.tagName,
    );
    const index = siblings.indexOf(cur) + 1;
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
    cur = parentEl;
  }
  const selector = parts.join(" > ");
  return selector && selector.length <= 512 ? selector : undefined;
}

function sendCommentTarget(
  event: MouseEvent | KeyboardEvent,
  leaf: HTMLElement | null,
) {
  const point =
    event instanceof MouseEvent
      ? { x: event.clientX, y: event.clientY }
      : leaf
        ? {
            x: readBbox(leaf).x + readBbox(leaf).width / 2,
            y: readBbox(leaf).y + readBbox(leaf).height / 2,
          }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const target = leaf ? resolvePickTarget(leaf, false) : null;
  const selector = target ? stableSelector(target) : undefined;
  const payload = {
    point,
    ...(target
      ? { element: buildElementSummary(target), bbox: readBbox(target) }
      : {}),
    ...(selector ? { selector } : {}),
  };
  if (target) {
    selectedEl.value = target;
    selectBox.value = readBbox(target);
  }
  const msg = envelope("comment-target", payload);
  if (msg) props.post(msg);
}

function onPointerMove(event: PointerEvent) {
  if (!props.enabled) return;
  const leaf = targetFromEvent(event);
  if (!leaf) {
    hoverBox.value = null;
    const msg = envelope("hover", {});
    if (msg) props.post(msg);
    return;
  }
  const el = resolvePickTarget(leaf, event.altKey);
  hoverBox.value = readBbox(el);
  const summary = buildElementSummary(el);
  const msg = envelope("hover", { element: summary });
  if (msg) props.post(msg);
}

function onClick(event: MouseEvent) {
  if (!props.enabled && !props.commentEnabled) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const leaf = targetFromEvent(event);
  if (props.commentEnabled) {
    sendCommentTarget(event, leaf);
    return;
  }
  if (!leaf) {
    clearLocal("blank");
    return;
  }

  selectElement(resolvePickTarget(leaf, event.altKey));
}

function onKeyDown(event: KeyboardEvent) {
  if (!props.enabled && !props.commentEnabled) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    // Always emit clear-select(escape): parent exits inspect when already empty.
    clearLocal("escape");
    return;
  }
  if (event.key === "ArrowUp" && selectedEl.value) {
    const parent = climbInspectTarget(selectedEl.value);
    if (!parent) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(parent);
    return;
  }
  if (event.key === "Enter") {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || isInspectChrome(active)) return;
    if (active === document.body || active === document.documentElement) return;
    event.preventDefault();
    event.stopPropagation();
    if (props.commentEnabled) {
      sendCommentTarget(event, active);
      return;
    }
    selectElement(resolvePickTarget(active, event.altKey));
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
  selectElement(el);
}

function onScrollOrResize() {
  if (selectedEl.value) selectBox.value = readBbox(selectedEl.value);
}

defineExpose({ highlight, clearLocal });

watch(
  () => [props.enabled, props.commentEnabled] as const,
  ([enabled, commentEnabled], previous) => {
    if (!enabled && !commentEnabled && previous?.some(Boolean))
      clearLocal("mode-change");
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
