import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/pbwork/package.json'));
const { chromium } = require('@playwright/test');
const artwork = JSON.parse(await readFile(path.join(root,
  'apps/pbwork/src/design-system/components/_shared/glyph-artwork.json'), 'utf8'));
const output = path.join(root, 'apps/flutter_pb_app/assets/icons');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const [name, glyph] of Object.entries(artwork.paths)) {
    for (const ratio of [3]) {
      const folder = output;
      await mkdir(folder, { recursive: true });
      const png = await page.evaluate(async ({ artwork, glyph, ratio }) => {
        const source = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${artwork.viewBox}" fill="none" stroke="black" stroke-width="${artwork.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><path d="${glyph}"/></svg>`;
        const image = new Image();
        image.src = `data:image/svg+xml;base64,${btoa(source)}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 24 * ratio;
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png').split(',')[1];
      }, { artwork, glyph, ratio });
      await writeFile(path.join(folder, `${name}.png`), Buffer.from(png, 'base64'));
    }
  }
  process.stdout.write(`Exported ${Object.keys(artwork.paths).length} PBWork glyphs at 3x.\n`);
} finally {
  await browser.close();
}
