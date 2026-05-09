export function createEvidenceId(url: string, capturedAt: string): string {
  const slug = slugFromUrl(url);
  return `evidence_${slug}_${Date.parse(capturedAt).toString(36)}`;
}

function slugFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const route = parsed.hash.startsWith('#/') ? parsed.hash.slice(1).split('?')[0] : parsed.pathname;
    const last = route?.split('/').filter(Boolean).at(-1) ?? parsed.hostname;
    return sanitizeSlug(last);
  } catch {
    return sanitizeSlug(url);
  }
}

function sanitizeSlug(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    || 'page';
}
