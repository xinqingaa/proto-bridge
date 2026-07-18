import { createApp } from "vue";
import { createPinia } from "pinia";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "vuetify/styles";
import "@/app/styles.css";
import AppRoot from "@/app/AppRoot.vue";
import { router } from "@/app/router";

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: "pbworkLight",
    themes: {
      pbworkLight: {
        dark: false,
        colors: {
          background: "#f4f7f6",
          surface: "#ffffff",
          primary: "#0b7a75",
          secondary: "#4b5563",
          error: "#b42318",
          info: "#2563eb",
          success: "#167c4d",
          warning: "#9a6700",
        },
      },
      pbworkDark: {
        dark: true,
        colors: {
          background: "#151b1b",
          surface: "#202827",
          primary: "#53d7cd",
          secondary: "#b7c4c2",
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
