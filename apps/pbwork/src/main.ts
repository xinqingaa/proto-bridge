import { createApp } from "vue";
import { createPinia } from "pinia";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";
import "vuetify/styles";
import "@/app/styles.css";
import AppRoot from "@/app/AppRoot.vue";
import { router } from "@/app/router";
import { assertRegistriesValid } from "@/design-system/validateRegistries";
import { createVuetifyThemes } from "@/design-system/themes/createVuetifyThemes";

assertRegistriesValid();

const vuetify = createVuetify({
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: { mdi },
  },
  defaults: {
    VBtn: {
      rounded: "md",
      style: "text-transform: none; letter-spacing: normal;",
    },
    VTab: {
      style: "text-transform: none; letter-spacing: normal;",
    },
    VChip: {
      style: "text-transform: none; letter-spacing: normal;",
    },
    VTextField: {
      variant: "outlined",
      density: "comfortable",
      hideDetails: "auto",
    },
    VTextarea: {
      variant: "outlined",
      density: "comfortable",
      hideDetails: "auto",
    },
    VSelect: {
      variant: "outlined",
      density: "comfortable",
      hideDetails: "auto",
    },
  },
  theme: {
    defaultTheme: "workbenchLight",
    themes: createVuetifyThemes(),
  },
});

createApp(AppRoot).use(createPinia()).use(router).use(vuetify).mount("#app");
