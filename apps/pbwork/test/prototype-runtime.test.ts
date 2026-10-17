import { effectScope } from "vue";
import { expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { usePrototypeStorage } from "@/runtime/prototype/storage";
import { prototypeNavigation } from "@/runtime/prototype/navigation";
import { writeThemePackPreference } from "@/runtime/theme-pack-preference";

it("loads only a valid versioned model and supports explicit schema migration", () => {
  localStorage.clear();
  localStorage.setItem(
    "pbwork.prototype.demo.model",
    JSON.stringify({ schemaVersion: 1, value: { count: 2 } }),
  );
  const scope = effectScope();
  scope.run(() => {
    const options = {
      prototypeId: "demo",
      name: "model",
      schemaVersion: 2,
      defaults: () => ({ count: 0 }),
      validate: (v: unknown): v is { count: number } =>
        Boolean(
          v &&
          typeof v === "object" &&
          typeof (v as { count?: unknown }).count === "number",
        ),
    };
    expect(usePrototypeStorage(options).value).toEqual({ count: 0 });
    const model = usePrototypeStorage({
      ...options,
      migrate: (v, version) =>
        version === 1
          ? { count: (v as { count: number }).count + 1 }
          : undefined,
    });
    expect(model.value.count).toBe(3);
    model.value.count = 4;
    expect(
      JSON.parse(localStorage.getItem("pbwork.prototype.demo.model")!),
    ).toEqual({ schemaVersion: 2, value: { count: 4 } });
    const broken = usePrototypeStorage({
      ...options,
      storage: {
        getItem: () => "{bad",
        setItem: () => {
          throw Error("quota");
        },
        removeItem: () => {},
      },
    });
    broken.value.count = 8;
    expect(broken.value.count).toBe(8);
  });
  scope.stop();
});

it("preserves the full parent chain across replacement and embedded return, stamps the current theme", async () => {
  localStorage.clear();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/prototype/demo/:slug", component: { template: "<div />" } },
    ],
  });
  await router.push(
    "/prototype/demo/home?variant=filtered&shipment=sh-a&theme=default&mode=light",
  );
  let state: Record<string, any> = { position: 0 };
  const originalPush = router.push.bind(router),
    originalReplace = router.replace.bind(router);
  router.push = async (to) => {
    if (typeof to === "object")
      state = { position: state.position + 1, ...to.state };
    return originalPush(to);
  };
  router.replace = async (to) => {
    if (typeof to === "object")
      state = { position: state.position, ...to.state };
    return originalReplace(to);
  };
  const nav = () =>
    prototypeNavigation(router, router.currentRoute.value, "demo", {
      state: () => state,
      embedded: () => true,
      systemMode: () => "dark",
    });
  await nav().enter({ slug: "detail", query: { shipment: "sh-a" } });
  const parent = state.pbPrototype.parent;
  await nav().replace({ slug: "edit" });
  expect(state.pbPrototype.parent).toEqual(parent);
  await nav().enter({ slug: "confirm" });
  expect(state.pbPrototype.parent.parent).toEqual(parent);
  writeThemePackPreference("demo", { theme: "default", mode: "system" });
  await nav().back({ slug: "home" });
  expect(router.currentRoute.value.path).toBe("/prototype/demo/edit");
  expect(router.currentRoute.value.query.mode).toBe("dark");
  await nav().back({ slug: "home" });
  expect(router.currentRoute.value.query).toMatchObject({
    shipment: "sh-a",
    variant: "filtered",
    mode: "dark",
  });
  await nav().replace({ slug: "deep-link" });
  state = {
    position: 10,
    pbPrototype: { prototypeId: "other", parent: { url: "/other" } },
  };
  await nav().back({ slug: "home" });
  expect(router.currentRoute.value.path).toBe("/prototype/demo/home");
});

it("normalizes a cross-tab stack parent to the destination home", async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/prototype/demo/:slug", component: { template: "<div />" } },
    ],
  });
  await router.push("/prototype/demo/tasks");
  let state: Record<string, any> = {
    position: 1,
    pbPrototype: { prototypeId: "demo", tab: "tasks" },
  };
  const replace = router.replace.bind(router),
    push = router.push.bind(router);
  router.replace = async (to) => {
    if (typeof to === "object") state = { ...state, ...to.state };
    return replace(to);
  };
  router.push = async (to) => {
    if (typeof to === "object") state = { ...state, ...to.state };
    return push(to);
  };
  await prototypeNavigation(router, router.currentRoute.value, "demo", {
    state: () => state,
    embedded: () => true,
    systemMode: () => "light",
  }).enter({ slug: "settings" }, "account");
  expect(state.pbPrototype.parent.url).toContain("/prototype/demo/account");
});
