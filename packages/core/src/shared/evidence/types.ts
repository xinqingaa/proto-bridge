import type { PageEvidence } from '../../types/index.js';

export type PageEvidencePatch = {
  page?: Partial<PageEvidence['page']> | undefined;
  text?: string[] | undefined;
  assets?: PageEvidence['assets'] | undefined;
  interactions?: PageEvidence['interactions'] | undefined;
  tokens?: NonNullable<PageEvidence['tokens']> | undefined;
  componentHints?: NonNullable<PageEvidence['componentHints']> | undefined;
  tabStates?: NonNullable<PageEvidence['tabStates']> | undefined;
  runtime?: PageEvidence['runtime'] | undefined;
  ocr?: PageEvidence['ocr'] | undefined;
  warnings?: string[] | undefined;
  provenance?: PageEvidence['provenance'] | undefined;
};
