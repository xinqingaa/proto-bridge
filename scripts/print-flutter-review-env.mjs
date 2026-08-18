import { createHash } from 'node:crypto';
import path from 'node:path';
import { readTargetIdentity } from '../packages/core/dist/target/index.js';

const targetArgument = process.argv.slice(2).find((argument) => argument !== '--');
const targetRoot = path.resolve(targetArgument ?? 'apps/flutter_pb_app');
const identity = await readTargetIdentity(targetRoot);
const appBuildDigest = `sha256:${createHash('sha256').update(JSON.stringify({
  targetCommit: identity.head,
  targetContentDigest: identity.contentDigest,
  reviewHarnessVersion: '2',
})).digest('hex')}`;
const flutterArgs = [
  '--dart-define=PB_REVIEW_MODE=true',
  `--dart-define=PB_TARGET_COMMIT=${identity.head}`,
  `--dart-define=PB_TARGET_CONTENT_DIGEST=${identity.contentDigest}`,
  `--dart-define=PB_APP_BUILD_DIGEST=${appBuildDigest}`,
];

process.stdout.write(`${JSON.stringify({
  targetRoot,
  targetCommit: identity.head,
  targetContentDigest: identity.contentDigest,
  appBuildDigest,
  flutterArgs,
}, null, 2)}\n`);
