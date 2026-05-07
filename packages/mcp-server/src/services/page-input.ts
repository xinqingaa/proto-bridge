import path from 'node:path';
import type { JsonObject, ProtoBridgeConfig, ResolvedConfig } from '../types.js';
import { readString } from '../utils/args.js';

export type ResolvedPageInput = {
  route?: string | undefined;
  vue?: string | undefined;
  url?: string | undefined;
};

export function resolvePageInput(args: JsonObject, config: ProtoBridgeConfig): ResolvedPageInput {
  const url = readString(args, 'url') ?? config.url;
  if (url) return { route: extractRouteFromUrl(url), url };
  const route = readString(args, 'route') ?? config.route;
  if (route) return { route: normalizeRoute(route) };
  const vue = readString(args, 'vue') ?? config.vue;
  if (vue) return { vue };
  throw new Error('Provide url, route, or vue.');
}

export function resolveOutputDir(args: JsonObject, config: ResolvedConfig, pageInput: ResolvedPageInput): string {
  const output = readString(args, 'output');
  if (output) return path.isAbsolute(output) ? output : path.resolve(config.configDir, output);
  const outputRoot = readString(args, 'outputRoot') ?? config.config.outputRoot ?? './output';
  const absoluteOutputRoot = path.isAbsolute(outputRoot) ? outputRoot : path.resolve(config.configDir, outputRoot);
  return path.join(absoluteOutputRoot, outputSlug(pageInput.route, pageInput.vue));
}

export function extractRouteFromUrl(urlInput: string): string {
  if (urlInput.startsWith('/')) return normalizeRoute(urlInput.split('?')[0] ?? urlInput);
  const parsed = new URL(urlInput);
  if (parsed.hash.startsWith('#/')) return normalizeRoute(parsed.hash.slice(1).split('?')[0] ?? parsed.hash.slice(1));
  return normalizeRoute(parsed.pathname);
}

export function normalizeRoute(route: string): string {
  const routeOnly = route.split('?')[0] ?? route;
  const normalized = routeOnly.startsWith('/') ? routeOnly : `/${routeOnly}`;
  return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

export function outputSlug(route: string | undefined, vue: string | undefined): string {
  const source = route ?? vue ?? 'migration';
  return source
    .replace(/\.vue$/i, '')
    .split(/[\\/]/)
    .filter(Boolean)
    .at(-1)
    ?.replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'migration';
}
