<script setup lang="ts">
import { computed } from "vue";
import { SAFE_BOTTOM, SAFE_TOP } from "@/workbench/canvas/devices";

const props = withDefaults(
  defineProps<{
    width?: number;
    height?: number;
    dark?: boolean;
    /**
     * overlay: status and home indicator float over full-bleed content.
     * Canvas iframes stay at the device viewport.
     * inset: content sits between the two safe areas.
     */
    chrome?: "overlay" | "inset";
    time?: string;
    /** Runtime uses the same inset owner without drawing a second device frame. */
    frameless?: boolean;
  }>(),
  {
    width: 390,
    height: 844,
    dark: false,
    frameless: false,
    chrome: "inset",
  },
);

const screenStyle = computed(() => ({
  ...(props.frameless
    ? {}
    : { width: `${props.width}px`, height: `${props.height}px` }),
  "--phone-safe-top": `max(${SAFE_TOP}px, env(safe-area-inset-top, 0px))`,
  "--phone-safe-bottom": `max(${SAFE_BOTTOM}px, env(safe-area-inset-bottom, 0px))`,
}));

const statusTime = computed(() => props.time ?? "09:41");
</script>

<template>
  <div
    class="phone-shell"
    :class="[`is-${chrome}`, { 'is-dark': dark, 'is-frameless': frameless }]"
    :style="screenStyle"
    data-testid="phone-shell"
  >
    <div class="phone-screen" data-pb-phone-screen>
      <div
        class="status-bar"
        :style="{ height: 'var(--phone-safe-top)' }"
        aria-hidden="true"
      >
        <span v-if="!frameless" class="status-time">{{ statusTime }}</span>
        <span v-if="!frameless" class="status-trailing">
          <svg
            width="58"
            height="14"
            viewBox="0 0 58 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 12V9H3V12ZM5 12V6H7V12ZM9 12V3H11V12ZM13 12V1H15V12Z"
              fill="currentColor"
            />
            <path
              d="M20 4C24 0 30 0 34 4M23 7C25 5 29 5 31 7M26 10L27 11L28 10"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
            <rect
              x="39"
              y="2"
              width="16"
              height="10"
              rx="2"
              stroke="currentColor"
            />
            <rect
              x="41"
              y="4"
              width="12"
              height="6"
              rx="1"
              fill="currentColor"
            />
            <path d="M57 5V9" stroke="currentColor" stroke-linecap="round" />
          </svg>
        </span>
      </div>
      <div class="phone-body">
        <slot />
      </div>
      <div
        class="home-bar"
        :style="{ height: 'var(--phone-safe-bottom)' }"
        aria-hidden="true"
      >
        <span v-if="!frameless" class="home-indicator" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.phone-shell {
  position: relative;
  flex: 0 0 auto;
  overflow: clip;
  border-radius: 46px;
  background: #f4f5f7;
  box-shadow:
    0 0 0 10px #101114,
    0 0 0 11px #2a2c31,
    0 28px 56px rgba(0, 0, 0, 0.18);
}

.phone-shell.is-frameless {
  width: 100%;
  height: 100dvh;
  border-radius: 0;
  box-shadow: none;
  background: var(--pb-color-background);
}
.phone-shell.is-frameless .status-bar {
  padding: 0;
}
.phone-shell.is-frameless .phone-body {
  overflow: clip;
}
.phone-shell.is-dark:not(.is-frameless) {
  background: #101113;
}

.phone-screen {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  overflow: clip;
}

.phone-body {
  position: relative;
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.phone-shell.is-overlay .status-bar,
.phone-shell.is-overlay .home-bar {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 2;
  pointer-events: none;
}

.phone-shell.is-overlay .status-bar {
  top: 0;
}

.phone-shell.is-overlay .home-bar {
  bottom: 0;
}

.phone-shell.is-overlay .phone-body {
  position: absolute;
  inset: 0;
  overflow: clip;
}

.status-bar {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 22px 8px;
  color: rgba(15, 23, 42, 0.88);
  font:
    600 15px/1 system-ui,
    -apple-system,
    "PingFang SC",
    sans-serif;
}

.phone-shell.is-dark .status-bar {
  color: rgba(241, 245, 249, 0.92);
}

.status-trailing {
  display: flex;
  align-items: center;
  gap: 5px;
}

.home-bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
}

.home-indicator {
  width: 126px;
  height: 5px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.42);
}

.phone-shell.is-dark .home-indicator {
  background: rgba(241, 245, 249, 0.62);
}
</style>
