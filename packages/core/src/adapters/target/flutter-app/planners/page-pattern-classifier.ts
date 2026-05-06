import type { PrototypePageAnalysis } from '../../../../types/index.js';

export type PagePattern =
  | 'detail'
  | 'dashboard'
  | 'list'
  | 'form'
  | 'trade-ticket'
  | 'quote-detail'
  | 'portfolio'
  | 'record-list'
  | 'settings'
  | 'auth'
  | 'onboarding'
  | 'wizard'
  | 'article'
  | 'empty-state'
  | 'unknown';

export type ClassifiedPagePattern = {
  pattern: PagePattern;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
};

export function classifyPagePattern(source: PrototypePageAnalysis): ClassifiedPagePattern {
  const facts = collectFacts(source);
  const candidates: Array<{ pattern: PagePattern; score: number; reasons: string[] }> = [
    scoreQuoteDetail(facts),
    scoreTradeTicket(facts),
    scoreForm(facts),
    scoreSettings(facts),
    scorePortfolio(facts),
    scoreRecordList(facts),
    scoreList(facts),
    scoreAuth(facts),
    scoreWizard(facts),
    scoreArticle(facts),
    scoreDetail(facts),
    scoreDashboard(facts),
  ];
  const best = candidates.sort((left, right) => right.score - left.score)[0];
  if (!best || best.score <= 0) return { pattern: 'unknown', confidence: 'low', reasons: ['未识别出稳定页面模式，使用通用页面规划。'] };
  return {
    pattern: best.pattern,
    confidence: best.score >= 7 ? 'high' : best.score >= 4 ? 'medium' : 'low',
    reasons: best.reasons,
  };
}

function collectFacts(source: PrototypePageAnalysis): PageFacts {
  const text = [source.screenId, source.name, source.label, source.title, source.route, source.module, source.moduleLabel]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const roles = source.sfc?.components.map((component) => component.role) ?? [];
  const stateCategories = source.sfc?.state.map((state) => state.category) ?? [];
  const stateNames = source.sfc?.state.map((state) => state.name.toLowerCase()) ?? [];
  const has = (pattern: RegExp): boolean => pattern.test(text) || stateNames.some((name) => pattern.test(name));
  return {
    text,
    roles,
    stateCategories,
    stateNames,
    hasChart: roles.includes('chart') || stateCategories.includes('chart-data'),
    hasTabs: roles.includes('tabs') || roles.includes('section-tabs'),
    hasBottomActions: Boolean(source.sfc?.fixedBottom) || roles.includes('bottom-actions'),
    hasRoutes: Boolean(source.sfc?.routes.length),
    hasLifecycle: Boolean(source.sfc?.lifecycle.length),
    hasFormState: has(/input|form|field|password|email|phone|amount|quantity|qty|price/),
    hasTradeTerms: has(/trade|order|buy|sell|option|quote|ticker|price|kline|holding|fund|etf|stock/),
    hasSettingsTerms: has(/setting|settings|preference|switch|toggle|notification|language|theme/),
    hasPortfolioTerms: has(/asset|portfolio|position|balance|holding|funds|account/),
    hasAuthTerms: has(/login|auth|password|otp|verify|security|onboard|kyc/),
    hasListTerms: has(/list|record|history|rows|table|search|filter/),
    hasWizardTerms: has(/step|wizard|next|previous|progress|onboard/),
    hasArticleTerms: has(/article|news|notice|message|detail|profile|objective/),
  };
}

function scoreQuoteDetail(facts: PageFacts) {
  const reasons: string[] = [];
  let score = 0;
  if (facts.hasChart) { score += 3; reasons.push('包含图表或指标数据。'); }
  if (facts.hasTabs) { score += 2; reasons.push('包含页签切换。'); }
  if (facts.hasTradeTerms) { score += 2; reasons.push('包含行情/交易相关字段。'); }
  if (facts.hasBottomActions) { score += 1; reasons.push('包含底部操作区。'); }
  return { pattern: 'quote-detail' as const, score, reasons };
}

