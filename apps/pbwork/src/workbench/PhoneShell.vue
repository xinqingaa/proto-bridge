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
  }>(),
  {
    width: 390,
    height: 844,
    dark: false,
    chrome: "inset",
  },
);

const screenStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}));

const statusTime = computed(() => {
  if (props.time) return props.time;
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
});
</script>

<template>
  <div
    class="phone-shell"
    :class="[`is-${chrome}`, { 'is-dark': dark }]"
    :style="screenStyle"
    data-testid="phone-shell"
  >
    <div class="phone-screen" data-pb-phone-screen>
      <div
        class="status-bar"
        :style="{ height: `${SAFE_TOP}px` }"
        aria-hidden="true"
      >
        <span class="status-time">{{ statusTime }}</span>
        <span class="status-trailing">
          <span class="sig" />
          <span class="wifi" />
          <span class="batt" />
        </span>
      </div>
      <div class="phone-body">
        <slot />
      </div>
      <div
        class="home-bar"
        :style="{ height: `${SAFE_BOTTOM}px` }"
        aria-hidden="true"
      >
        <span class="home-indicator" />
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

.phone-shell.is-dark {
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
  font: 600 15px/1 system-ui, -apple-system, "PingFang SC", sans-serif;
}

.phone-shell.is-overlay .status-bar {
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.72) 0%,
    rgba(255, 255, 255, 0) 100%
  );
}

.phone-shell.is-dark .status-bar {
  color: rgba(241, 245, 249, 0.92);
}

.phone-shell.is-overlay.is-dark .status-bar {
  background: linear-gradient(
    180deg,
    rgba(16, 17, 19, 0.72) 0%,
    rgba(16, 17, 19, 0) 100%
  );
}

.status-trailing {
  display: flex;
  align-items: center;
  gap: 5px;
}

.sig,
.wifi,
.batt {
  display: block;
  background: currentColor;
}

.sig {
  width: 15px;
  height: 9px;
  clip-path: polygon(
    0 100%,
    20% 70%,
    20% 100%,
    40% 55%,
    40% 100%,
    60% 35%,
    60% 100%,
    80% 15%,
    80% 100%,
    100% 0,
    100% 100%
  );
}

.wifi {
  width: 13px;
  height: 9px;
  border-radius: 50%;
  background: transparent;
  box-shadow:
    inset 0 0 0 1.4px currentColor,
    0 -2.5px 0 -1px currentColor;
  transform: translateY(2px);
}

.batt {
  position: relative;
  width: 20px;
  height: 9px;
  border-radius: 2.5px;
  box-shadow: inset 0 0 0 1.3px currentColor;
  background: transparent;
}

.batt::before {
  content: "";
  position: absolute;
  inset: 1.5px 3px 1.5px 1.5px;
  border-radius: 1px;
  background: currentColor;
}

.batt::after {
  content: "";
  position: absolute;
  top: 2px;
  right: -2.5px;
  width: 2px;
  height: 5px;
  border-radius: 0 1px 1px 0;
  background: currentColor;
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
