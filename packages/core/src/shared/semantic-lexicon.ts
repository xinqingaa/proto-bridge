export type UiSemanticLexicon = {
  sectionClassTerms: string[];
  chartTerms: string[];
  listTerms: string[];
  sectionTerms: string[];
  summaryTerms: string[];
  bottomActionTerms: string[];
  dynamicQuantityTerms: string[];
  listHeadingTerms: string[];
  mockDataTerms: string[];
  navigationTerms: string[];
  chartDataTerms: string[];
  statusTerms: string[];
  timeBadgePattern?: string | undefined;
};

/**
 * Technology-neutral UI vocabulary used to interpret Vue/DOM evidence.
 *
 * Keep this list limited to common UI structure and programming terms. Product,
 * organization, and domain vocabulary must come from source/runtime evidence.
 */
export const genericUiLexicon: UiSemanticLexicon = {
  sectionClassTerms: [
    'section', 'card', 'panel', 'list', 'chart', 'tab', 'tabs', 'header', 'nav',
    'bottom-bar', 'footer', 'modal', 'popup', 'sheet', 'metric', 'history',
    'filter', 'search', 'sort',
  ],
  chartTerms: ['chart', 'donut', 'bar-chart', 'trend', 'indicator'],
  listTerms: ['list', 'row', 'rows', 'table', 'flow'],
  sectionTerms: ['section', 'card', 'panel', 'history', 'metric', 'metrics', 'info'],
  summaryTerms: ['summary', 'info'],
  bottomActionTerms: ['bottom-bar', 'footer-action', 'fixed-footer'],
  dynamicQuantityTerms: ['qty', 'quantity', 'count'],
  listHeadingTerms: ['records', 'history', 'list'],
  mockDataTerms: ['mock', 'data', 'list', 'rows', 'history', 'metrics', 'flow'],
  navigationTerms: ['route', 'query', 'anchor'],
  chartDataTerms: ['chart', 'donut', 'bar', 'path', 'data', 'limit', 'min', 'max'],
  statusTerms: [],
};
