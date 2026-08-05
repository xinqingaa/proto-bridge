import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { lstat, readFile, readlink } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { ReconstructionObligation } from '../review/obligations.js';
import {
  reviewVerifierReceiptDigest,
  type ReviewVerifierReceipt,
  type ReviewVerifierResult,
} from '../review/index.js';
import type { StructureIR } from '../v2/consumer-projection.js';
import { detectTargetAdapter } from './query.js';
import { verifyFlutterTargetClaims } from './flutter-app/claims.js';

const execFileAsync = promisify(execFile);
export const TARGET_CLAIM_CONTRACT_VERSION = 1 as const;

export type TargetOccurrenceLocator = {
  path: string;
  line: number;
  column?: number;
};

export type TargetImplementationClaim =
  | {
      obligationId: string;
      dimension: 'structure';
      caseId: string;
    }
  | {
      obligationId: string;
      dimension: 'components';
      symbol: string;
      occurrence: TargetOccurrenceLocator;
      ownerSymbol?: string;
      targetSlot?: string;
    }
  | {
      obligationId: string;
      dimension: 'tokens';
      accessor: string;
      occurrence: TargetOccurrenceLocator;
      ownerSymbol: string;
      targetSlot: string;
    };

export type ExpectedTargetStructure = {
  screenId: string;
  caseId: string;
  structure: StructureIR;
};

export type VerifyTargetClaimsInput = {
  targetRoot: string;
  expectedTargetHead: string;
  targetRevision: string;
  obligations: ReconstructionObligation[];
  claims: TargetImplementationClaim[];
  expectedStructures: ExpectedTargetStructure[];
};

export async function verifyTargetClaims(
  input: VerifyTargetClaimsInput,
): Promise<ReviewVerifierReceipt> {
  assertClaims(input.obligations, input.claims);
  const targetRoot = path.resolve(input.targetRoot);
  const identity = await targetIdentity(targetRoot);
  if (identity.head !== input.expectedTargetHead) {
    throw new Error(`Target commit drifted: expected ${input.expectedTargetHead}, received ${identity.head}.`);
  }
  const detection = await detectTargetAdapter(targetRoot);
  const results = detection.adapterId === 'flutter'
    ? await verifyFlutterTargetClaims({ ...input, targetRoot })
    : input.claims.map((claim): ReviewVerifierResult => ({
        obligationId: claim.obligationId,
        dimension: claim.dimension,
        status: 'unverified',
        detail: 'No applicable Target claim verifier is registered for this project.',
      }));
  const unsigned: Omit<ReviewVerifierReceipt, 'receiptDigest'> = {
    receiptVersion: TARGET_CLAIM_CONTRACT_VERSION,
    verifierId: detection.adapterId === 'flutter'
      ? 'proto-bridge-flutter-target-claims-v1'
      : 'proto-bridge-unsupported-target-claims-v1',
    adapterId: detection.adapterId,
    targetRevision: input.targetRevision,
    targetHead: identity.head,
    targetContentDigest: identity.contentDigest,
    results,
  };
  return { ...unsigned, receiptDigest: reviewVerifierReceiptDigest(unsigned) };
}

function assertClaims(
  obligations: ReconstructionObligation[],
  claims: TargetImplementationClaim[],
): void {
  if (claims.length === 0 || claims.length > 100) throw new Error('Target claim batch must contain 1..100 claims.');
  const requiredById = new Map(obligations.map((item) => [item.obligationId, item]));
  const ids = new Set<string>();
  for (const claim of claims) {
    const obligation = requiredById.get(claim.obligationId);
    if (!obligation || obligation.dimension !== claim.dimension) {
      throw new Error(`Target claim ${claim.obligationId} is not bound to a matching fixed obligation.`);
    }
    if (!['structure', 'components', 'tokens'].includes(claim.dimension)) {
      throw new Error(`Target claim dimension ${claim.dimension} is not supported by contract v1.`);
    }
    if (ids.has(claim.obligationId)) throw new Error(`Duplicate Target claim ${claim.obligationId}.`);
    ids.add(claim.obligationId);
    if (claim.dimension !== 'structure') {
      validateLocator(claim.occurrence);
    } else if (!obligation.caseIds.includes(claim.caseId)) {
      throw new Error(`Target Structure claim ${claim.obligationId} is not applicable to Case ${claim.caseId}.`);
    }
  }
}

function validateLocator(locator: TargetOccurrenceLocator): void {
  const normalized = locator.path.split(path.sep).join('/');
  if (
    path.isAbsolute(locator.path)
    || normalized.startsWith('../')
    || normalized.includes('/../')
    || !normalized.startsWith('lib/')
    || !normalized.endsWith('.dart')
    || !Number.isInteger(locator.line)
    || locator.line < 1
    || (locator.column !== undefined && (!Number.isInteger(locator.column) || locator.column < 1))
  ) throw new Error('Target occurrence must be a positive location inside lib/**/*.dart.');
}

async function targetIdentity(targetRoot: string): Promise<{ head: string; contentDigest: string }> {
  const head = (await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: targetRoot })).stdout.trim();
  const diff = (await execFileAsync('git', ['diff', '--binary', 'HEAD', '--'], { cwd: targetRoot, maxBuffer: 32 * 1024 * 1024 })).stdout;
  const untracked = (await execFileAsync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: targetRoot })).stdout
    .split('\0')
    .filter(Boolean)
    .sort();
  const hash = createHash('sha256').update(head).update('\0').update(diff);
  for (const relative of untracked) {
    const file = path.join(targetRoot, relative);
    const metadata = await lstat(file);
    hash.update('\0').update(relative).update('\0');
    if (metadata.isSymbolicLink()) hash.update('symlink\0').update(await readlink(file));
    else hash.update(await readFile(file));
  }
  return {
    head,
    contentDigest: `sha256:${hash.digest('hex')}`,
  };
}
