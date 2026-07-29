import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

const serviceProxy = {
  "/__pb_v2": {
    target: `http://127.0.0.1:${process.env.PB_V2_SERVICE_PORT ?? "3988"}`,
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
    exclude: [
      "@proto-bridge/core/v2",
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
