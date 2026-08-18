import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import type { ReviewArtifact } from '../../review/contracts.js';
import { FlutterReviewContract, type FlutterReviewContract as FlutterReviewContractType } from './resolver.js';

export const FLUTTER_COMPARATOR_VERSION = 'proto-bridge-pixel-regions-v1';

export async function readFlutterReviewContract(targetRoot: string): Promise<FlutterReviewContractType> {
  const root = await realpath(targetRoot);
  const parsed = JSON.parse(await readFile(path.join(root, 'proto-bridge.target.json'), 'utf8')) as { review?: unknown };
  return FlutterReviewContract.parse(parsed.review);
}

export function comparePngArtifacts(input: {
  source: Uint8Array;
  target: Uint8Array;
  owner: ReviewArtifact['owner'];
}): {
  comparable: boolean;
  reason?: string;
  normalizedDiffSignature?: string;
  diff?: { artifact: ReviewArtifact; bytes: Uint8Array };
  overlay?: { artifact: ReviewArtifact; bytes: Uint8Array };
} {
  let source: PNG;
  let target: PNG;
  try {
    source = PNG.sync.read(Buffer.from(input.source));
    target = PNG.sync.read(Buffer.from(input.target));
  } catch {
    return { comparable: false, reason: 'source-or-target-is-not-a-readable-png' };
  }
  if (source.width !== target.width || source.height !== target.height) {
    return { comparable: false, reason: `dimension-mismatch:${source.width}x${source.height}:${target.width}x${target.height}` };
  }
  const diff = new PNG({ width: source.width, height: source.height });
  const overlay = new PNG({ width: source.width, height: source.height });
  const signature = createHash('sha256');
  for (let index = 0; index < source.data.length; index += 4) {
    const delta = Math.max(
      Math.abs(source.data[index]! - target.data[index]!),
      Math.abs(source.data[index + 1]! - target.data[index + 1]!),
      Math.abs(source.data[index + 2]! - target.data[index + 2]!),
      Math.abs(source.data[index + 3]! - target.data[index + 3]!),
    );
    const changed = delta > 12;
    signature.update(changed ? '1' : '0');
    const gray = Math.round((source.data[index]! + source.data[index + 1]! + source.data[index + 2]!) / 3);
    diff.data[index] = changed ? 255 : gray;
    diff.data[index + 1] = changed ? 0 : gray;
    diff.data[index + 2] = changed ? 180 : gray;
    diff.data[index + 3] = 255;
    overlay.data[index] = Math.round((source.data[index]! + target.data[index]!) / 2);
    overlay.data[index + 1] = Math.round((source.data[index + 1]! + target.data[index + 1]!) / 2);
    overlay.data[index + 2] = Math.round((source.data[index + 2]! + target.data[index + 2]!) / 2);
    overlay.data[index + 3] = 255;
  }
  const diffBytes = PNG.sync.write(diff);
  const overlayBytes = PNG.sync.write(overlay);
  const artifact = (kind: 'diff' | 'overlay', bytes: Buffer): ReviewArtifact => ({
    kind, digest: sha256(bytes), mimeType: 'image/png', byteLength: bytes.byteLength,
    width: source.width, height: source.height, owner: input.owner,
    environment: { comparatorVersion: FLUTTER_COMPARATOR_VERSION },
  });
  return {
    comparable: true,
    normalizedDiffSignature: `sha256:${signature.update(`${source.width}x${source.height}`).digest('hex')}`,
    diff: { artifact: artifact('diff', diffBytes), bytes: diffBytes },
    overlay: { artifact: artifact('overlay', overlayBytes), bytes: overlayBytes },
  };
}

function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}
