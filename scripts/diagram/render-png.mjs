import { chromium } from 'playwright';
import { protoBridgeStyle } from './styles/proto-bridge.mjs';

export async function renderPng(svg, outPath) {
  const { width, height, colors } = protoBridgeStyle;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          html, body { margin: 0; width: ${width}px; height: ${height}px; background: ${colors.page}; }
          svg { display: block; width: ${width}px; height: ${height}px; }
        </style>
      </head>
      <body>${svg}</body>
    </html>
  `);
  await page.screenshot({ path: outPath, type: 'png' });
  await browser.close();
}
