import path from 'node:path';
import { detectTargetAdapter } from './query.js';
import {
  validateFlutterTargetChanges,
  type FlutterTargetValidationResult,
} from './flutter-app/validation/index.js';

export type ValidateTargetChangesInput = {
  targetRoot: string;
  gitBase?: string | undefined;
  allowedPaths?: string[] | undefined;
  expectedFiles?: string[] | undefined;
  validationHints?: string[] | undefined;
};

export type TargetValidationResult =
  | ({ adapterId: 'flutter'; supported: true } & FlutterTargetValidationResult)
  | {
      adapterId: 'unsupported';
      supported: false;
      targetRoot: string;
      status: 'needs-review';
      changedFiles: string[];
      outsideAllowedPaths: string[];
      missingExpectedFiles: string[];
      fileIssues: [];
      validationHints: string[];
    };

export async function validateTargetChanges(
  input: ValidateTargetChangesInput,
): Promise<TargetValidationResult> {
  const targetRoot = path.resolve(input.targetRoot);
  const detection = await detectTargetAdapter(targetRoot);
  if (detection.adapterId !== 'flutter') {
    return {
      adapterId: 'unsupported',
      supported: false,
      targetRoot,
      status: 'needs-review',
      changedFiles: [],
      outsideAllowedPaths: [],
      missingExpectedFiles: [],
      fileIssues: [],
      validationHints: ['No applicable Target adapter is registered for this project.'],
    };
  }
  return {
    adapterId: 'flutter',
    supported: true,
    ...(await validateFlutterTargetChanges({
      targetRoot,
      ...(input.gitBase ? { gitBase: input.gitBase } : {}),
      ...(input.allowedPaths ? { allowedPaths: input.allowedPaths } : {}),
      ...(input.expectedFiles ? { expectedFiles: input.expectedFiles } : {}),
      ...(input.validationHints ? { validationHints: input.validationHints } : {}),
    })),
  };
}
