import {
  comparePngArtifacts,
  FLUTTER_COMPARATOR_VERSION,
  readFlutterReviewContract,
} from './flutter-app/review.js';

export { FLUTTER_COMPARATOR_VERSION, readFlutterReviewContract };

export function compareTargetArtifacts(
  ...args: Parameters<typeof comparePngArtifacts>
): ReturnType<typeof comparePngArtifacts> {
  return comparePngArtifacts(...args);
}
