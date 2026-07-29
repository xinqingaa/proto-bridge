import path from 'node:path';
import type {
  BlobId,
  BundleId,
  CaseEvidenceRevisionId,
  CatalogRevisionId,
  HandoffId,
  JobId,
  RunId,
  SnapshotId,
  StalenessReportId,
} from '../contracts/ids.js';

/**
 * On-disk layout for one Workspace root. Not part of the cross-component
 * V2 Contract (pb-v2-implementation-guide.md "不在计划中固定目录..."): this
 * is a `LocalFileStore` implementation detail, callers only ever go through
 * the `V2Store` interface.
 */
export function workspaceManifestPath(root: string): string {
  return path.join(root, 'workspace.json');
}

export function writerLockPath(root: string): string {
  return path.join(root, '.lock');
}

export function bundleDir(root: string, bundleId: BundleId): string {
  return path.join(root, 'bundles', bundleId);
}

export function bundleManifestPath(root: string, bundleId: BundleId): string {
  return path.join(bundleDir(root, bundleId), 'bundle.json');
}

export function activeSnapshotPointerPath(root: string, bundleId: BundleId): string {
  return path.join(bundleDir(root, bundleId), 'active-snapshot.json');
}

export function runPath(root: string, bundleId: BundleId, runId: RunId): string {
  return path.join(bundleDir(root, bundleId), 'runs', `${runId}.json`);
}

export function runsDir(root: string, bundleId: BundleId): string {
  return path.join(bundleDir(root, bundleId), 'runs');
}

export function evidenceRevisionPath(root: string, bundleId: BundleId, revisionId: CaseEvidenceRevisionId): string {
  return path.join(bundleDir(root, bundleId), 'revisions', `${revisionId}.json`);
}

export function evidenceRevisionsDir(root: string, bundleId: BundleId): string {
  return path.join(bundleDir(root, bundleId), 'revisions');
}

export function snapshotPath(root: string, bundleId: BundleId, snapshotId: SnapshotId): string {
  return path.join(bundleDir(root, bundleId), 'snapshots', `${snapshotId}.json`);
}

export function snapshotsDir(root: string, bundleId: BundleId): string {
  return path.join(bundleDir(root, bundleId), 'snapshots');
}

export function jobPath(root: string, jobId: JobId): string {
  return path.join(root, 'jobs', `${jobId}.json`);
}

export function jobsDir(root: string): string {
  return path.join(root, 'jobs');
}

export function bundlesDir(root: string): string {
  return path.join(root, 'bundles');
}

export function stalenessReportPath(root: string, reportId: StalenessReportId): string {
  return path.join(root, 'staleness-reports', `${reportId}.json`);
}

export function handoffPath(root: string, handoffId: HandoffId): string {
  return path.join(root, 'handoffs', `${handoffId}.json`);
}

export function handoffsDir(root: string): string {
  return path.join(root, 'handoffs');
}

export function stalenessReportsDir(root: string): string {
  return path.join(root, 'staleness-reports');
}

export function catalogRevisionPath(root: string, bundleId: BundleId, catalogRevisionId: CatalogRevisionId): string {
  return path.join(bundleDir(root, bundleId), 'catalogs', `${catalogRevisionId}.json`);
}

export function catalogRevisionsDir(root: string, bundleId: BundleId): string {
  return path.join(bundleDir(root, bundleId), 'catalogs');
}

export function blobRecordPath(root: string, bundleId: BundleId, blobId: BlobId): string {
  return path.join(bundleDir(root, bundleId), 'blobs', `${blobId}.json`);
}

export function blobContentPath(root: string, bundleId: BundleId, blobId: BlobId): string {
  return path.join(bundleDir(root, bundleId), 'blobs', `${blobId}.bin`);
}

export function blobsDir(root: string, bundleId: BundleId): string {
  return path.join(bundleDir(root, bundleId), 'blobs');
}

export function stagingDir(root: string): string {
  return path.join(root, '.staging');
}
