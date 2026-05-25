import { defaultAdapterRegistry } from '../adapters/registry.js';
import type { SourceAnalyzeCapabilityInput, SourceAnalyzeCapabilityResult } from './types.js';

const DEFAULT_SOURCE_ADAPTER = 'vue3-prototype';

export async function analyzeSourceCapability(
  input: SourceAnalyzeCapabilityInput,
): Promise<SourceAnalyzeCapabilityResult> {
  const sourceAdapter = defaultAdapterRegistry.getSource(input.source.adapter ?? DEFAULT_SOURCE_ADAPTER);
  const source = await sourceAdapter.analyze({
    prototypeRoot: input.source.root,
    route: input.route,
    vue: input.vue,
    restorationProfile: input.restorationProfile,
  });
  return {
    capability: 'source.analyze',
    source,
    warnings: source.warnings,
  };
}
