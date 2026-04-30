import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type { CapturePrototypePageInput, CaptureResult, DomNodeSnapshot } from '../types/index.js';
import { writeJsonFile } from '../utils/path.js';

const DEFAULT_VIEWPORT = { width: 390, height: 844 };

export async function capturePrototypePage(input: CapturePrototypePageInput): Promise<CaptureResult> {
  const viewport = input.viewport ?? DEFAULT_VIEWPORT;
  const warnings: string[] = [];
  await mkdir(input.outDir, { recursive: true });

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport });
    await page.goto(input.url, { waitUntil: 'networkidle', timeout: 30_000 });

    const screenshotPath = path.join(input.outDir, 'screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const domTree = await page.evaluate(() => {
      const skippedTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

      function directText(element: Element): string | undefined {
        const text = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
          .filter(Boolean)
          .join(' ')
          .slice(0, 240);
        return text || undefined;
      }

      function serialize(element: Element, depth = 0): DomNodeSnapshot | undefined {
        if (depth > 8 || skippedTags.has(element.tagName)) return undefined;

        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const children = Array.from(element.children)
          .map((child) => serialize(child, depth + 1))
          .filter((child): child is DomNodeSnapshot => Boolean(child))
          .slice(0, 80);

        const className =
          typeof element.className === 'string' && element.className.trim()
            ? element.className.trim()
            : undefined;

        const snapshot: DomNodeSnapshot = {
          tag: element.tagName.toLowerCase(),
          id: element.id || undefined,
          className,
          text: directText(element),
          role: element.getAttribute('role') ?? undefined,
          bbox: {
            x: Number(rect.x.toFixed(2)),
            y: Number(rect.y.toFixed(2)),
            width: Number(rect.width.toFixed(2)),
            height: Number(rect.height.toFixed(2)),
          },
          computedStyle: {
            display: style.display,
            position: style.position,
            flexDirection: style.flexDirection,
            alignItems: style.alignItems,
            justifyContent: style.justifyContent,
            gap: style.gap,
            padding: style.padding,
            margin: style.margin,
            color: style.color,
            backgroundColor: style.backgroundColor,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            borderRadius: style.borderRadius,
            overflow: style.overflow,
          },
          children: children.length > 0 ? children : undefined,
        };

        return snapshot;
      }

      const root = serialize(document.body);
      return root ? [root] : [];
    });

    const domSnapshotPath = path.join(input.outDir, 'dom-snapshot.json');
    await writeJsonFile(domSnapshotPath, domTree);

    return {
      screenshotPath,
      domSnapshotPath,
      viewport,
      domTree,
      warnings,
    };
  } finally {
    await browser.close();
  }
}
