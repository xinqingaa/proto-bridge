import type { Page } from 'playwright';
import { normalizeRuntimePageProtocolPayload } from '../../shared/protocols/runtime-page.js';
import type { RuntimePageProtocolPayload } from '../../shared/protocols/runtime-page.js';

export async function readRuntimePageProtocol(page: Page): Promise<RuntimePageProtocolPayload | undefined> {
  const payload = await page.evaluate(async () => {
    const scope = window as typeof window & {
      __PROTO_BRIDGE__?: {
        version?: string;
        capabilities?: {
          pageMetadata?: boolean;
          pageList?: boolean;
        };
        getPageMetadata?: (() => unknown | Promise<unknown>) | undefined;
        getPageList?: (() => unknown | Promise<unknown>) | undefined;
      } | undefined;
      __getPageMetadata?: (() => unknown | Promise<unknown>) | undefined;
      __getPageList?: (() => unknown | Promise<unknown>) | undefined;
    };

    const protoBridge = scope.__PROTO_BRIDGE__;
    const getPageMetadata = typeof protoBridge?.getPageMetadata === 'function'
      ? protoBridge.getPageMetadata.bind(protoBridge)
      : typeof scope.__getPageMetadata === 'function'
        ? scope.__getPageMetadata.bind(scope)
        : undefined;
    const getPageList = typeof protoBridge?.getPageList === 'function'
      ? protoBridge.getPageList.bind(protoBridge)
      : typeof scope.__getPageList === 'function'
        ? scope.__getPageList.bind(scope)
        : undefined;

    const warnings: string[] = [];
    let metadata: unknown;
    let pageList: unknown;

    if (getPageMetadata) {
      try {
        metadata = await Promise.resolve(getPageMetadata());
      } catch (error) {
        warnings.push(`getPageMetadata failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (getPageList) {
      try {
        pageList = await Promise.resolve(getPageList());
      } catch (error) {
        warnings.push(`getPageList failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      protocol: protoBridge ? 'proto-bridge' : (getPageMetadata || getPageList) ? 'legacy' : 'none',
      version: typeof protoBridge?.version === 'string' ? protoBridge.version : undefined,
      capabilities: {
        pageMetadata: Boolean(getPageMetadata),
        pageList: Boolean(getPageList),
      },
      metadata,
      pageList,
      warnings,
    };
  });

  const normalized = normalizeRuntimePageProtocolPayload(payload);
  if (normalized.protocol === 'none' && !normalized.capabilities.pageMetadata && !normalized.capabilities.pageList) {
    return undefined;
  }
  return normalized;
}
