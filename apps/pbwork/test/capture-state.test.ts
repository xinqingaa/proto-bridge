import { webcrypto } from "node:crypto";
import { effectScope } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import {
  canonicalCaptureState,
  readCaptureState,
  useCaptureState,
} from "@/runtime/capture-state";
import {
  clearCaptureTheme,
  fixedCaptureTheme,
} from "@/runtime/capture-environment";
import {
  buildRuntimeCaptureManifest,
  installRuntimeCaptureProtocol,
} from "@/runtime/capture-protocol";
import {
  RUNTIME_CAPTURE_GLOBAL,
  RUNTIME_CAPTURE_PROTOCOL_VERSION,
} from "@proto-bridge/core/v2/runtime-contract";

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((cleanup) => cleanup());
  clearCaptureTheme();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

it("requires authored business and current Screen coverage and disposes scoped readers", () => {
  const scope = effectScope();
  cleanups.push(() => scope.stop());
  scope.run(() => useCaptureState("example", "business", () => ({ count: 1 })));
  expect(readCaptureState("example", "example.home")).toBeUndefined();
  scope.run(() =>
    useCaptureState("example", "example.home", () => ({ open: true })),
  );
  expect(readCaptureState("example", "example.home")).toBeDefined();
  scope.stop();
  expect(readCaptureState("example", "example.home")).toBeUndefined();
  expect(canonicalCaptureState({ b: 1, a: { d: 2, c: 3 } })).toBe(
    canonicalCaptureState({ a: { c: 3, d: 2 }, b: 1 }),
  );
});

it("opts out the whole mounted prototype when any local reader requires independent appearance state", () => {
  const shared = effectScope();
  const independent = effectScope();
  cleanups.push(
    () => shared.stop(),
    () => independent.stop(),
  );
  shared.run(() => {
    useCaptureState("example", "business", () => ({
      preference: "mechanical",
    }));
    useCaptureState("example", "example.home", () => ({}));
  });
  expect(readCaptureState("example", "example.home")).toBeDefined();
  independent.run(() =>
    useCaptureState(
      "example",
      "local.theme-selection",
      () => ({ selected: "mechanical" }),
      { appearancePolicy: "independent" },
    ),
  );
  expect(readCaptureState("example", "example.home")).toBeUndefined();
  independent.stop();
  expect(readCaptureState("example", "example.home")).toBeDefined();
});

it("switches only rendering, rejects stale/mutating state and restores the prior appearance", async () => {
  vi.stubGlobal("crypto", webcrypto);
  vi.spyOn(Date, "now").mockReturnValue(1_000);
  const manifest = buildRuntimeCaptureManifest("yike");
  const baseline = {
    packId: manifest.theme.packId,
    packDigest: manifest.theme.packDigest,
    theme: "mechanical",
    mode: "light",
  };
  const data = { count: 1, preference: "mechanical" };
  const scope = effectScope();
  scope.run(() => {
    useCaptureState("yike", "business", () => data);
    useCaptureState("yike", "yike.focus", () => ({ open: true }));
  });
  cleanups.push(() => scope.stop());
  let mutate = false;
  cleanups.push(
    installRuntimeCaptureProtocol({
      getContext: () => ({
        prototypeId: "yike",
        screenId: "yike.focus",
        variantId: "default",
        theme: fixedCaptureTheme("yike") ?? baseline,
      }),
      navigate: async () => {},
      waitForStable: async () => {
        if (mutate && fixedCaptureTheme("yike")?.theme === "sundial")
          data.count++;
      },
    }),
  );
  let requestId = 0;
  const request = async (payload: unknown) =>
    window[RUNTIME_CAPTURE_GLOBAL]!.request({
      protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
      requestId: `test-${++requestId}`,
      payload,
    }) as Promise<any>;
  const initial = await request({ kind: "capture-state" });
  expect(initial.ok).toBe(true);
  const changed = await request({
    kind: "set-render-theme",
    theme: { ...baseline, theme: "water", mode: "dark" },
    expectedStateDigest: initial.payload.stateDigest,
  });
  expect(changed.payload).toMatchObject({
    stateDigest: initial.payload.stateDigest,
    actual: { theme: { theme: "water", mode: "dark" } },
  });
  expect(data).toEqual({ count: 1, preference: "mechanical" });
  data.count++;
  expect(
    (
      await request({
        kind: "set-render-theme",
        theme: baseline,
        expectedStateDigest: initial.payload.stateDigest,
      })
    ).error.code,
  ).toBe("capture-state-changed");
  const fresh = await request({ kind: "capture-state" });
  mutate = true;
  const failure = await request({
    kind: "set-render-theme",
    theme: { ...baseline, theme: "sundial" },
    expectedStateDigest: fresh.payload.stateDigest,
  });
  expect(failure.error.code).toBe("capture-state-changed");
  expect(fixedCaptureTheme("yike")).toMatchObject({
    theme: "water",
    mode: "dark",
  });
});

it("rebuilds a Job manifest hint after a source revision, prototype pack or clock mismatch", async () => {
  const manifest = buildRuntimeCaptureManifest("yike");
  const describe = async (knownManifest: unknown) => {
    const dispose = installRuntimeCaptureProtocol({
      getContext: () => null,
      getManifestPrototypeId: () => "yike",
      navigate: async () => {},
      waitForStable: async () => {},
    });
    try {
      return (await window[RUNTIME_CAPTURE_GLOBAL]!.request({
        protocolVersion: RUNTIME_CAPTURE_PROTOCOL_VERSION,
        requestId: "describe-hint",
        payload: { kind: "describe", knownManifest },
      })) as any;
    } finally {
      dispose();
    }
  };
  expect((await describe(manifest)).payload.manifest).toEqual(manifest);
  for (const hint of [
    { ...manifest, sourceDigest: `sha256:${"0".repeat(64)}` },
    { ...manifest, theme: { ...manifest.theme, packId: "another-pack" } },
    {
      ...manifest,
      clock: { ...manifest.clock, now: "2020-01-01T00:00:00.000Z" },
    },
    {
      ...manifest,
      screens: manifest.screens.map((screen) => ({
        ...screen,
        prototypeId: "another-prototype",
      })),
    },
  ]) {
    const response = await describe({ ...hint, inputVersion: "stale-hint" });
    expect(response.ok).toBe(true);
    expect(response.payload.manifest.inputVersion).toBe(manifest.inputVersion);
    expect(response.payload.manifest.sourceDigest).toBe(manifest.sourceDigest);
  }
});
