import { defaultAdapterRegistry } from '../adapters/registry.js';
import type { TargetInspectCapabilityInput, TargetInspectCapabilityResult } from './types.js';

const DEFAULT_TARGET_ADAPTER = 'flutter-app';

export async function inspectTargetCapability(
  input: TargetInspectCapabilityInput,
): Promise<TargetInspectCapabilityResult> {
  const targetAdapter = defaultAdapterRegistry.getTarget(input.target.adapter ?? DEFAULT_TARGET_ADAPTER);
  const target = await targetAdapter.analyze({
    flutterRoot: input.target.root,
    prototypeModule: input.prototypeModule,
    screenId: input.screenId,
    route: input.route,
    targetModule: input.targetModule,
    sourceRoutes: input.sourceRoutes,
    sourceRouteRegistry: input.sourceRouteRegistry,
  });
  return {
    capability: 'target.inspect',
    target,
    warnings: target.warnings,
  };
}
