import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import type {
  AssetEvidence,
  CapturePageSnapshotInput,
  CapturePageSnapshotResult,
  InteractionEvidence,
  PageSnapshot,
  PageSnapshotNode,
  SnapshotComputedStyle,
  SnapshotNodeRole,
  VisualSection,
  VisualTokenEvidence,
} from '../types/index.js';
import { writeJsonFile } from '../utils/path.js';

const DEFAULT_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 1 };

export async function capturePageSnapshot(input: CapturePageSnapshotInput): Promise<CapturePageSnapshotResult> {
  const viewport = input.viewport ?? DEFAULT_VIEWPORT;
  const saveArtifacts = input.saveArtifacts ?? true;
  const capturedAt = new Date().toISOString();
  const snapshotId = createSnapshotId(input.url, capturedAt);

  await mkdir(input.outDir, { recursive: true });

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
      deviceScaleFactor: viewport.deviceScaleFactor ?? DEFAULT_VIEWPORT.deviceScaleFactor,
    });
    await page.goto(input.url, { waitUntil: 'networkidle', timeout: 30_000 });

    const screenshotPath = saveArtifacts ? path.join(input.outDir, 'screenshot.png') : undefined;
    if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true });

    const extracted = await page.evaluate((args) => {
      const maxNodes = 600;
      const skippedTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK']);
      const nodes: PageSnapshotNode[] = [];
      const assets: AssetEvidence[] = [];
      const interactions: InteractionEvidence[] = [];
      const textIndex = new Map<string, string[]>();
      const tokenIndex = new Map<string, VisualTokenEvidence>();
      const cssVariables = collectCssVariables();
      let sequence = 0;
      let assetSequence = 0;
      let interactionSequence = 0;

      function bboxOf(rect: DOMRect): PageSnapshotNode['bbox'] {
        return {
          x: Number(rect.x.toFixed(2)),
          y: Number(rect.y.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          height: Number(rect.height.toFixed(2)),
        };
      }

      function directText(element: Element): string | undefined {
        const ariaLabel = element.getAttribute('aria-label')?.trim();
        const title = element.getAttribute('title')?.trim();
        const before = pseudoText(element, '::before');
        const after = pseudoText(element, '::after');
        const direct = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
          .filter(Boolean)
          .join(' ')
          .trim();
        const text = direct || before || after || ariaLabel || title;
        return text ? text.slice(0, 240) : undefined;
      }

      function pseudoText(element: Element, pseudo: '::before' | '::after'): string | undefined {
        const content = window.getComputedStyle(element, pseudo).content;
        if (!content || content === 'none' || content === 'normal') return undefined;
        return content.replace(/^['"]|['"]$/g, '').replace(/\s+/g, ' ').trim() || undefined;
      }

      function isVisible(element: Element, rect: DOMRect, style: CSSStyleDeclaration): boolean {
        if (skippedTags.has(element.tagName)) return false;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        if (rect.width <= 0 || rect.height <= 0) return false;
        return true;
      }

      function inferRole(element: Element, style: CSSStyleDeclaration, rect: DOMRect, text?: string): SnapshotNodeRole {
        const tag = element.tagName.toLowerCase();
        const role = element.getAttribute('role')?.toLowerCase();
        const className = typeof element.className === 'string' ? element.className.toLowerCase() : '';
        const id = element.id.toLowerCase();
        const marker = `${tag} ${role ?? ''} ${className} ${id}`;

        if (role === 'dialog' || marker.includes('modal') || marker.includes('popup') || marker.includes('sheet')) return 'modal';
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
        if (tag === 'img' || tag === 'picture') return 'image';
        if (tag === 'svg' || marker.includes('icon')) return 'icon';
        if (tag === 'button' || role === 'button') return 'button';
        if (tag === 'a') return 'button';
        if (marker.includes('tab')) return 'tab-bar';
        if (tag === 'ul' || tag === 'ol' || marker.includes('list')) return 'list';
        if (tag === 'li' || marker.includes('item')) return 'list-item';
        if (marker.includes('card')) return 'card';
        if (looksLikeCard(style, rect)) return 'card';
        if (style.position === 'fixed' || style.position === 'sticky') {
          if (rect.y <= 8 && rect.height <= 120) return 'app-bar';
          if (rect.y + rect.height >= window.innerHeight - 24) return 'bottom-bar';
        }
        if (tag === 'header' || marker.includes('app-bar') || marker.includes('navbar') || marker.includes('nav-bar')) return 'app-bar';
        if (tag === 'footer' || marker.includes('bottom')) return 'bottom-bar';
        if (tag === 'section' || tag === 'main' || marker.includes('section')) return 'section';
        if (element.children.length > 1 && rect.width >= window.innerWidth * 0.6 && rect.height >= 48) return 'section';
        if (text) return 'text';
        return 'unknown';
      }

      function looksLikeCard(style: CSSStyleDeclaration, rect: DOMRect): boolean {
        const hasRadius = parseFloat(style.borderRadius) >= 6;
        const hasShadow = Boolean(style.boxShadow && style.boxShadow !== 'none');
        const hasBackground = Boolean(style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)');
        const reasonableSize = rect.width >= 80 && rect.height >= 40 && rect.width < window.innerWidth;
        return reasonableSize && hasBackground && (hasRadius || hasShadow);
      }

      function cssVarRefs(element: Element): string[] {
        const inline = element.getAttribute('style') ?? '';
        const matches = inline.match(/var\((--[^),\s]+)/g) ?? [];
        const style = window.getComputedStyle(element);
        const matchedComputedVars = Object.entries(cssVariables)
          .filter(([, value]) => value && (
            value === style.color
            || value === style.backgroundColor
            || value === style.fontSize
            || value === style.borderRadius
          ))
          .map(([name]) => name);
        return [...new Set([
          ...matches.map((match) => match.replace(/^var\(/, '')),
          ...matchedComputedVars,
        ])];
      }

      function addToken(kind: VisualTokenEvidence['kind'], source: string, value: string, nodeId: string, cssVar?: string): void {
        if (!value || value === 'none' || value === 'normal' || value === 'rgba(0, 0, 0, 0)') return;
        const key = `${kind}:${source}:${cssVar ?? value}`;
        const existing = tokenIndex.get(key);
        if (existing) {
          if (!existing.usage.includes(nodeId)) existing.usage.push(nodeId);
          return;
        }
        tokenIndex.set(key, {
          kind,
          source,
          value,
          cssVar,
          usage: [nodeId],
          confidence: cssVar ? 'high' : 'medium',
        });
      }

      function collectCssVariables(): Record<string, string> {
        const result: Record<string, string> = {};
        const rootStyle = window.getComputedStyle(document.documentElement);
        for (let index = 0; index < rootStyle.length; index += 1) {
          const name = rootStyle.item(index);
          if (name.startsWith('--')) result[name] = rootStyle.getPropertyValue(name).trim();
        }
        for (const styleSheet of Array.from(document.styleSheets)) {
          let rules: CSSRuleList;
          try {
            rules = styleSheet.cssRules;
          } catch {
            continue;
          }
          for (const rule of Array.from(rules)) {
            if (!(rule instanceof CSSStyleRule)) continue;
            for (let index = 0; index < rule.style.length; index += 1) {
              const name = rule.style.item(index);
              if (name.startsWith('--') && !result[name]) result[name] = rule.style.getPropertyValue(name).trim();
            }
          }
        }
        return result;
      }

      function backgroundUrl(style: CSSStyleDeclaration): string | undefined {
        const match = style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
        return match?.[1];
      }

      function maybeAddAsset(element: Element, style: CSSStyleDeclaration, node: PageSnapshotNode): void {
        const tag = element.tagName.toLowerCase();
        const src = tag === 'img' ? (element as HTMLImageElement).currentSrc || (element as HTMLImageElement).src : undefined;
        const bg = backgroundUrl(style);
        if (src) {
          const asset: AssetEvidence = {
            id: `asset_${++assetSequence}`,
            kind: 'image',
            source: src,
            nodeId: node.id,
            bbox: node.bbox,
            evidence: [`img src on ${node.id}`],
          };
          assets.push(asset);
          node.assetRefs = [...(node.assetRefs ?? []), asset.id];
        }
        if (tag === 'svg') {
          const asset: AssetEvidence = {
            id: `asset_${++assetSequence}`,
            kind: 'svg',
            nodeId: node.id,
            bbox: node.bbox,
            evidence: [`inline svg on ${node.id}`],
          };
          assets.push(asset);
          node.assetRefs = [...(node.assetRefs ?? []), asset.id];
        }
        if (bg) {
          const asset: AssetEvidence = {
            id: `asset_${++assetSequence}`,
            kind: 'background',
            source: bg,
            nodeId: node.id,
            bbox: node.bbox,
            evidence: [`background-image on ${node.id}`],
          };
          assets.push(asset);
          node.assetRefs = [...(node.assetRefs ?? []), asset.id];
        }
      }

      function maybeAddInteraction(element: Element, style: CSSStyleDeclaration, node: PageSnapshotNode): void {
        const tag = element.tagName.toLowerCase();
        const role = element.getAttribute('role')?.toLowerCase();
        const clickable =
          tag === 'button'
          || tag === 'a'
          || role === 'button'
          || style.cursor === 'pointer'
          || Boolean(element.getAttribute('onclick'));
        const input = tag === 'input' || tag === 'textarea' || tag === 'select';
        if (!clickable && !input) return;
        interactions.push({
          id: `interaction_${++interactionSequence}`,
          kind: input ? 'input' : tag === 'a' ? 'link' : node.role === 'tab-bar' ? 'tab' : 'tap',
          nodeId: node.id,
          label: node.text,
          evidence: [`${input ? 'input' : 'clickable'} ${tag} ${node.id}`],
        });
      }

      function collectText(text: string | undefined, nodeId: string): void {
        if (!text) return;
        const normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return;
        const ids = textIndex.get(normalized) ?? [];
        ids.push(nodeId);
        textIndex.set(normalized, ids);
      }

      function serialize(element: Element, parentId?: string): string | undefined {
        if (nodes.length >= maxNodes) return undefined;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (!isVisible(element, rect, style)) return undefined;

        const id = `node_${++sequence}`;
        const text = directText(element);
        const role = inferRole(element, style, rect, text);
        const nodeStyle: SnapshotComputedStyle = {
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
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          borderRadius: style.borderRadius,
          border: style.border,
          boxShadow: style.boxShadow,
          overflow: style.overflow,
        };
        const node: PageSnapshotNode = {
          id,
          parentId,
          role,
          tag: element.tagName.toLowerCase(),
          text,
          bbox: bboxOf(rect),
          computedStyle: nodeStyle,
          cssVarRefs: cssVarRefs(element),
          children: [],
          evidence: [`${element.tagName.toLowerCase()} ${role}`],
        };

        nodes.push(node);
        collectText(text, id);
        maybeAddAsset(element, style, node);
        maybeAddInteraction(element, style, node);
        addToken('color', 'color', style.color, id, cssVarForValue(style.color));
        addToken('color', 'backgroundColor', style.backgroundColor, id, cssVarForValue(style.backgroundColor));
        addToken('typography', 'font', `${style.fontSize}/${style.lineHeight}/${style.fontWeight}/${style.fontFamily}`, id, cssVarForValue(style.fontSize));
        addToken('radius', 'borderRadius', style.borderRadius, id, cssVarForValue(style.borderRadius));
        addToken('border', 'border', style.border, id);
        addToken('shadow', 'boxShadow', style.boxShadow, id);
        addToken('spacing', 'padding', style.padding, id);
        addToken('spacing', 'margin', style.margin, id);

        for (const child of Array.from(element.children)) {
          const childId = serialize(child, id);
          if (childId) node.children.push(childId);
        }
        return id;
      }

      function cssVarForValue(value: string): string | undefined {
        return Object.entries(cssVariables).find(([, cssValue]) => cssValue && cssValue === value)?.[0];
      }

      serialize(document.body);

      const sectionRoles = new Set<SnapshotNodeRole>([
        'app-bar',
        'tab-bar',
        'section',
        'card',
        'list',
        'bottom-bar',
        'modal',
      ]);
      const visualSections: VisualSection[] = nodes
        .filter((node) => sectionRoles.has(node.role))
        .slice(0, 80)
        .map((node) => ({
          id: `section_${node.id}`,
          role: node.role,
          title: firstTextDescendant(node),
          bbox: node.bbox,
          nodeIds: [node.id, ...descendantIds(node).slice(0, 48)],
          evidence: node.evidence,
        }));

      function firstTextDescendant(node: PageSnapshotNode): string | undefined {
        if (node.text) return node.text;
        for (const childId of node.children) {
          const child = nodes.find((item) => item.id === childId);
          if (child?.text) return child.text;
        }
        return undefined;
      }

      function descendantIds(node: PageSnapshotNode): string[] {
        const result: string[] = [];
        for (const childId of node.children) {
          result.push(childId);
          const child = nodes.find((item) => item.id === childId);
          if (child) result.push(...descendantIds(child));
        }
        return result;
      }

      return {
        title: document.title || undefined,
        route: location.hash.startsWith('#/') ? location.hash.slice(1).split('?')[0] : location.pathname,
        text: [...textIndex.keys()].slice(0, 500),
        nodes,
        visualSections,
        tokens: [...tokenIndex.values()].slice(0, 400),
        cssVariables,
        assets,
        interactions,
        documentSize: {
          width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, args.viewport.width),
          height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, args.viewport.height),
        },
      };
    }, { viewport });

    const snapshot: PageSnapshot = {
      id: snapshotId,
      source: {
        kind: 'url',
        url: input.url,
        capturedAt,
        viewport,
      },
      ...(screenshotPath
        ? {
          screenshot: {
            path: screenshotPath,
            width: extracted.documentSize.width,
            height: extracted.documentSize.height,
          },
        }
        : {}),
      page: {
        title: extracted.title,
        route: extracted.route,
        text: extracted.text,
      },
      cssVariables: extracted.cssVariables,
      nodes: extracted.nodes,
      visualSections: extracted.visualSections,
      tokens: extracted.tokens,
      assets: extracted.assets,
      interactions: extracted.interactions,
      warnings: [],
    };

    const pageSnapshotPath = path.join(input.outDir, 'page-snapshot.json');
    await writeJsonFile(pageSnapshotPath, snapshot);

    return {
      snapshot,
      files: {
        pageSnapshot: pageSnapshotPath,
        ...(screenshotPath ? { screenshot: screenshotPath } : {}),
      },
    };
  } finally {
    await browser.close();
  }
}

function createSnapshotId(url: string, capturedAt: string): string {
  const slug = slugFromUrl(url);
  return `snapshot_${slug}_${Date.parse(capturedAt).toString(36)}`;
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
