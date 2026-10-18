<script setup lang="ts">
import { computed, provide, useId } from "vue";
import type { ThemeIdentity } from "@proto-bridge/core/v2";
import PhoneShell from "@/workbench/PhoneShell.vue";
import {
  DEFAULT_DEVICE_ID,
  getDevicePreset,
  SAFE_TOP,
  SAFE_BOTTOM,
} from "@/workbench/canvas/devices";
import {
  ThemeTableKey,
  useRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
import { useRuntimeVuetifyTheme } from "@/design-system/theme/vuetify-theme";
import { deviceViewportCss } from "./model";

const props = defineProps<{ identity: ThemeIdentity; scale: number }>();
// One prop commits the validated tuple atomically; synchronous theme watchers
// must never observe a new pack with the previous pack's theme.
const active = useRuntimeTheme(() => props.identity);
provide(ThemeTableKey, active.table);
const vuetify = useRuntimeVuetifyTheme(active.table);
const css = computed(() => deviceViewportCss(active.cssVars.value));
const defaults = computed(() =>
  Object.fromEntries(
    ["VTextField", "VTextarea", "VSelect"].map((name) => [
      name,
      { density: active.density.value },
    ]),
  ),
);
const device = getDevicePreset(DEFAULT_DEVICE_ID);
const hostId = `preview-host-${useId().replace(/[^a-zA-Z0-9_-]/g, "-")}`;
</script>
<template>
  <div
    class="preview-fit"
    :data-preview-scale="scale"
    :style="{
      width: `${device.width * scale + 24}px`,
      height: `${device.height * scale + 24}px`,
    }"
  >
    <div class="preview-frame">
      <div class="preview-scaled" :style="{ zoom: scale }">
        <PhoneShell
          :width="device.width"
          :height="device.height"
          :dark="identity.mode === 'dark'"
          chrome="overlay"
          time="09:41"
        >
          <div
            class="preview-surface"
            :style="css"
            v-bind="active.attributes.value"
          >
            <v-theme-provider :theme="vuetify" class="preview-theme">
              <v-defaults-provider :defaults="defaults">
                <div
                  :id="hostId"
                  class="preview-viewport"
                  data-preview-viewport
                  :style="{
                    '--preview-safe-top': `${SAFE_TOP}px`,
                    '--preview-safe-bottom': `${SAFE_BOTTOM}px`,
                  }"
                >
                  <div
                    class="preview-scroll"
                    data-preview-scroll
                    tabindex="0"
                    role="region"
                    aria-label="手机内容"
                  >
                    <slot :attach="`#${hostId}`" :table="active.table.value" />
                  </div>
                </div>
              </v-defaults-provider>
            </v-theme-provider>
          </div>
        </PhoneShell>
      </div>
    </div>
  </div>
</template>
<style scoped>
.preview-fit {
  position: relative;
  flex: none;
  margin: 0 auto;
}
.preview-frame {
  position: absolute;
  top: 12px;
  left: 12px;
}
.preview-scaled {
  position: relative;
}
.preview-surface,
.preview-viewport {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.preview-surface {
  background: var(--pb-color-background);
  color: var(--pb-color-on-background);
}
.preview-theme {
  display: contents;
}
.preview-viewport {
  position: relative;
  overflow: clip;
  container-type: size;
}
.preview-scroll {
  position: absolute;
  inset: var(--preview-safe-top) 0 var(--preview-safe-bottom);
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.preview-scroll::-webkit-scrollbar {
  display: none;
}
.preview-viewport :deep(.v-overlay-container) {
  position: absolute;
  inset: 0;
}
</style>
