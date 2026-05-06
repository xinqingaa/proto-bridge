import { analyzePrototypePage } from './vue3-prototype/prototype-page.js';
import type { SourceAdapter } from '../types.js';

export const vue3PrototypeSourceAdapter: SourceAdapter = {
  id: 'vue3-prototype',
  technology: 'vue3',
  analyze: analyzePrototypePage,
};
