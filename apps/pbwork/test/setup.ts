import { config } from "@vue/test-utils";
import { shallowRef } from "vue";
import {
  ThemeTableKey,
  resolveRuntimeTheme,
} from "@/design-system/theme/runtime-theme";
// Component tests receive the same explicit provider as Runtime and Playground.
config.global.provide = {
  ...config.global.provide,
  [ThemeTableKey as symbol]: shallowRef(
    resolveRuntimeTheme("pbwork-base", "default", "light"),
  ),
};