function scoreTradeTicket(facts: PageFacts) {
  const reasons: string[] = [];
  let score = 0;
  if (/trade|order|buy|sell/.test(facts.text)) { score += 3; reasons.push('页面与交易/下单相关。'); }
  if (facts.hasFormState) { score += 2; reasons.push('包含表单输入或价格数量字段。'); }
  if (facts.hasBottomActions) { score += 1; reasons.push('包含底部提交操作。'); }
  return { pattern: 'trade-ticket' as const, score, reasons };
}

function scoreForm(facts: PageFacts) {
  const score = facts.hasFormState ? 4 : 0;
  return { pattern: 'form' as const, score, reasons: score ? ['包含表单输入或字段组。'] : [] };
}

function scoreSettings(facts: PageFacts) {
  const score = facts.hasSettingsTerms ? 5 : 0;
  return { pattern: 'settings' as const, score, reasons: score ? ['页面与设置项或偏好开关相关。'] : [] };
}

function scorePortfolio(facts: PageFacts) {
  const score = facts.hasPortfolioTerms && !facts.hasChart ? 4 : 0;
  return { pattern: 'portfolio' as const, score, reasons: score ? ['页面与资产、账户或持仓相关。'] : [] };
}

function scoreRecordList(facts: PageFacts) {
  const score = /record|history/.test(facts.text) || facts.stateNames.some((name) => /record|history/.test(name)) ? 4 : 0;
  return { pattern: 'record-list' as const, score, reasons: score ? ['页面包含记录或历史列表。'] : [] };
}

function scoreList(facts: PageFacts) {
  const score = facts.hasListTerms || facts.roles.includes('list') ? 3 : 0;
  return { pattern: 'list' as const, score, reasons: score ? ['页面包含列表或表格数据。'] : [] };
}

function scoreAuth(facts: PageFacts) {
  const score = facts.hasAuthTerms ? 4 : 0;
  return { pattern: 'auth' as const, score, reasons: score ? ['页面与登录、验证或安全流程相关。'] : [] };
}

function scoreWizard(facts: PageFacts) {
  const score = facts.hasWizardTerms ? 4 : 0;
  return { pattern: 'wizard' as const, score, reasons: score ? ['页面包含步骤流程。'] : [] };
}

function scoreArticle(facts: PageFacts) {
  const score = facts.hasArticleTerms && !facts.hasTabs && !facts.hasChart ? 3 : 0;
  return { pattern: 'article' as const, score, reasons: score ? ['页面偏内容说明或详情文本。'] : [] };
}

function scoreDetail(facts: PageFacts) {
  let score = /detail|profile|objective/.test(facts.text) ? 4 : 0;
  if (facts.hasTabs || facts.hasChart) score -= 2;
  return { pattern: 'detail' as const, score, reasons: score > 0 ? ['页面是详情类信息展示。'] : [] };
}

function scoreDashboard(facts: PageFacts) {
  const score = facts.roles.filter((role) => ['summary', 'list', 'chart'].includes(role)).length >= 2 ? 2 : 0;
  return { pattern: 'dashboard' as const, score, reasons: score ? ['页面包含多个摘要/列表/图表区块。'] : [] };
}

type PageFacts = {
  text: string;
  roles: string[];
  stateCategories: string[];
  stateNames: string[];
  hasChart: boolean;
  hasTabs: boolean;
  hasBottomActions: boolean;
  hasRoutes: boolean;
  hasLifecycle: boolean;
  hasFormState: boolean;
  hasTradeTerms: boolean;
  hasSettingsTerms: boolean;
  hasPortfolioTerms: boolean;
  hasAuthTerms: boolean;
  hasListTerms: boolean;
  hasWizardTerms: boolean;
  hasArticleTerms: boolean;
};
