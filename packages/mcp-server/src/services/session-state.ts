import type { GeneratedPage } from '../types.js';

export class PageStore {
  private readonly pages = new Map<string, GeneratedPage>();
  private latestPageId: string | undefined;

  add(page: GeneratedPage): void {
    this.pages.set(page.id, page);
    this.latestPageId = page.id;
  }

  get(pageId: string): GeneratedPage | undefined {
    return this.pages.get(pageId);
  }

  require(pageId: string): GeneratedPage {
    const page = this.get(pageId);
    if (!page) throw new Error(`Unknown pageId: ${pageId}`);
    return page;
  }

  latest(): GeneratedPage | undefined {
    return this.latestPageId ? this.pages.get(this.latestPageId) : undefined;
  }

  values(): GeneratedPage[] {
    return [...this.pages.values()];
  }
}
