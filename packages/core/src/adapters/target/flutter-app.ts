import { analyzeFlutterContext } from './flutter-app/flutter-context.js';
import { buildFlutterImplementationPlan } from './flutter-app/flutter-implementation-plan.js';
import { mapTokens } from './flutter-app/token-mapper.js';
import type { TargetAdapter } from '../types.js';

export const flutterAppTargetAdapter: TargetAdapter = {
  id: 'flutter-app',
  technology: 'flutter',
  analyze: analyzeFlutterContext,
  mapTokens,
  buildImplementationPlan: buildFlutterImplementationPlan,
};
