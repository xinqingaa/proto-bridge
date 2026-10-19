<script setup lang="ts">
import { computed, provide, reactive } from "vue";
import { VApp } from "vuetify/components";
import {
  ThemeTableKey,
  useRuntimeTheme,
} from "../../src/design-system/theme/runtime-theme";
import { useRuntimeVuetifyTheme } from "../../src/design-system/theme/vuetify-theme";
import {
  createPreviewDevice,
  deviceViewportCss,
} from "../../src/workbench/preview/model";
import Composition from "../../src/prototypes/yike/previews/CompositionPreview.vue";
const query = new URLSearchParams(location.search);
const theme = query.get("theme") ?? "mechanical",
  mode = query.get("mode") ?? "light";
const { table, cssVars } = useRuntimeTheme({ packId: "yike", theme, mode });
provide(ThemeTableKey, table);
const vuetify = useRuntimeVuetifyTheme(table);
const devices = reactive(
  ["A", "B"].map((id) =>
    createPreviewDevice(id, { contextId: "prototype:yike", theme, mode }),
  ),
);
const vars = computed(() => deviceViewportCss(cssVars.value));
const compact = query.has("compact");
const states = [
  { id: "weekly", label: "周频率" },
  { id: "reminder", label: "提醒状态" },
  { id: "failure", label: "失败状态" },
];
</script>
<template>
  <VApp :theme="vuetify"
    ><p>一刻B3检查夹具 · 独立内存状态，不进入Capture</p>
    <div class="devices">
      <div
        v-for="device in devices"
        :id="`host-${device.id}`"
        :key="device.id"
        class="phone"
        :class="{ compact }"
        :style="vars"
      >
        <div class="phone-content">
          <Composition
            :device="device"
            :attach="`#host-${device.id}`"
            :states="states"
          />
        </div>
      </div></div
  ></VApp>
</template>
<style scoped>
.devices {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.phone {
  position: relative;
  isolation: isolate;
  container-type: size;
  width: 390px;
  height: 700px;
  overflow: hidden;
  box-sizing: border-box;
  background: var(--pb-color-background);
  color: var(--pb-color-on-surface);
}
.phone-content {
  height: 100%;
  overflow: auto;
  padding: 16px;
  box-sizing: border-box;
}
.phone.compact {
  height: 480px;
}
</style>
