import { shallowRef } from "vue";
import type { ThemeIdentity } from "@proto-bridge/core/v2";

const fixed = shallowRef<{ prototypeId: string; theme: ThemeIdentity } | null>(
  null,
);

/** prepare pins rendering dimensions; business preferences still accept real writes. */
export function pinCaptureTheme(prototypeId: string, theme: ThemeIdentity) {
  fixed.value = { prototypeId, theme: { ...theme } };
}

export function fixedCaptureTheme(prototypeId: string): ThemeIdentity | null {
  return fixed.value?.prototypeId === prototypeId ? fixed.value.theme : null;
}

export function clearCaptureTheme() {
  fixed.value = null;
}
