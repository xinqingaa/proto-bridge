import path from 'node:path';
import type { OcrScreenshotInput, OcrScreenshotResult, OcrTextBox } from '../types/index.js';
import { writeJsonFile } from '../utils/path.js';

export async function ocrScreenshot(input: OcrScreenshotInput): Promise<OcrScreenshotResult> {
  const externalText = input.externalText?.map((text) => text.trim()).filter(Boolean) ?? [];
  const externalBoxes = normalizeBoxes(input.externalBoxes);
  const hasExternal = externalText.length > 0 || externalBoxes.length > 0;
  const ocr = hasExternal
    ? {
      provider: 'external' as const,
      status: 'available' as const,
      text: externalText.length ? externalText : externalBoxes.map((box) => box.text),
      boxes: externalBoxes,
      warnings: [],
    }
    : {
      provider: 'none' as const,
      status: 'unavailable' as const,
      text: [],
      boxes: [],
      warnings: [
        'No OCR provider is configured in Phase 2. Provide externalText/externalBoxes to persist OCR evidence, or configure a provider in a later phase.',
        `Screenshot was not OCR-processed: ${input.screenshotPath}`,
      ],
    };

  const ocrResultPath = path.join(input.outDir, 'ocr-result.json');
  await writeJsonFile(ocrResultPath, ocr);
  return {
    ocr,
    files: {
      ocrResult: ocrResultPath,
    },
  };
}

function normalizeBoxes(boxes: OcrTextBox[] | undefined): OcrTextBox[] {
  if (!boxes) return [];
  return boxes
    .map((box) => ({
      text: box.text.trim(),
      ...(box.bbox ? { bbox: box.bbox } : {}),
      ...(typeof box.confidence === 'number' ? { confidence: box.confidence } : {}),
    }))
    .filter((box) => box.text.length > 0);
}
