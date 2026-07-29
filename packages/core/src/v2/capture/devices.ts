import type { DeviceId } from '../contracts/ids.js';
import { V2ContractError } from '../contracts/errors.js';

export type CaptureDeviceProfile = {
  deviceId: DeviceId;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
};

const DEVICE_PROFILES: Readonly<Record<string, CaptureDeviceProfile>> = {
  'iphone-14': {
    deviceId: 'iphone-14',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
};

export function resolveCaptureDevice(deviceId: DeviceId): CaptureDeviceProfile {
  const profile = DEVICE_PROFILES[deviceId];
  if (!profile) {
    throw new V2ContractError(
      'unknown-reference',
      `Capture Device ${deviceId} is not registered in Core.`,
      deviceId,
    );
  }
  return profile;
}

export function listCaptureDevices(): CaptureDeviceProfile[] {
  return Object.values(DEVICE_PROFILES);
}
