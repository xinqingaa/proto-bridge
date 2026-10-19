export type DevicePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
};

/** Neutral simulated safe-area insets shared with Runtime CSS (not OS device claims) (CSS px). */
export const SAFE_TOP = 44;
export const SAFE_BOTTOM = 20;

/**
 * Visual bezel is a box-shadow on PhoneShell and does not change layout size.
 * Kept so older measurements can still name the retired chassis thickness.
 */
export const FRAME_BEZEL = 0;

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: "iphone-14",
    label: "通用手机 · 390 × 844",
    width: 390,
    height: 844,
  },
  {
    id: "iphone-se",
    label: "紧凑手机 · 375 × 667",
    width: 375,
    height: 667,
  },
  {
    id: "android-common",
    label: "窄屏手机 · 360 × 800",
    width: 360,
    height: 800,
  },
  {
    id: "iphone-14-pro-max",
    label: "大屏手机 · 430 × 932",
    width: 430,
    height: 932,
  },
];

export const DEFAULT_DEVICE_ID = "iphone-14";

export const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5] as const;

export function getDevicePreset(id: string): DevicePreset {
  return DEVICE_PRESETS.find((item) => item.id === id) ?? DEVICE_PRESETS[0]!;
}

/** Layout size of the phone shell. The bezel is a shadow, so it matches the viewport. */
export function getFrameOuterSize(device: DevicePreset): {
  width: number;
  height: number;
} {
  return {
    width: device.width,
    height: device.height,
  };
}
