import { analyzePrototypePage } from './prototype-page.js';
import type { SourceAdapter } from '../../adapters/types.js';

export const vue3PrototypeSourceAdapter: SourceAdapter = {
  id: 'vue3-prototype',
  technology: 'vue3',
  analyze: analyzePrototypePage,
};
