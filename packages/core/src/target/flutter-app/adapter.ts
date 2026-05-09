import { analyzeFlutterContext } from './context.js';
import { buildFlutterImplementationPlan } from './planning/migration-planner.js';
import { renderFlutterMigrationSpec } from './planning/render-migration-markdown.js';
import { buildFlutterRecommendations } from './planning/migration-recommendations.js';
import { mapTokens } from './theme-mapping.js';
import type { TargetAdapter } from '../../adapters/types.js';

export const flutterAppTargetAdapter: TargetAdapter = {
  id: 'flutter-app',
  technology: 'flutter',
  analyze: analyzeFlutterContext,
  mapTokens,
  buildImplementationPlan: buildFlutterImplementationPlan,
  buildRecommendations: buildFlutterRecommendations,
  renderMigrationSpec: renderFlutterMigrationSpec,
};
