import { describe, expect, it } from 'vitest';
import {
  CONTRAST_THRESHOLDS,
  compositeOver,
  contrastRatio,
  parseThemeColor,
  relativeLuminance,
} from '../../../src/v2/theme/index.js';

const color = (text: string) => {
  const parsed = parseThemeColor(text);
  if (!parsed) throw new Error(`unparseable ${text}`);
  return parsed;
};

describe('parseThemeColor', () => {
  it('parses hex forms', () => {
    expect(parseThemeColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseThemeColor('#1F5FBF')).toEqual({ r: 0x1f, g: 0x5f, b: 0xbf, a: 1 });
    expect(parseThemeColor('#0008')?.a).toBeCloseTo(0x88 / 255, 5);
    expect(parseThemeColor('#00000080')?.a).toBeCloseTo(128 / 255, 5);
  });

  it('parses rgb()/rgba() with comma and space syntax', () => {
    expect(parseThemeColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(parseThemeColor('rgba(1, 2, 3, .5)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
    expect(parseThemeColor('rgb(1 2 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(parseThemeColor('rgb(255 0 0 / 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    expect(parseThemeColor('rgba(0 0 0 / 0.25)')?.a).toBe(0.25);
  });

  it('parses transparent and rejects invalid input', () => {
    expect(parseThemeColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    for (const bad of ['red', '#12', '#ggg', 'rgb(300,0,0)', 'rgb(1,2)', 'rgba(1,2,3,2)', 'rgb(1, 2, 3 / 0.5)', '']) {
      expect(parseThemeColor(bad), bad).toBeNull();
    }
  });
});

describe('contrastRatio', () => {
  it('black on white is 21', () => {
    expect(contrastRatio(color('#000'), color('#fff'))).toBeCloseTo(21, 6);
    expect(contrastRatio(color('#fff'), color('#000'))).toBeCloseTo(21, 6);
  });

  it('#777 on white is about 4.48', () => {
    expect(contrastRatio(color('#777'), color('#fff'))).toBeCloseTo(4.48, 2);
  });

  it('relative luminance bounds', () => {
    expect(relativeLuminance(color('#fff'))).toBeCloseTo(1, 10);
    expect(relativeLuminance(color('#000'))).toBe(0);
  });

  it('composites translucent foreground onto the background', () => {
    const half = contrastRatio(color('rgba(0,0,0,0.5)'), color('#fff'));
    const gray = contrastRatio({ r: 127.5, g: 127.5, b: 127.5, a: 1 }, color('#fff'));
    expect(half).toBeCloseTo(gray, 6);
  });

  it('composites a translucent background onto the backdrop', () => {
    const result = contrastRatio(color('#000'), color('rgba(255,255,255,0.5)'), color('#000'));
    const expected = contrastRatio(color('#000'), { r: 127.5, g: 127.5, b: 127.5, a: 1 });
    expect(result).toBeCloseTo(expected, 6);
  });

  it('composites a translucent backdrop onto white first; missing backdrop is white', () => {
    const viaBackdrop = contrastRatio(color('#000'), color('rgba(255,255,255,0.5)'), color('rgba(0,0,0,0.5)'));
    // backdrop -> 127.5 gray; background: 50% white over it
    const background = compositeOver(color('rgba(255,255,255,0.5)'), { r: 127.5, g: 127.5, b: 127.5, a: 1 });
    expect(viaBackdrop).toBeCloseTo(contrastRatio(color('#000'), background), 6);
    expect(contrastRatio(color('#000'), color('rgba(255,255,255,0.5)'))).toBeCloseTo(21, 6);
  });

  it('exposes the WCAG thresholds', () => {
    expect(CONTRAST_THRESHOLDS).toEqual({ text: 4.5, ui: 3 });
  });
});
