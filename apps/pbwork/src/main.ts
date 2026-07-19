import { createApp } from "vue";
import { createPinia } from "pinia";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "vuetify/styles";
import "@/app/styles.css";
import AppRoot from "@/app/AppRoot.vue";
import { router } from "@/app/router";
import { assertRegistriesValid } from "@/design-system/validateRegistries";

assertRegistriesValid();

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "pbworkLight",
    themes: {
      pbworkLight: {
        dark: false,
        colors: {
          background: "#f5f8fc",
          surface: "#ffffff",
          primary: "#2563eb",
          secondary: "#5b6b7c",
          error: "#b42318",
          info: "#2563eb",
          success: "#167c4d",
          warning: "#9a6700",
        },
      },
      pbworkDark: {
        dark: true,
        colors: {
          background: "#121820",
          surface: "#1b2430",
          primary: "#7aa7ff",
          secondary: "#b7c4d4",
          error: "#ffb4ab",
          info: "#a9c7ff",
          success: "#8ee7b0",
          warning: "#f5cf78",
        },
      },
    },
  },
});

createApp(AppRoot).use(createPinia()).use(router).use(vuetify).mount("#app");
