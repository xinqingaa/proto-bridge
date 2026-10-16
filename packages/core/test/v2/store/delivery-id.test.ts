import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isSafeDeliveryId,
  resolveDeliveryDir,
} from '../../../src/v2/store/deliver-receipt.js';

describe('Delivery ID validation', () => {
  const root = path.resolve('/tmp/pb-delivery-root');

  it.each([
    'operation-0123456789abcdef01234567',
    '2026-10-16T13-48-18+08-00',
    '2026-10-16T05-48-18-05-00',
  ])('accepts generated Delivery ID %s', (deliveryId) => {
    expect(isSafeDeliveryId(deliveryId)).toBe(true);
    expect(resolveDeliveryDir(root, deliveryId)).toBe(path.join(root, deliveryId));
  });

  it.each([
    '',
    '.',
    '..',
    '.tmp-operation-abc',
    '../store',
    'a/b',
    'a\\b',
    'bad id',
    '\u0000',
    '-leading-dash',
    'x'.repeat(129),
  ])('rejects unsafe Delivery ID %j', (deliveryId) => {
    expect(isSafeDeliveryId(deliveryId)).toBe(false);
    expect(() => resolveDeliveryDir(root, deliveryId)).toThrow(
      /not a safe single directory name/,
    );
  });
});
