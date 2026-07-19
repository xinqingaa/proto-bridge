export type DevicePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  /** In-screen decorative top chrome (does not change outer aspect ratio). */
  topChrome: "island" | "bar";
  /** Show in-screen home indicator overlay. */
  showHomeIndicator: boolean;
};

/** Unified safe-area insets injected into embedded Runtime (CSS px). */
export const SAFE_TOP = 44;
export const SAFE_BOTTOM = 20;

/** Physical bezel thickness around the screen (CSS px). */
export const FRAME_BEZEL = 12;

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: "iphone-14",
    label: "iPhone 14",
    width: 390,
    height: 844,
    topChrome: "island",
    showHomeIndicator: true,
  },
  {
    id: "iphone-se",
    label: "iPhone SE",
    width: 375,
    height: 667,
    topChrome: "bar",
    showHomeIndicator: false,
  },
  {
    id: "android-common",
    label: "Android 常见",
    width: 360,
    height: 800,
    topChrome: "bar",
    showHomeIndicator: true,
  },
  {
    id: "iphone-14-pro-max",
    label: "iPhone 14 Pro Max",
    width: 430,
    height: 932,
    topChrome: "island",
    showHomeIndicator: true,
  },
];

export const DEFAULT_DEVICE_ID = "iphone-14";

export const ZOOM_PRESETS = [0.5, 0.75, 1, 1.25, 1.5] as const;

export function getDevicePreset(id: string): DevicePreset {
  return DEVICE_PRESETS.find((item) => item.id === id) ?? DEVICE_PRESETS[0]!;
}

/** Outer chassis size = viewport + bezel only (preserves device aspect ratio). */
export function getFrameOuterSize(device: DevicePreset): {
  width: number;
  height: number;
} {
  return {
    width: device.width + FRAME_BEZEL * 2,
    height: device.height + FRAME_BEZEL * 2,
  };
}
