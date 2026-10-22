import type { AuthoringDiagnostic } from '../contracts/authoring-diagnostic.js';
import type { RuntimeCaptureManifest } from '../runtime-contract/index.js';
import type { RuntimeSemanticNode } from '../runtime-contract/protocol.js';
import { compareModeSemanticTrees } from '../runtime-contract/theme-probe-compare.js';
import type { ThemeIdentity } from '../theme/schema.js';
import type { RuntimeCaptureRequestPayload } from '../runtime-contract/protocol.js';

export type ThemeProbeRequest = (payload: {
  kind: string;
  expected?: unknown;
  requiredFragments?: unknown;
  fragments?: unknown;
}) => Promise<unknown>;

export type ThemeProbeTarget = {
  path: string;
  variantId: string;
  theme: string;
  mode: string;
  routeQuery?: Record<string, string>;
};

export type ThemeProbeOpen = (target: ThemeProbeTarget) => Promise<void>;

/** Only complete source fingerprints may opt into reuse. Failed probes never cache. */
export class ThemeProbeCache {
  private readonly entries = new Map<
    string,
    { expiresAt: number; result: Promise<AuthoringDiagnostic[]> }
  >();

  async run(
    key: string | undefined,
    probe: () => Promise<AuthoringDiagnostic[]>,
  ): Promise<AuthoringDiagnostic[]> {
    if (!key) return probe();
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > Date.now()) return existing.result;
    this.entries.delete(key);
    const result = probe();
    this.entries.set(key, { expiresAt: Date.now() + 300_000, result });
    if (this.entries.size > 32)
      this.entries.delete(this.entries.keys().next().value!);
    try {
      return await result;
    } catch (error) {
      this.entries.delete(key);
      throw error;
    }
  }
}

/**
 * Renders each selected Screen's default Variant in every declared theme and
 * mode, then compares semantic structure with the default combination.
 * Differences become blocking authoring diagnostics and are not Evidence.
 */
export async function probeThemeConsistency(input: {
  manifest: RuntimeCaptureManifest;
  screenIds: readonly string[];
  viewport: { width: number; height: number };
  open: ThemeProbeOpen;
  request: ThemeProbeRequest;
}): Promise<AuthoringDiagnostic[]> {
  const diagnostics: AuthoringDiagnostic[] = [];
  const screens = input.manifest.screens.filter((screen) =>
    input.screenIds.includes(screen.screenId),
  );
  for (const screen of screens) {
    const variant = screen.variants.find(
      (candidate) => candidate.variantId === screen.defaultVariantId,
    );
    if (!variant) continue;
    const snapshots = new Map<string, RuntimeSemanticNode[]>();
    for (const theme of input.manifest.theme.themes) {
      for (const mode of input.manifest.theme.modes) {
        const identity: ThemeIdentity = {
          packId: input.manifest.theme.packId,
          packDigest: input.manifest.theme.packDigest,
          theme,
          mode,
        };
        const key = `${theme}/${mode}`;
        await input.open({
          path: screen.path,
          variantId: screen.defaultVariantId,
          theme,
          mode,
          ...(variant.routeQuery ? { routeQuery: variant.routeQuery } : {}),
        });
        const preparePayload: RuntimeCaptureRequestPayload = {
          kind: 'prepare',
          expected: {
            prototypeId: screen.prototypeId,
            screenId: screen.screenId,
            variantId: screen.defaultVariantId,
            theme: identity,
          },
        };
        await input.request(preparePayload);
        const readinessPayload: RuntimeCaptureRequestPayload = {
          kind: 'readiness',
          expected: {
            prototypeId: screen.prototypeId,
            screenId: screen.screenId,
            variantId: screen.defaultVariantId,
            theme: identity,
            viewport: input.viewport,
          },
          requiredFragments: [],
        };
        await input.request(readinessPayload);
        const snapshot = (await input.request({
          kind: 'semantic-snapshot',
          fragments: [],
        })) as { payload?: { nodes?: RuntimeSemanticNode[] } };
        snapshots.set(key, snapshot.payload?.nodes ?? []);
      }
    }
    const baselineKey = `${input.manifest.theme.defaultTheme}/${input.manifest.theme.defaultMode}`;
    const baseline = snapshots.get(baselineKey) ?? [];
    for (const [key, nodes] of snapshots) {
      if (key === baselineKey) continue;
      const [theme, mode] = key.split('/');
      for (const divergence of compareModeSemanticTrees(baseline, nodes)) {
        diagnostics.push({
          diagnosticId: `theme-mode-divergence-${screen.screenId}-${theme}-${mode}-${divergence.nodeId.replace(/[^a-z0-9]+/gi, '-')}`,
          code: 'theme.mode-divergence',
          severity: 'block',
          message: `Screen ${screen.screenId} diverges between ${baselineKey} and ${key} at ${divergence.nodeId} (${divergence.fields.join(', ')}).`,
          caseIds: [],
          source: {
            kind: 'runtime',
            locator: `${screen.screenId}/${key}/${divergence.nodeId}`,
            screenId: screen.screenId,
          },
          nextAction:
            'Keep semantic structure identical across themes and modes. Move mode-specific resources onto asset.* keys.',
          details: {
            screenId: screen.screenId,
            baseline: baselineKey,
            combination: key,
            nodeId: divergence.nodeId,
            fields: divergence.fields,
          },
        });
      }
    }
  }
  return diagnostics;
}
