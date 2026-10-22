import { computed, inject } from "vue";
import { ThemeTableKey } from "@/design-system/theme/runtime-theme";
import type { YikeFace } from "./model";

export function useYikeRenderFace() {
  const table = inject(ThemeTableKey)!;
  return computed(() => table.value.identity.theme as YikeFace);
}
