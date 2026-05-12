import type { JsonObject, JsonValue, GeneratedPage } from '../types.js';

export const WORKFLOW_GUIDE_URI = 'proto-bridge://workflow/ui-reconstruction-guide';
export const TOOL_CATALOG_URI = 'proto-bridge://workflow/tool-catalog';
export const LATEST_ARTIFACTS_URI = 'proto-bridge://artifacts/latest';

export type ArtifactResource = {
  uri: string;
  name: string;
  mimeType: string;
};

export function pageCanonicalUri(pageId: string): string {
  return `proto-bridge://pages/${pageId}/page-canonical`;
}

export function pageDebugIndexUri(pageId: string): string {
  return `proto-bridge://pages/${pageId}/page-debug-index`;
}

export function pageScreenshotUri(pageId: string, name: string): string {
  return `proto-bridge://pages/${pageId}/screenshot/${encodeURIComponent(name)}`;
}

export function uiBuildPlanUri(pageId: string): string {
  return `proto-bridge://pages/${pageId}/ui-build-plan`;
}

export function uiBuildReviewUri(pageId: string): string {
  return `proto-bridge://pages/${pageId}/ui-build-review`;
}

export function pageResources(page: GeneratedPage): ArtifactResource[] {
  return [
    {
      uri: pageCanonicalUri(page.id),
      name: `ProtoBridge page canonical ${page.id}`,
      mimeType: 'application/json',
    },
    {
      uri: pageDebugIndexUri(page.id),
      name: `ProtoBridge page debug index ${page.id}`,
      mimeType: 'application/json',
    },
    ...page.page.screenshots.map((screenshot) => ({
      uri: pageScreenshotUri(page.id, screenshot.name),
      name: `ProtoBridge screenshot ${page.id}/${screenshot.name}`,
      mimeType: 'image/png',
    })),
    ...(page.files.uiBuildPlan
      ? [{
        uri: uiBuildPlanUri(page.id),
        name: `ProtoBridge UI build plan ${page.id}`,
        mimeType: 'application/json',
      }]
      : []),
    ...(page.files.uiBuildReview
      ? [{
        uri: uiBuildReviewUri(page.id),
        name: `ProtoBridge UI build review ${page.id}`,
        mimeType: 'text/markdown',
      }]
      : []),
  ];
}

export function createArtifactToolResponse(input: {
  pageId: string;
  artifactSetId: string;
  planId?: string | undefined;
  files: JsonObject;
  resources: ArtifactResource[];
  warnings?: string[] | undefined;
  nextActions?: string[] | undefined;
  summary?: JsonObject | undefined;
}): JsonObject {
  return {
    pageId: input.pageId,
    artifactSetId: input.artifactSetId,
    ...(input.planId ? { planId: input.planId } : {}),
    files: input.files,
    resources: input.resources as unknown as JsonValue[],
    warnings: input.warnings ?? [],
    nextActions: input.nextActions ?? [],
    summary: input.summary ?? {},
  };
}

export function artifactSetId(pageId: string, phase: string): string {
  return `${pageId}:${phase}:${Date.now().toString(36)}`;
}
