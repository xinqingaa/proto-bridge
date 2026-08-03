import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

const serviceProxy = {
  "/__pb_v2": {
    target: `http://127.0.0.1:${process.env.PB_SERVICE_PORT ?? "3988"}`,
    changeOrigin: false,
    rewrite: (path: string) => path.replace(/^\/__pb_v2/, "/api/v2"),
  },
};

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    // Pre-bundle Vuetify auto-imports + zod so navigating/capturing screens
    // does not discover new deps mid-session and force a full page reload.
    include: [
      "zod",
      "vuetify/components/VAlert",
      "vuetify/components/VApp",
      "vuetify/components/VAppBar",
      "vuetify/components/VAvatar",
      "vuetify/components/VBottomSheet",
      "vuetify/components/VBreadcrumbs",
      "vuetify/components/VBtn",
      "vuetify/components/VBtnToggle",
      "vuetify/components/VCard",
      "vuetify/components/VCheckbox",
      "vuetify/components/VChip",
      "vuetify/components/VChipGroup",
      "vuetify/components/VDialog",
      "vuetify/components/VDivider",
      "vuetify/components/VForm",
      "vuetify/components/VGrid",
      "vuetify/components/VList",
      "vuetify/components/VMain",
      "vuetify/components/VMenu",
      "vuetify/components/VNavigationDrawer",
      "vuetify/components/VProgressCircular",
      "vuetify/components/VProgressLinear",
      "vuetify/components/VRadio",
      "vuetify/components/VRadioGroup",
      "vuetify/components/VSelect",
      "vuetify/components/VSheet",
      "vuetify/components/VSnackbar",
      "vuetify/components/VSwitch",
      "vuetify/components/VTabs",
      "vuetify/components/VTextarea",
      "vuetify/components/VTextField",
      "vuetify/components/VThemeProvider",
      "vuetify/components/VToolbar",
      "vuetify/components/VTooltip",
      "vuetify/components/VWindow",
    ],
    exclude: [
      "@proto-bridge/core/v2",
      "@proto-bridge/core/v2/prompts/agent-prompt",
      "@proto-bridge/core/v2/capture",
      "@proto-bridge/core/v2/runtime-contract",
      "@proto-bridge/core/v2/service-contract",
      "@proto-bridge/core/v2/store",
    ],
  },

  server: {
    host: "127.0.0.1",
    port: 3977,
    strictPort: true,
    proxy: serviceProxy,
  },
  preview: {
    host: "127.0.0.1",
    port: 3977,
    strictPort: true,
    proxy: serviceProxy,
  },
});
