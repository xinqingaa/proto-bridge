<script setup lang="ts">
import { computed } from "vue";
import {
  FRAME_BEZEL,
  SAFE_BOTTOM,
  SAFE_TOP,
  type DevicePreset,
} from "@/workbench/canvas/devices";

const props = defineProps<{
  device: DevicePreset;
  title: string;
  src: string;
  isDark: boolean;
  pointerEvents: "auto" | "none";
}>();

const emit = defineEmits<{
  load: [];
}>();

const outerStyle = computed(() => ({
  width: `${props.device.width + FRAME_BEZEL * 2}px`,
  height: `${props.device.height + FRAME_BEZEL * 2}px`,
  padding: `${FRAME_BEZEL}px`,
}));

const screenStyle = computed(() => ({
  width: `${props.device.width}px`,
  height: `${props.device.height}px`,
}));

const statusTime = computed(() => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
});
</script>

<template>
  <div class="device-shell">
    <div class="device-chassis" :style="outerStyle">
      <span class="side-btn side-btn-silent" aria-hidden="true" />
      <span class="side-btn side-btn-vol-up" aria-hidden="true" />
      <span class="side-btn side-btn-vol-down" aria-hidden="true" />
      <span class="side-btn side-btn-power" aria-hidden="true" />

      <div class="device-screen" :style="screenStyle">
        <iframe
          class="device-iframe"
          :src="src"
          :title="title"
          :width="device.width"
          :height="device.height"
          :style="{
            width: `${device.width}px`,
            height: `${device.height}px`,
            pointerEvents,
          }"
          data-testid="prototype-iframe"
          @load="emit('load')"
        />

        <!-- In-screen decorative chrome: does not change outer aspect ratio -->
        <div
          class="status-overlay"
          :class="[`chrome-${device.topChrome}`, { 'is-dark': isDark }]"
          :style="{ height: `${SAFE_TOP}px` }"
          aria-hidden="true"
        >
          <span class="status-time">{{ statusTime }}</span>
          <span v-if="device.topChrome === 'island'" class="dynamic-island" />
          <span class="status-trailing">
            <span class="sig" />
            <span class="wifi" />
            <span class="batt" />
          </span>
        </div>

        <div
          v-if="device.showHomeIndicator"
          class="home-overlay"
          :class="{ 'is-dark': isDark }"
          :style="{ height: `${SAFE_BOTTOM}px` }"
          aria-hidden="true"
        >
          <span class="home-indicator" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 24px 40px rgba(15, 23, 42, 0.26));
}

.device-chassis {
  position: relative;
  box-sizing: border-box;
  border-radius: 40px;
  background: linear-gradient(145deg, #3a3a3c 0%, #1c1c1e 42%, #0c0c0d 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 0 rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(0, 0, 0, 0.5);
}

.side-btn {
  position: absolute;
  background: #2a2a2c;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.side-btn-silent {
  left: -2px;
  top: 112px;
  width: 3px;
  height: 26px;
  border-radius: 2px 0 0 2px;
}

.side-btn-vol-up {
  left: -2px;
  top: 160px;
  width: 3px;
  height: 48px;
  border-radius: 2px 0 0 2px;
}

.side-btn-vol-down {
  left: -2px;
  top: 220px;
  width: 3px;
  height: 48px;
  border-radius: 2px 0 0 2px;
}

.side-btn-power {
  right: -2px;
  top: 188px;
  width: 3px;
  height: 78px;
  border-radius: 0 2px 2px 0;
}

.device-screen {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  background: #000;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.device-iframe {
  display: block;
  border: 0;
  background: #fff;
}

.status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 20px;
  pointer-events: none;
  color: rgba(15, 23, 42, 0.88);
  font: 600 13px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui,
    sans-serif;
  letter-spacing: -0.01em;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.55) 0%,
    rgba(255, 255, 255, 0.12) 65%,
    transparent 100%
  );
}

.status-overlay.chrome-island {
  padding-top: 4px;
}
.status-overlay.is-dark {
  color: rgba(241, 245, 249, 0.92);
  background: linear-gradient(
    180deg,
    rgba(18, 24, 32, 0.72) 0%,
    rgba(18, 24, 32, 0.16) 65%,
    transparent 100%
  );
}

.status-time {
  justify-self: start;
}

.status-trailing {
  justify-self: end;
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
  width: 20px;
  height: 9px;
  border-radius: 2.5px;
  box-shadow: inset 0 0 0 1.3px currentColor;
  position: relative;
}

.batt::after {
  content: "";
  position: absolute;
  right: -2.5px;
  top: 2px;
  width: 2px;
  height: 5px;
  border-radius: 0 1px 1px 0;
  background: currentColor;
}

.batt::before {
  content: "";
  position: absolute;
  inset: 1.5px 2.5px 1.5px 1.5px;
  border-radius: 1px;
  background: currentColor;
}

.dynamic-island {
  width: 110px;
  height: 30px;
  border-radius: 18px;
  background: #0a0a0a;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  justify-self: center;
}

.home-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 7px;
  pointer-events: none;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.05) 0%,
    transparent 100%
  );
}

.home-indicator {
  width: 118px;
  height: 4px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.45);
}
.home-overlay.is-dark .home-indicator {
  background: rgba(241, 245, 249, 0.62);
}
</style>
