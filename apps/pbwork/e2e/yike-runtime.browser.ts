import { test, expect, type Page } from "@playwright/test";
test.use({
  viewport: { width: 390, height: 844 },
  timezoneId: "Asia/Shanghai",
});
async function runtimeRequest(page: Page, payload: unknown): Promise<any> {
  await page.waitForFunction(() =>
    Boolean((window as any).__PROTO_BRIDGE_CAPTURE_V2__),
  );
  return page.evaluate(
    async (payload) =>
      (window as any).__PROTO_BRIDGE_CAPTURE_V2__.request({
        protocolVersion: 3,
        requestId: `yike-review-${crypto.randomUUID()}`,
        payload,
      }),
    payload,
  );
}

async function prepareCurrent(
  page: Page,
  screenId: string,
  variantId = "default",
) {
  const described = await runtimeRequest(page, { kind: "describe" });
  const manifest = described.payload.manifest;
  const theme = {
    packId: manifest.theme.packId,
    packDigest: manifest.theme.packDigest,
    theme: "mechanical",
    mode: "light",
  };
  const result = await runtimeRequest(page, {
    kind: "prepare",
    expected: { prototypeId: "yike", screenId, variantId, theme },
  });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return { manifest, theme };
}
test("declared states prepare, expose semantic snapshots and reset", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date("2026-10-19T12:00:00+08:00"));
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const { manifest, theme } = await prepareCurrent(page, "yike.focus");
  for (const screen of manifest.screens) {
    for (const variant of screen.variants) {
      const query = new URLSearchParams({
        variant: variant.variantId,
        theme: "mechanical",
        mode: "light",
        ...variant.routeQuery,
      });
      await page.goto(`/prototype/yike/${screen.screenSlug}?${query}`);
      await prepareCurrent(page, screen.screenId, variant.variantId);
      const expected = {
        prototypeId: "yike",
        screenId: screen.screenId,
        variantId: variant.variantId,
        theme,
        viewport: { width: 390, height: 844 },
      };
      const ready = await runtimeRequest(page, {
        kind: "readiness",
        expected,
        requiredFragments: variant.requiredFragments,
      });
      expect(
        ready.ok,
        `${screen.screenId}/${variant.variantId}: ${JSON.stringify(ready)}`,
      ).toBe(true);
      const snapshot = await runtimeRequest(page, {
        kind: "semantic-snapshot",
        fragments: variant.requiredFragments,
      });
      expect(
        snapshot.ok,
        `${screen.screenId}/${variant.variantId}: ${JSON.stringify(snapshot)}`,
      ).toBe(true);
      const reset = await runtimeRequest(page, { kind: "reset" });
      expect(
        reset.ok,
        `${screen.screenId}/${variant.variantId}: ${JSON.stringify(reset)}`,
      ).toBe(true);
    }
  }
});
test("declared interaction scenarios verify their checkpoints", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-10-19T12:00:00+08:00") });
  await page.goto(
    "/prototype/yike/focus?variant=default&theme=mechanical&mode=light",
  );
  const { manifest } = await prepareCurrent(page, "yike.focus");
  for (const screen of manifest.screens) {
    for (const scenario of screen.scenarios) {
      const variant = screen.variants.find(
        (v: any) => v.variantId === scenario.initialVariantId,
      );
      const query = new URLSearchParams({
        variant: scenario.initialVariantId,
        theme: "mechanical",
        mode: "light",
        ...variant.routeQuery,
      });
      await page.goto(`/prototype/yike/${screen.screenSlug}?${query}`);
      await prepareCurrent(page, screen.screenId, scenario.initialVariantId);
      for (const actionId of scenario.actionIds) {
        const action = await runtimeRequest(page, {
          kind: "execute-action",
          scenarioId: scenario.scenarioId,
          actionId,
        });
        expect(
          action.ok,
          `${scenario.scenarioId}/${actionId}: ${JSON.stringify(action)}`,
        ).toBe(true);
      }
      for (const checkpoint of scenario.checkpoints) {
        const verified = await runtimeRequest(page, {
          kind: "verify-checkpoint",
          scenarioId: scenario.scenarioId,
          checkpointId: checkpoint.checkpointId,
        });
        expect(
          verified.ok,
          `${scenario.scenarioId}: ${JSON.stringify(verified)}`,
        ).toBe(true);
      }
    }
  }
});
