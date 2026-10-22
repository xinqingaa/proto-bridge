import { afterEach, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import {
  clearCaptureTheme,
  fixedCaptureTheme,
  pinCaptureTheme,
} from "@/runtime/capture-environment";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
import {
  readThemePackPreference,
  writeThemePackPreference,
} from "@/runtime/theme-pack-preference";

afterEach(() => {
  clearCaptureTheme();
  localStorage.clear();
});

it("pins Capture rendering/navigation without swallowing reset preference writes or changing normal browsing", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/prototype/demo/:slug", component: { template: "<div />" } },
    ],
  });
  await router.push("/prototype/demo/settings?theme=water&mode=dark");
  pinCaptureTheme("demo", {
    packId: "demo",
    packDigest: `sha1:${"a".repeat(40)}`,
    theme: "water",
    mode: "dark",
  });
  writeThemePackPreference("demo", { theme: "mechanical", mode: "system" });
  const nav = () =>
    prototypeNavigation(router, router.currentRoute.value, "demo", {
      state: () => ({}),
      embedded: () => false,
      systemMode: () => "light",
    });
  expect(nav().path({ slug: "focus" }).query).toMatchObject({
    theme: "water",
    mode: "dark",
  });
  expect(readThemePackPreference("demo")).toEqual({
    theme: "mechanical",
    mode: "system",
  });
  expect(fixedCaptureTheme("another-prototype")).toBeNull();
  clearCaptureTheme();
  expect(nav().path({ slug: "focus" }).query).toMatchObject({
    theme: "mechanical",
    mode: "light",
  });
});
