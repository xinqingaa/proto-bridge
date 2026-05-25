import path from 'node:path';
import { genericProfile } from './generic.js';
import { youfiProfile } from './youfi.js';
import type {
  ResolvedRestorationProfile,
  RestorationProfile,
  RestorationProfileArtifact,
  RestorationProfileConfig,
  RestorationProfileMode,
} from './types.js';

const PROFILES = [genericProfile, youfiProfile];

export function resolveRestorationProfile(input: {
  configured?: RestorationProfileConfig | undefined;
  targetRoot?: string | undefined;
}): ResolvedRestorationProfile {
  const configured = input.configured;
  const warnings: string[] = [];

  if (configured === false || configured === 'generic') {
    return resolved(genericProfile, 'generic', undefined, warnings);
  }

  if (configured && configured !== 'auto') {
    const profile = findProfile(configured);
    if (profile) return resolved(profile, 'explicit', undefined, warnings);
    warnings.push(`Unknown restoration profile "${configured}"; falling back to generic.`);
    return resolved(genericProfile, 'generic', undefined, warnings);
  }

  const targetName = input.targetRoot ? path.basename(path.resolve(input.targetRoot)) : undefined;
  if (targetName) {
    const profile = findProfile(targetName);
    if (profile && profile.id !== 'generic') return resolved(profile, 'auto', targetName, warnings);
  }

  return resolved(genericProfile, 'generic', targetName, warnings);
}

export function restorationProfileArtifact(
  profile: ResolvedRestorationProfile,
): RestorationProfileArtifact {
  return {
    id: profile.id,
    mode: profile.mode,
    inferredFrom: profile.inferredFrom,
    warnings: [...profile.warnings],
  };
}

export function listRestorationProfiles(): RestorationProfile[] {
  return [...PROFILES];
}

function findProfile(idOrAlias: string): RestorationProfile | undefined {
  const normalized = idOrAlias.toLowerCase();
  return PROFILES.find((profile) =>
    profile.id.toLowerCase() === normalized
    || profile.aliases?.some((alias) => alias.toLowerCase() === normalized),
  );
}

function resolved(
  profile: RestorationProfile,
  mode: RestorationProfileMode,
  inferredFrom: string | undefined,
  warnings: string[],
): ResolvedRestorationProfile {
  return {
    profile,
    id: profile.id,
    mode,
    inferredFrom,
    warnings,
  };
}
