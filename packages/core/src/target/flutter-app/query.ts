/**
 * V2 Target query boundary. It intentionally exports only read-only
 * convention/example APIs and never exports Planner, mapping or Capture code.
 */
export {
  getFlutterTargetConventions,
} from './conventions.js';
export type {
  AnalyzeFlutterTargetConventionsInput,
  FlutterComponentRole,
  FlutterTargetConventions,
} from './conventions.js';
export {
  findFlutterTargetExamples,
} from './examples.js';
export type {
  FindFlutterTargetExamplesInput,
  FlutterExampleRef,
} from './examples.js';
