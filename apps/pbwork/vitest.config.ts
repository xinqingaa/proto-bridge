import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import { themeAssetsPlugin } from "./build/theme-assets";

export default defineConfig({
  plugins: [themeAssetsPlugin(), vue(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    server: {
      deps: {
        inline: ["vuetify"],
      },
    },
  },
});
