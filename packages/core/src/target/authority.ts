import {
  inspectFlutterTargetAuthority,
} from './flutter-app/resolver.js';
import type { TargetAdapterAuthorityInspection } from './readiness.js';

export type InspectTargetAuthorityInput = {
  targetRoot: string;
  gitBase?: string;
  excludePaths?: string[];
  candidateOutputRoot?: string;
};

/**
 * Public Target authority inspection. Dispatches to the applicable adapter
 * (currently only Flutter; others return unsupported via the Flutter probe).
 */
export async function inspectTargetAuthority(
  input: InspectTargetAuthorityInput,
): Promise<TargetAdapterAuthorityInspection> {
  return inspectFlutterTargetAuthority({
    targetRoot: input.targetRoot,
    ...(input.gitBase ? { gitBase: input.gitBase } : {}),
    ...(input.excludePaths ? { excludePaths: input.excludePaths } : {}),
    ...(input.candidateOutputRoot ? { candidateOutputRoot: input.candidateOutputRoot } : {}),
  });
}
