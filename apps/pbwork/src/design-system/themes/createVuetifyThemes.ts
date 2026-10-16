import { resolveRuntimeTheme } from "@/design-system/theme/runtime-theme";
import { runtimeVuetifyTheme } from "@/design-system/theme/vuetify-theme";
import { workbenchThemes } from "./workbench-themes";
export function createVuetifyThemes() {
  return {
    ...workbenchThemes,
    pbworkLight: runtimeVuetifyTheme(
      resolveRuntimeTheme("pbwork-base", "default", "light"),
    ),
    pbworkDark: runtimeVuetifyTheme(
      resolveRuntimeTheme("pbwork-base", "default", "dark"),
    ),
  };
}
