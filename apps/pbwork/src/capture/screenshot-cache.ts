import { captureServiceClient } from "@/capture/service-client";

const fullUrls = new Map<string, Promise<string>>();
const thumbUrls = new Map<string, Promise<string>>();
let active = 0;
const waiting: Array<() => void> = [];
const LIMIT = 3;

function gate<T>(run: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = () => {
      active += 1;
      run()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          waiting.shift()?.();
        });
    };
    if (active < LIMIT) start();
    else waiting.push(start);
  });
}

function identity(bundleId: string, blobId: string) {
  return `${bundleId}/${blobId}`;
}

/** Full screenshot for the one Case currently on screen. */
export function loadScreenshot(bundleId: string, blobId: string): Promise<string> {
  const key = identity(bundleId, blobId);
  const existing = fullUrls.get(key);
  if (existing) return existing;
  const pending = gate(() => captureServiceClient.blobUrl(bundleId, blobId));
  fullUrls.set(key, pending);
  pending.catch(() => {
    fullUrls.delete(key);
  });
  return pending;
}

/** Downscaled preview. The full bitmap is discarded after the thumbnail is drawn. */
export function loadThumbnail(
  bundleId: string,
  blobId: string,
  width = 84,
): Promise<string> {
  const key = `${identity(bundleId, blobId)}@${width}`;
  const existing = thumbUrls.get(key);
  if (existing) return existing;
  const pending = gate(() => drawThumbnail(bundleId, blobId, width));
  thumbUrls.set(key, pending);
  pending.catch(() => {
    thumbUrls.delete(key);
  });
  return pending;
}

async function drawThumbnail(
  bundleId: string,
  blobId: string,
  width: number,
): Promise<string> {
  const url = await captureServiceClient.blobUrl(bundleId, blobId);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, width / Math.max(1, image.naturalWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return url;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const thumbnail = canvas.toDataURL("image/jpeg", 0.72);
    URL.revokeObjectURL(url);
    return thumbnail;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
