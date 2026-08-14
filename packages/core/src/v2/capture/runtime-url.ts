import { V2ContractError } from '../contracts/errors.js';
import { RuntimeRouteQuery } from '../runtime-contract/index.js';

export function buildRuntimeCaseUrl(input: {
  runtimeBaseUrl: string;
  path: string;
  variantId: string;
  themeId: string;
  routeQuery?: Record<string, string>;
}): string {
  const base = new URL(input.runtimeBaseUrl);
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password
  ) {
    throw new V2ContractError(
      'unsafe-input',
      'Runtime base URL must be an HTTP(S) origin without credentials.',
    );
  }

  const url = new URL(input.path, base);
  if (
    url.origin !== base.origin ||
    !url.pathname.startsWith('/prototype/') ||
    url.hash
  ) {
    throw new V2ContractError(
      'unsafe-input',
      'Runtime navigation must remain on the configured origin and /prototype/ path.',
    );
  }

  url.search = '';
  url.searchParams.set('variant', input.variantId);
  url.searchParams.set('theme', input.themeId);
  const parsedRouteQuery = RuntimeRouteQuery.safeParse(input.routeQuery ?? {});
  if (!parsedRouteQuery.success) {
    throw new V2ContractError(
      'unsafe-input',
      'Runtime route query contains an invalid key or value.',
    );
  }
  for (const key of Object.keys(parsedRouteQuery.data).sort()) {
    url.searchParams.set(key, parsedRouteQuery.data[key]!);
  }
  return url.toString();
}
