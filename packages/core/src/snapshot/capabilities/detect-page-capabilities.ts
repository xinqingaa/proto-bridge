import type { Page } from 'playwright';
import type { DetectedCapabilities } from '../../types/index.js';

export async function detectPageCapabilities(page: Page): Promise<DetectedCapabilities> {
  return page.evaluate(() => {
    const scope = window as typeof window & {
      __PROTO_BRIDGE__?: {
        capabilities?: {
          pageMetadata?: boolean;
          pageList?: boolean;
        };
        getPageMetadata?: (() => unknown) | undefined;
        getPageList?: (() => unknown) | undefined;
      } | undefined;
      __getPageMetadata?: (() => unknown) | undefined;
      __getPageList?: (() => unknown) | undefined;
    };

    const protoBridge = scope.__PROTO_BRIDGE__;
    const runtimeMetadata = Boolean(
      protoBridge?.capabilities?.pageMetadata
      || typeof protoBridge?.getPageMetadata === 'function'
      || typeof scope.__getPageMetadata === 'function',
    );
    const pageList = Boolean(
      protoBridge?.capabilities?.pageList
      || typeof protoBridge?.getPageList === 'function'
      || typeof scope.__getPageList === 'function',
    );
    const tabTraversal = Boolean(
      document.querySelector(
        '[role="tab"], [role="tablist"], [aria-selected], .tab, .tabs, .tab-bar, [data-tab], [data-tabs]',
      ),
    );
    const assetExtraction = Boolean(
      document.querySelector('img, picture, svg, canvas, [style*="background-image"]'),
    );
    const visibleText = (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim();
    const mediaCount = document.querySelectorAll('img, picture, svg, canvas').length;
    const warnings: string[] = [];

    if (protoBridge && typeof protoBridge !== 'object') {
      warnings.push('window.__PROTO_BRIDGE__ exists but is not an object.');
    }

    return {
      runtimeMetadata,
      pageList,
      tabTraversal,
      assetExtraction,
      needsOcr: visibleText.length < 24 && mediaCount > 0,
      warnings,
    };
  });
}
