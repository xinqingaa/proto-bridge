import type { Page } from "@playwright/test";
import type { PrototypeLifecycleDocument } from "@proto-bridge/core/v2";

/** UI-only scenarios must not mutate the sidecar used by real finalization. */
export async function isolateLifecycleDocument(page: Page) {
  let document: PrototypeLifecycleDocument | undefined;
  await page.route("**/__pb_v2/prototype-lifecycle", async (route) => {
    if (route.request().method() === "GET") {
      if (!document) {
        const response = await route.fetch();
        const { data } = await response.json();
        document = { ...data, revision: 0, records: {}, history: [] };
      }
      return route.fulfill({ json: { ok: true, data: document } });
    }
    if (route.request().method() === "PUT") {
      document = route.request().postDataJSON().document;
      return route.fulfill({ json: { ok: true, data: document } });
    }
    return route.continue();
  });
}
